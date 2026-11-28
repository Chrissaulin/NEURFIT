from __future__ import annotations

from fastapi import APIRouter, Depends, File, Query, Request, Response, UploadFile
from sqlalchemy.orm import Session

from ...core.errors import model_not_ready
from ...db import get_session
from ...schemas import (
    AnalyzeOut,
    ItemCreate,
    ItemListOut,
    ItemOut,
    SeedDemoOut,
)
from ...services.item_service import ItemService

router = APIRouter(tags=["items"])


def get_service(request: Request, session: Session = Depends(get_session)) -> ItemService:
    return ItemService(
        session,
        request.app.state.settings,
        request.app.state.labels,
        request.app.state.ml,
        request.app.state.images,
    )


@router.post("/items/analyze", response_model=AnalyzeOut)
def analyze(
    request: Request,
    file: UploadFile = File(...),
    service: ItemService = Depends(get_service),
) -> AnalyzeOut:
    if not request.app.state.ml.ready:
        raise model_not_ready()
    data = file.file.read()
    result = service.analyze(data, file.content_type)
    return AnalyzeOut(**result)


@router.post("/items", response_model=ItemOut, status_code=201)
def save_item(payload: ItemCreate, service: ItemService = Depends(get_service)) -> ItemOut:
    return service.save_item(payload)


@router.post("/items/seed-demo", response_model=SeedDemoOut, status_code=201)
def seed_demo(service: ItemService = Depends(get_service)) -> SeedDemoOut:
    return SeedDemoOut(**service.seed_demo())


@router.get("/items", response_model=ItemListOut)
def list_items(
    slot: str | None = Query(default=None),
    article_type: str | None = Query(default=None),
    base_colour: str | None = Query(default=None),
    usage: str | None = Query(default=None),
    limit: int = Query(default=60, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    service: ItemService = Depends(get_service),
) -> ItemListOut:
    return ItemListOut(
        **service.list_items(
            slot=slot,
            article_type=article_type,
            base_colour=base_colour,
            usage=usage,
            limit=limit,
            offset=offset,
        )
    )


@router.delete("/items/{item_id}", status_code=204)
def delete_item(item_id: int, service: ItemService = Depends(get_service)) -> Response:
    service.delete(item_id)
    return Response(status_code=204)
