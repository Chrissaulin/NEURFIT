from __future__ import annotations

from fastapi import APIRouter, Request

from ...schemas import (
    ArticleMeta,
    ColourMeta,
    LabelsMetaOut,
    SlotMeta,
    UsageMeta,
)

router = APIRouter(tags=["meta"])


@router.get("/meta/labels", response_model=LabelsMetaOut)
def labels_meta(request: Request) -> LabelsMetaOut:
    labels = request.app.state.labels
    settings = request.app.state.settings
    return LabelsMetaOut(
        labels_version=labels.version,
        confidence_threshold=settings.confidence_threshold,
        max_upload_mb=settings.max_upload_mb,
        slots=[SlotMeta(key=entry["key"], display=entry["display"]) for entry in labels.slots],
        article_types=[
            ArticleMeta(key=entry["key"], display=entry["display"], slot=entry.get("slot"))
            for entry in labels.article_types
        ],
        base_colours=[
            ColourMeta(key=entry["key"], display=entry["display"], hex=entry["hex"])
            for entry in labels.base_colours
        ],
        usages=[UsageMeta(key=entry["key"], display=entry["display"]) for entry in labels.usages],
        usage_compat=labels.usage_compat,
    )
