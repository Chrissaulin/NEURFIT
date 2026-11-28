from __future__ import annotations

import numpy as np

from ..core.labels import LabelStore
from .base import ScoredItem


class RuleBasedScorer:
    name = "rules"

    def __init__(self, labels: LabelStore, version: str = "rules-v1") -> None:
        self.labels = labels
        self.version = version
        self.neutral = labels.neutral_colours

    def _score(self, outfit: list[ScoredItem | None]) -> float:
        items = [item for item in outfit if item is not None]
        if not items:
            return 0.5
        colours = [item.base_colour for item in items]
        usages = [item.usage for item in items]
        articles = [item.article_type for item in items]
        neutral_count = sum(colour in self.neutral for colour in colours)
        non_neutral = {colour for colour in colours if colour not in self.neutral}
        score = 0.5
        if neutral_count >= 2:
            score += 0.15
        if len(non_neutral) >= 3:
            score -= 0.20
        if len(usages) >= 2 and len(set(usages)) == 1:
            score += 0.15
        elif "sports" in usages and "formal" in usages:
            score -= 0.25
        if "sports" in usages and "formal_shoes" in articles:
            score -= 0.10
        if "formal" in usages and "sports_shoes" in articles:
            score -= 0.10
        return float(np.clip(score, 0.05, 0.95))

    def score_batch(self, outfits: list[list[ScoredItem | None]]) -> np.ndarray:
        return np.asarray([self._score(outfit) for outfit in outfits], dtype=np.float32)

    def score_band(self, score: float) -> str:
        if score >= 0.75:
            return "very_compatible"
        if score >= 0.5:
            return "compatible"
        return "less_compatible"
