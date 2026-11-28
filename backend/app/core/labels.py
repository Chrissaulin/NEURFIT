from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path

from .errors import ApiError


@dataclass(frozen=True)
class LabelStore:
    version: str
    article_types: list[dict]
    base_colours: list[dict]
    usages: list[dict]
    slots: list[dict]
    usage_compat: dict[str, list[str]]
    colour_tone: dict[str, str]
    neutral_colours: set[str]
    article_keys: list[str] = field(init=False)
    colour_keys: list[str] = field(init=False)
    usage_keys: list[str] = field(init=False)
    slot_keys: list[str] = field(init=False)
    article_to_slot: dict[str, str | None] = field(init=False)

    def __post_init__(self) -> None:
        article_keys = [entry["key"] for entry in self.article_types]
        colour_keys = [entry["key"] for entry in self.base_colours]
        usage_keys = [entry["key"] for entry in self.usages]
        slot_keys = [entry["key"] for entry in self.slots]
        object.__setattr__(self, "article_keys", article_keys)
        object.__setattr__(self, "colour_keys", colour_keys)
        object.__setattr__(self, "usage_keys", usage_keys)
        object.__setattr__(self, "slot_keys", slot_keys)
        object.__setattr__(
            self,
            "article_to_slot",
            {entry["key"]: entry.get("slot") for entry in self.article_types},
        )

    @classmethod
    def load(cls, path: Path) -> "LabelStore":
        if not path.exists():
            raise FileNotFoundError(f"labels.json not found: {path}")
        data = json.loads(path.read_text(encoding="utf-8"))
        return cls(
            version=data["version"],
            article_types=data["article_type"],
            base_colours=data["base_colour"],
            usages=data["usage"],
            slots=data["slots"],
            usage_compat=data["usage_compat"],
            colour_tone=data["colour_tone"],
            neutral_colours=set(data.get("neutral_colours", [])),
        )

    def validate_labels(self, article_type: str, base_colour: str, usage: str) -> None:
        fields: list[dict[str, str]] = []
        if article_type not in self.article_to_slot:
            fields.append({"field": "article_type", "message": "Nilai tidak dikenal."})
        if base_colour not in self.colour_keys:
            fields.append({"field": "base_colour", "message": "Nilai tidak dikenal."})
        if usage not in self.usage_keys:
            fields.append({"field": "usage", "message": "Nilai tidak dikenal."})
        if fields:
            raise ApiError(422, "INVALID_LABEL", "Label tidak valid.", {"fields": fields})
        if self.article_to_slot[article_type] is None:
            raise ApiError(
                422,
                "UNSUPPORTED_ARTICLE_TYPE",
                "Jenis pakaian ini belum didukung.",
                {"fields": [{"field": "article_type", "message": "Pilih jenis lain."}]},
            )

    def slot_for(self, article_type: str) -> str:
        slot = self.article_to_slot.get(article_type)
        if slot is None:
            raise ApiError(422, "UNSUPPORTED_ARTICLE_TYPE", "Jenis pakaian ini belum didukung.")
        return slot

    def usage_compatible(self, item_usage: str, requested: str | None, strict: bool) -> bool:
        if requested is None:
            return True
        if strict:
            return item_usage == requested
        return item_usage in self.usage_compat.get(requested, [requested])
