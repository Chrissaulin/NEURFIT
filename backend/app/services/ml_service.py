from __future__ import annotations

import json
import logging
import time
from pathlib import Path

import numpy as np

from ..config import Settings
from ..core.labels import LabelStore
from .image_service import preprocess_pil

logger = logging.getLogger(__name__)


class MLService:
    def __init__(self, settings: Settings, labels: LabelStore) -> None:
        self.settings = settings
        self.labels = labels
        self.model_dir = settings.model_path
        self.ready = False
        self.error: str | None = None
        self.tagger = None
        self.scorer = None
        self.manifest: dict = {}
        self.scorer_meta: dict = {}
        self.labels_meta: dict = {}
        self.model_version = "unknown"
        self.scorer_version = "unknown"

    def load(self) -> None:
        try:
            import keras

            manifest_path = self.model_dir / "manifest.json"
            metrics_path = self.model_dir / "metrics.json"
            scorer_meta_path = self.model_dir / "scorer_meta.json"
            labels_path = self.model_dir / "labels.json"
            self.manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else {}
            self.scorer_meta = (
                json.loads(scorer_meta_path.read_text(encoding="utf-8"))
                if scorer_meta_path.exists()
                else {}
            )
            self.labels_meta = (
                json.loads(labels_path.read_text(encoding="utf-8")) if labels_path.exists() else {}
            )
            self.model_version = str(self.manifest.get("version", "unknown"))
            self.scorer_version = str(
                self.manifest.get("models", {}).get("scorer", {}).get("version", self.model_version)
            )
            self.tagger = keras.models.load_model(self.model_dir / "tagger.keras", compile=False)
            self.scorer = keras.models.load_model(self.model_dir / "scorer.keras", compile=False)

            dummy_image = np.zeros((1, 128, 128, 3), dtype=np.float32)
            self.tagger(dummy_image, training=False)
            if self.scorer is not None:
                feature_dim = int(self.scorer_meta.get("feature_dim", self.scorer.input_shape[-1]))
                dummy_outfit = np.zeros((1, 4, feature_dim), dtype=np.float32)
                self.scorer(dummy_outfit, training=False)
            self.ready = True
            logger.info("models loaded: %s", self.model_version)
        except Exception as exc:  # noqa: BLE001
            self.ready = False
            self.error = str(exc)
            logger.exception("failed to load models")

    def _outputs(self, image: np.ndarray) -> dict[str, np.ndarray]:
        assert self.tagger is not None
        raw = self.tagger(image[None].astype(np.float32), training=False)
        if isinstance(raw, dict):
            return {key: np.asarray(value)[0] for key, value in raw.items()}
        names = list(getattr(self.tagger, "output_names", []))
        return {name: np.asarray(value)[0] for name, value in zip(names, raw)}

    def _top_k(self, probabilities: np.ndarray, keys: list[str], k: int = 3) -> list[dict]:
        indices = np.argsort(-probabilities)[:k]
        return [
            {"label": keys[int(index)], "confidence": float(probabilities[int(index)])}
            for index in indices
        ]

    def analyze(self, image: np.ndarray) -> dict:
        if not self.ready:
            from ..core.errors import model_not_ready

            raise model_not_ready()
        started = time.perf_counter()
        outputs = self._outputs(image)
        article = outputs["article_type"]
        colour = outputs["base_colour"]
        usage = outputs["usage"]
        embedding = outputs.get("embedding")
        if embedding is None:
            raise RuntimeError("tagger missing embedding output")

        article_top = self._top_k(article, self.labels.article_keys)
        colour_top = self._top_k(colour, self.labels.colour_keys)
        usage_top = self._top_k(usage, self.labels.usage_keys)
        predictions = {
            "article_type": {
                "label": article_top[0]["label"],
                "confidence": article_top[0]["confidence"],
                "top_k": article_top,
            },
            "base_colour": {
                "label": colour_top[0]["label"],
                "confidence": colour_top[0]["confidence"],
                "top_k": colour_top,
            },
            "usage": {
                "label": usage_top[0]["label"],
                "confidence": usage_top[0]["confidence"],
                "top_k": usage_top,
            },
        }
        low_confidence = [
            field
            for field, prediction in predictions.items()
            if prediction["confidence"] < self.settings.confidence_threshold
        ]
        article_label = predictions["article_type"]["label"]
        return {
            "predictions": predictions,
            "low_confidence_fields": low_confidence,
            "supported": article_label != "other",
            "slot": self.labels.article_to_slot.get(article_label),
            "embedding": np.asarray(embedding, dtype=np.float32),
            "model_version": self.model_version,
            "inference_ms": int(round((time.perf_counter() - started) * 1000)),
        }
