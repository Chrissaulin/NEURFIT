from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

import numpy as np


@dataclass(frozen=True)
class ScoredItem:
    id: int
    slot: str
    article_type: str
    base_colour: str
    usage: str
    embedding: np.ndarray


class OutfitScorer(Protocol):
    name: str
    version: str

    def score_batch(self, outfits: list[list[ScoredItem | None]]) -> np.ndarray: ...

    def score_band(self, score: float) -> str: ...
