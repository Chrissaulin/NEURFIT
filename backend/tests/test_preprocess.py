from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image

from app.services.image_service import preprocess_pil as backend_preprocess

ML_DIR = Path(__file__).resolve().parents[2] / "ml"
sys.path.insert(0, str(ML_DIR))
from preprocess import preprocess_pil as ml_preprocess  # noqa: E402


def test_preprocess_parity() -> None:
    demo_dir = Path(__file__).resolve().parents[1] / "demo_assets"
    images = sorted(demo_dir.glob("*.jpg"))[:5]
    assert images, "demo assets missing"
    for path in images:
        with Image.open(path) as image:
            expected = ml_preprocess(image)
            actual = backend_preprocess(image)
        assert actual.shape == (128, 128, 3)
        assert actual.dtype == np.uint8
        assert np.array_equal(actual, expected), path.name
