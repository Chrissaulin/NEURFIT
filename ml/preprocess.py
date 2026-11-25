"""Canonical image preprocessing shared by training and inference.

This function is the contract described in PRD §4.6.2: the *exact* same
implementation must exist in ``backend/app/services/image_service.py``. A golden
test (``05_export.py --verify``) guards the parity, so do not change it on one
side only.

Pipeline
--------
1. Honour camera EXIF orientation (``ImageOps.exif_transpose``).
2. Convert to RGB.
3. Square center-crop (keeps camera 4:3 / 16:9 photos proportional).
4. Resize to ``size`` x ``size`` with LANCZOS.
5. Return ``uint8`` numpy array of shape ``(size, size, 3)`` in the 0-255 range.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageOps

IMG_SIZE = 128


def preprocess_pil(img: Image.Image, size: int = IMG_SIZE) -> np.ndarray:
    img = ImageOps.exif_transpose(img).convert("RGB")
    # Square center-crop so camera photos (4:3 or 16:9) stay proportional.
    w, h = img.size
    side = min(w, h)
    left = (w - side) // 2
    top = (h - side) // 2
    img = img.crop((left, top, left + side, top + side))
    img = img.resize((size, size), Image.Resampling.LANCZOS)
    return np.asarray(img, dtype=np.uint8)  # (size, size, 3)


def preprocess_path(path: str | Path, size: int = IMG_SIZE) -> np.ndarray:
    """Load an image from disk and apply :func:`preprocess_pil`."""
    with Image.open(path) as img:
        return preprocess_pil(img, size=size)
