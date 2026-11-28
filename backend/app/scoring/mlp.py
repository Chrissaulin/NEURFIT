from __future__ import annotations

import numpy as np

from ..core.labels import LabelStore
from .base import ScoredItem


class MLPScorer:
    name = "mlp"

    def __init__(self, model, meta: dict, labels: LabelStore, version: str) -> None:
        import keras

        self.model = model
        self.meta = meta
        self.labels = labels
        self.version = version
        self.slots: list[str] = meta["slots"]
        self.slot_to_id = {slot: index for index, slot in enumerate(self.slots)}
        self.seq_slots: list[str] = meta["seq_slots"]["classic"]
        self.mean = np.asarray(meta["emb_mean"], dtype=np.float32)
        self.std = np.asarray(meta["emb_std"], dtype=np.float32)
        self.feature_dim = int(meta["feature_dim"])
        self.score_bands = meta.get("score_bands", {"very_compatible": 0.75, "compatible": 0.5})
        self._keras = keras

    def _one_hot(self, value: int, size: int) -> np.ndarray:
        out = np.zeros(size, dtype=np.float32)
        if 0 <= value < size:
            out[value] = 1.0
        return out

    def _feature(self, item: ScoredItem | None) -> np.ndarray:
        if item is None:
            return np.zeros(self.feature_dim, dtype=np.float32)
        embedding = (np.asarray(item.embedding, dtype=np.float32) - self.mean) / self.std
        article_index = self.labels.article_keys.index(item.article_type)
        colour_index = self.labels.colour_keys.index(item.base_colour)
        usage_index = self.labels.usage_keys.index(item.usage)
        tone = self.labels.colour_tone.get(item.base_colour, "neutral")
        tone_index = {"warm": 0, "cool": 1, "neutral": 2}[tone]
        return np.concatenate(
            [
                embedding,
                self._one_hot(self.slot_to_id.get(item.slot, self.slot_to_id["pad"]), len(self.slots)),
                self._one_hot(article_index, len(self.labels.article_keys)),
                self._one_hot(colour_index, len(self.labels.colour_keys)),
                self._one_hot(usage_index, len(self.labels.usage_keys)),
                self._one_hot(tone_index, 3),
                np.array([1.0], dtype=np.float32),
            ]
        )

    def _matrix(self, outfit: list[ScoredItem | None]) -> np.ndarray:
        by_slot = {item.slot: item for item in outfit if item is not None}
        sequence = [by_slot.get(slot) for slot in self.seq_slots]
        return np.stack([self._feature(item) for item in sequence])

    def score_batch(self, outfits: list[list[ScoredItem | None]]) -> np.ndarray:
        if not outfits:
            return np.array([], dtype=np.float32)
        scores: list[np.ndarray] = []
        for start in range(0, len(outfits), 256):
            batch = outfits[start:start + 256]
            matrix = np.stack([self._matrix(outfit) for outfit in batch]).astype(np.float32)
            prediction = self.model(matrix, training=False).numpy().reshape(-1)
            scores.append(prediction.astype(np.float32))
        return np.concatenate(scores)

    def score_band(self, score: float) -> str:
        if score >= float(self.score_bands.get("very_compatible", 0.75)):
            return "very_compatible"
        if score >= float(self.score_bands.get("compatible", 0.5)):
            return "compatible"
        return "less_compatible"
