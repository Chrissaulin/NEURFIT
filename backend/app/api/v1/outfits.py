from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from ...core.errors import model_not_ready
from ...db import get_session
from ...schemas import RecommendOut, RecommendRequest
from ...services.item_service import ItemService
from ...services.outfit_service import OutfitService

router = APIRouter(tags=["outfits"])


def get_service(request: Request, session: Session = Depends(get_session)) -> OutfitService:
    scorer = request.app.state.scorer
    if scorer is None:
        raise model_not_ready()
    item_service = ItemService(
        session,
        request.app.state.settings,
        request.app.state.labels,
        request.app.state.ml,
        request.app.state.images,
    )
    return OutfitService(
        session,
        request.app.state.labels,
        scorer,
        item_service,
        request.app.state.settings.max_candidates,
    )


@router.post("/outfits/recommend", response_model=RecommendOut)
def recommend(payload: RecommendRequest, service: OutfitService = Depends(get_service)) -> RecommendOut:
    result = service.recommend(
        anchor_item_id=payload.anchor_item_id,
        usage=payload.usage,
        top_k=payload.top_k,
        strict_usage=payload.strict_usage,
        include_accessory=payload.include_accessory,
    )
    return RecommendOut(**result)
