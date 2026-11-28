from __future__ import annotations

import io
from pathlib import Path

from PIL import Image, ImageOps, UnidentifiedImageError

from ..config import Settings
from ..core.errors import ApiError

Image.MAX_IMAGE_PIXELS = 50_000_000

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}
IMG_SIZE = 128


def preprocess_pil(image: Image.Image, size: int = IMG_SIZE):
    import numpy as np

    image = ImageOps.exif_transpose(image).convert("RGB")
    width, height = image.size
    side = min(width, height)
    left = (width - side) // 2
    top = (height - side) // 2
    image = image.crop((left, top, left + side, top + side))
    image = image.resize((size, size), Image.Resampling.LANCZOS)
    return np.asarray(image, dtype=np.uint8)


class ImageService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.root = settings.upload_path
        for name in ("items", "thumbs", "tmp"):
            (self.root / name).mkdir(parents=True, exist_ok=True)

    def validate_upload(self, data: bytes, content_type: str | None) -> Image.Image:
        if content_type not in ALLOWED_CONTENT_TYPES:
            raise ApiError(
                415,
                "UNSUPPORTED_MEDIA_TYPE",
                "Format harus JPEG, PNG, atau WebP.",
            )
        if len(data) > self.settings.max_upload_mb * 1024 * 1024:
            raise ApiError(
                413,
                "FILE_TOO_LARGE",
                f"Ukuran maksimum {self.settings.max_upload_mb} MB.",
            )
        try:
            with Image.open(io.BytesIO(data)) as image:
                if image.format not in ALLOWED_FORMATS:
                    raise ApiError(
                        415,
                        "UNSUPPORTED_MEDIA_TYPE",
                        "Format harus JPEG, PNG, atau WebP.",
                    )
                image.load()
                normalized = ImageOps.exif_transpose(image).convert("RGB")
        except Image.DecompressionBombError as exc:
            raise ApiError(422, "IMAGE_UNREADABLE", "Gambar terlalu besar.") from exc
        except UnidentifiedImageError as exc:
            raise ApiError(415, "UNSUPPORTED_MEDIA_TYPE", "Isi file bukan gambar valid.") from exc
        except OSError as exc:
            raise ApiError(422, "IMAGE_UNREADABLE", "Gambar tidak dapat dibaca.") from exc
        return normalized

    def preprocess(self, image: Image.Image):
        return preprocess_pil(image, IMG_SIZE)

    def save_tmp(self, temp_id: str, image: Image.Image) -> Path:
        path = self.root / "tmp" / f"{temp_id}.jpg"
        self._save_jpeg(image, path)
        return path

    def save_item(self, item_uuid: str, image: Image.Image) -> tuple[str, str, int, int]:
        image_path = self.root / "items" / f"{item_uuid}.jpg"
        thumb_path = self.root / "thumbs" / f"{item_uuid}.jpg"
        width, height = self._save_jpeg(image, image_path)
        self._save_jpeg(image, thumb_path, max_side=320)
        return (
            f"items/{item_uuid}.jpg",
            f"thumbs/{item_uuid}.jpg",
            width,
            height,
        )

    def save_demo(self, item_uuid: str, image: Image.Image) -> tuple[str, str, int, int]:
        return self.save_item(item_uuid, image)

    def _save_jpeg(self, image: Image.Image, path: Path, max_side: int = 1024) -> tuple[int, int]:
        path.parent.mkdir(parents=True, exist_ok=True)
        output = image.convert("RGB").copy()
        output.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
        output.save(path, "JPEG", quality=88, optimize=True)
        return output.size

    def remove(self, relative_path: str | None) -> None:
        if not relative_path:
            return
        path = (self.root / relative_path).resolve()
        try:
            path.relative_to(self.root.resolve())
        except ValueError:
            return
        path.unlink(missing_ok=True)

    def remove_tmp(self, temp_id: str) -> None:
        for suffix in (".jpg", ".json", ".npy"):
            (self.root / "tmp" / f"{temp_id}{suffix}").unlink(missing_ok=True)

    def cleanup_tmp(self, max_age_seconds: int = 86400) -> None:
        import time

        cutoff = time.time() - max_age_seconds
        for path in (self.root / "tmp").glob("*"):
            try:
                if path.stat().st_mtime < cutoff:
                    path.unlink(missing_ok=True)
            except OSError:
                continue

    def path_for(self, relative_path: str) -> Path:
        return self.root / relative_path
