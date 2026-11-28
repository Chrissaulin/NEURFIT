from __future__ import annotations

import time

from fastapi import APIRouter, Depends, Request
from sqlalchemy import text
from sqlalchemy.orm import Session

from ...db import get_session
from ...schemas import HealthOut

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthOut)
def health(request: Request, session: Session = Depends(get_session)) -> HealthOut:
    db_status = "ok"
    try:
        session.execute(text("SELECT 1"))
    except Exception:  # noqa: BLE001
        db_status = "error"
    ml = request.app.state.ml
    return HealthOut(
        status="ok" if ml.ready else "loading",
        models_loaded=bool(ml.ready),
        tagger_version=ml.model_version if ml.ready else None,
        scorer_version=ml.scorer_version if ml.ready else None,
        scorer_backend=request.app.state.settings.scorer_backend,
        db=db_status,
        uptime_s=int(time.time() - request.app.state.started_at),
    )
