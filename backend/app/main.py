from __future__ import annotations

import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from .api.v1 import health, items, meta, outfits
from .config import Settings, settings as default_settings
from .core.errors import ApiError
from .core.labels import LabelStore
from .db import init_db, make_engine, make_session_factory
from .services.image_service import ImageService
from .services.ml_service import MLService
from .scoring.mlp import MLPScorer
from .scoring.rules import RuleBasedScorer

logger = logging.getLogger(__name__)


def create_app(app_settings: Settings | None = None) -> FastAPI:
    app_settings = app_settings or default_settings
    engine = make_engine(app_settings.database_url)
    session_factory = make_session_factory(engine)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        init_db(engine)
        labels = LabelStore.load(app_settings.model_path / "labels.json")
        images = ImageService(app_settings)
        ml = MLService(app_settings, labels)
        ml.load()
        app.state.labels = labels
        app.state.images = images
        app.state.ml = ml
        app.state.started_at = time.time()
        backend = app_settings.scorer_backend.lower()
        if backend == "rules":
            app.state.scorer = RuleBasedScorer(labels)
        elif ml.ready and ml.scorer is not None and ml.scorer_meta:
            app.state.scorer = MLPScorer(ml.scorer, ml.scorer_meta, labels, ml.model_version)
        else:
            app.state.scorer = None
        yield

    app = FastAPI(
        title="NEURFIT Smart Wardrobe API",
        version="1.0.0",
        lifespan=lifespan,
    )
    app.state.settings = app_settings
    app.state.session_factory = session_factory
    app.state.scorer = None

    app.add_middleware(
        CORSMiddleware,
        allow_origins=app_settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(ApiError)
    async def api_error_handler(_: Request, exc: ApiError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": {"code": exc.code, "message": exc.message, "details": exc.details}},
        )

    @app.exception_handler(RequestValidationError)
    async def validation_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
        fields = [
            {
                "field": ".".join(str(part) for part in error.get("loc", [])),
                "message": error.get("msg", "Nilai tidak valid."),
            }
            for error in exc.errors()
        ]
        return JSONResponse(
            status_code=422,
            content={
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "Data permintaan tidak valid.",
                    "details": {"fields": fields},
                }
            },
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_error_handler(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        code = "NOT_FOUND" if exc.status_code == 404 else "HTTP_ERROR"
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": {"code": code, "message": str(exc.detail), "details": {}}},
        )

    @app.exception_handler(Exception)
    async def unexpected_handler(_: Request, exc: Exception) -> JSONResponse:
        logger.exception("unhandled error", exc_info=exc)
        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "Terjadi kesalahan pada server.",
                    "details": {},
                }
            },
        )

    for router_module in (health, meta, items, outfits):
        app.include_router(router_module.router, prefix="/api/v1")

    for name in ("items", "thumbs", "tmp"):
        (app_settings.upload_path / name).mkdir(parents=True, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=app_settings.upload_path), name="uploads")
    return app


app = create_app()
