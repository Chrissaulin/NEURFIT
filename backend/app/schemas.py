from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class ItemOut(BaseModel):
    id: int
    image_url: str
    thumb_url: str
    slot: str
    article_type: str
    base_colour: str
    usage: str
    is_label_corrected: bool
    created_at: str


class TopKPrediction(BaseModel):
    label: str
    confidence: float


class HeadPrediction(BaseModel):
    label: str
    confidence: float
    top_k: list[TopKPrediction]


class AnalyzeOut(BaseModel):
    temp_id: str
    image_url: str
    slot: str | None
    predictions: dict[str, HeadPrediction]
    low_confidence_fields: list[str]
    supported: bool
    model_version: str
    inference_ms: int
    expires_in_s: int = 86400


class ItemCreate(BaseModel):
    temp_id: str = Field(pattern=r"^[a-f0-9]{32}$")
    article_type: str
    base_colour: str
    usage: str


class SeedDemoOut(BaseModel):
    inserted_count: int
    counts_by_slot: dict[str, int]


class ItemListOut(BaseModel):
    items: list[ItemOut]
    total: int
    limit: int
    offset: int
    counts_by_slot: dict[str, int]


class RecommendRequest(BaseModel):
    anchor_item_id: int
    usage: str | None = None
    top_k: int = Field(default=5, ge=1, le=5)
    strict_usage: bool = False
    include_accessory: bool = False


class OutfitSlotOut(BaseModel):
    slot: str
    is_anchor: bool
    item: ItemOut


class RecommendationOut(BaseModel):
    rank: int
    score: float
    score_percent: int
    score_band: str
    items: list[OutfitSlotOut]


class RecommendMeta(BaseModel):
    n_candidates: int
    scorer_backend: str
    scorer_version: str
    inference_ms: int
    warnings: list[str] = Field(default_factory=list)


class RecommendOut(BaseModel):
    anchor: ItemOut
    usage_filter: str | None
    recommendations: list[RecommendationOut]
    meta: RecommendMeta


class HealthOut(BaseModel):
    status: str
    models_loaded: bool
    tagger_version: str | None = None
    scorer_version: str | None = None
    scorer_backend: str
    db: str
    uptime_s: int


class SlotMeta(BaseModel):
    key: str
    display: str


class ArticleMeta(BaseModel):
    key: str
    display: str
    slot: str | None


class ColourMeta(BaseModel):
    key: str
    display: str
    hex: str


class UsageMeta(BaseModel):
    key: str
    display: str


class LabelsMetaOut(BaseModel):
    labels_version: str
    confidence_threshold: float
    max_upload_mb: int
    slots: list[SlotMeta]
    article_types: list[ArticleMeta]
    base_colours: list[ColourMeta]
    usages: list[UsageMeta]
    usage_compat: dict[str, list[str]]


class ErrorBody(BaseModel):
    code: str
    message: str
    details: dict[str, Any] = Field(default_factory=dict)


class ErrorEnvelope(BaseModel):
    error: ErrorBody


SlotName = Literal["top", "bottom", "shoes", "accessory"]
