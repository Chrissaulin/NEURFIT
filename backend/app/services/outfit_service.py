from __future__ import annotations

import hashlib
import itertools
import random
import time
from collections import Counter
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..core.errors import ApiError
from ..core.labels import LabelStore
from ..orm import Item
from ..scoring.base import OutfitScorer, ScoredItem
from ..services.item_service import CORE_SLOTS, ItemService, blob_to_emb

CORE = ["top", "bottom", "shoes"]


@dataclass
class Candidate:
    items: dict[str, Item]
    scored: list[ScoredItem | None]
    score: float = 0.0


class OutfitService:
    def __init__(
        self,
        session: Session,
        labels: LabelStore,
        scorer: OutfitScorer,
        item_service: ItemService,
        max_candidates: int,
    ) -> None:
        self.session = session
        self.labels = labels
        self.scorer = scorer
        self.item_service = item_service
        self.max_candidates = max_candidates

    def _scored_item(self, item: Item) -> ScoredItem:
        return ScoredItem(
            id=item.id,
            slot=item.slot,
            article_type=item.article_type,
            base_colour=item.base_colour,
            usage=item.usage,
            embedding=blob_to_emb(item.embedding, item.embedding_dim),
        )

    def _seed(self, anchor_id: int, usage: str | None, strict: bool, include_accessory: bool) -> int:
        raw = f"{anchor_id}:{usage}:{strict}:{include_accessory}".encode()
        return int.from_bytes(hashlib.sha256(raw).digest()[:8], "big")

    def _combinations(self, pools: dict[str, list[Item]], needed: list[str], seed: int):
        sizes = [len(pools[slot]) for slot in needed]
        total = 1
        for size in sizes:
            total *= max(1, size)
        if total <= self.max_candidates:
            yield from itertools.product(*(pools[slot] for slot in needed))
            return
        rng = random.Random(seed)
        seen: set[tuple[int, ...]] = set()
        attempts = 0
        while len(seen) < self.max_candidates and attempts < self.max_candidates * 20:
            attempts += 1
            picked = tuple(rng.randrange(size) for size in sizes)
            if picked in seen:
                continue
            seen.add(picked)
            yield tuple(pools[slot][index] for slot, index in zip(needed, picked))

    def _assemble(self, anchor: Item, combo: tuple[Item, ...], needed: list[str], accessory: Item | None = None) -> Candidate:
        mapping: dict[str, Item] = {slot: item for slot, item in zip(needed, combo)}
        mapping[anchor.slot] = anchor
        if accessory is not None:
            mapping["accessory"] = accessory
        sequence = [mapping.get(slot) for slot in CORE_SLOTS]
        scored = [self._scored_item(item) if item is not None else None for item in sequence]
        return Candidate(items=mapping, scored=scored)

    def recommend(
        self,
        *,
        anchor_item_id: int,
        usage: str | None,
        top_k: int,
        strict_usage: bool,
        include_accessory: bool,
    ) -> dict:
        started = time.perf_counter()
        anchor = self.session.get(Item, anchor_item_id)
        if anchor is None or anchor.user_id != 1:
            raise ApiError(404, "ANCHOR_NOT_FOUND", "Item anchor tidak ditemukan.")
        if anchor.slot not in CORE:
            raise ApiError(
                422,
                "ANCHOR_SLOT_UNSUPPORTED",
                "Aksesoris belum bisa menjadi item utama.",
                {"slot": anchor.slot},
            )
        if usage is not None and usage not in self.labels.usage_keys:
            raise ApiError(422, "INVALID_LABEL", "Filter acara tidak valid.")

        all_items = self.session.scalars(select(Item).where(Item.user_id == 1)).all()
        closet: dict[str, list[Item]] = {slot: [] for slot in CORE_SLOTS}
        for item in all_items:
            closet.setdefault(item.slot, []).append(item)

        needed = [slot for slot in CORE if slot != anchor.slot]
        missing = [slot for slot in needed if not closet.get(slot)]
        if missing:
            raise ApiError(
                422,
                "INSUFFICIENT_ITEMS",
                "Lemari belum lengkap untuk membuat kombinasi.",
                {"missing_slots": missing},
            )
        pools = {
            slot: [
                item
                for item in closet[slot]
                if self.labels.usage_compatible(item.usage, usage, strict_usage)
            ]
            for slot in needed
        }
        empty = [slot for slot in needed if not pools[slot]]
        if empty:
            raise ApiError(
                422,
                "NO_MATCH_FOR_USAGE",
                "Tidak ada item yang cocok dengan filter acara.",
                {"missing_slots": empty, "usage": usage},
            )

        warnings: list[str] = []
        if usage is not None and not self.labels.usage_compatible(anchor.usage, usage, strict_usage):
            warnings.append("ANCHOR_USAGE_MISMATCH")

        seed = self._seed(anchor.id, usage, strict_usage, include_accessory)
        candidates = [
            self._assemble(anchor, combo, needed)
            for combo in self._combinations(pools, needed, seed)
        ]
        scores = self.scorer.score_batch([candidate.scored for candidate in candidates])
        for candidate, score in zip(candidates, scores):
            candidate.score = float(score)

        if include_accessory:
            accessories = [
                item
                for item in closet.get("accessory", [])
                if self.labels.usage_compatible(item.usage, usage, strict_usage)
            ]
            if accessories:
                candidate_count = min(len(candidates), max(top_k * 3, top_k))
                by_score = sorted(candidates, key=lambda candidate: -candidate.score)[:candidate_count]
                extra: list[Candidate] = []
                for candidate in by_score:
                    best = None
                    best_score = -1.0
                    for accessory in accessories[:12]:
                        extended = self._assemble(
                            anchor,
                            tuple(candidate.items[slot] for slot in needed),
                            needed,
                            accessory,
                        )
                        score = float(self.scorer.score_batch([extended.scored])[0])
                        if score > best_score:
                            best_score = score
                            best = extended
                    if best is not None:
                        best.score = best_score
                        extra.append(best)
                if extra:
                    candidates = extra
                    scores = [candidate.score for candidate in candidates]

        ranked = sorted(
            candidates,
            key=lambda candidate: (-candidate.score, tuple(item.id for item in candidate.items.values())),
        )
        counts: Counter[int] = Counter()
        selected: list[Candidate] = []
        for candidate in ranked:
            non_anchor_ids = [
                item.id for slot, item in candidate.items.items() if item.id != anchor.id
            ]
            if any(counts[item_id] >= 2 for item_id in non_anchor_ids):
                continue
            selected.append(candidate)
            for item_id in non_anchor_ids:
                counts[item_id] += 1
            if len(selected) >= top_k:
                break
        if len(selected) < top_k:
            warnings.append("FEWER_THAN_REQUESTED")

        recommendations = []
        for rank, candidate in enumerate(selected, start=1):
            ordered = [
                (slot, candidate.items[slot])
                for slot in CORE_SLOTS
                if slot in candidate.items
            ]
            recommendations.append(
                {
                    "rank": rank,
                    "score": round(candidate.score, 6),
                    "score_percent": max(0, min(100, int(round(candidate.score * 100)))),
                    "score_band": self.scorer.score_band(candidate.score),
                    "items": [
                        {
                            "slot": slot,
                            "is_anchor": item.id == anchor.id,
                            "item": self.item_service.to_out(item),
                        }
                        for slot, item in ordered
                    ],
                }
            )

        return {
            "anchor": self.item_service.to_out(anchor),
            "usage_filter": usage,
            "recommendations": recommendations,
            "meta": {
                "n_candidates": len(candidates),
                "scorer_backend": self.scorer.name,
                "scorer_version": self.scorer.version,
                "inference_ms": int(round((time.perf_counter() - started) * 1000)),
                "warnings": warnings,
            },
        }
