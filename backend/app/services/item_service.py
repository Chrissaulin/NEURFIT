from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from PIL import Image
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..config import Settings
from ..core.errors import ApiError
from ..core.labels import LabelStore
from ..orm import Item
from ..schemas import ItemCreate, ItemOut
from .image_service import ImageService
from .ml_service import MLService

CORE_SLOTS = ["top", "bottom", "shoes", "accessory"]


def iso_z(value: datetime) -> str:
    if value.tzinfo is not None:
        value = value.astimezone(timezone.utc).replace(tzinfo=None)
    return value.strftime("%Y-%m-%dT%H:%M:%SZ")


def emb_to_blob(value: np.ndarray) -> bytes:
    array = np.asarray(value, dtype="<f4")
    if array.ndim != 1:
        raise ValueError("embedding must be 1-D")
    return array.tobytes()


def blob_to_emb(blob: bytes, dim: int) -> np.ndarray:
    array = np.frombuffer(blob, dtype="<f4")
    if array.shape != (dim,):
        raise ValueError("corrupt embedding")
    return array


class ItemService:
    def __init__(
        self,
        session: Session,
        settings: Settings,
        labels: LabelStore,
        ml: MLService,
        images: ImageService,
    ) -> None:
        self.session = session
        self.settings = settings
        self.labels = labels
        self.ml = ml
        self.images = images

    def to_out(self, item: Item) -> ItemOut:
        return ItemOut(
            id=item.id,
            image_url=f"/uploads/{item.image_path}",
            thumb_url=f"/uploads/{item.thumb_path}",
            slot=item.slot,
            article_type=item.article_type,
            base_colour=item.base_colour,
            usage=item.usage,
            is_label_corrected=bool(item.is_label_corrected),
            created_at=iso_z(item.created_at),
        )

    def analyze(self, data: bytes, content_type: str | None) -> dict:
        self.images.cleanup_tmp()
        image = self.images.validate_upload(data, content_type)
        temp_id = uuid.uuid4().hex
        self.images.save_tmp(temp_id, image)
        analysis = self.ml.analyze(self.images.preprocess(image))
        temp_dir = self.images.root / "tmp"
        np.save(temp_dir / f"{temp_id}.npy", analysis["embedding"])
        payload = {
            "predictions": analysis["predictions"],
            "low_confidence_fields": analysis["low_confidence_fields"],
            "supported": analysis["supported"],
            "slot": analysis["slot"],
            "model_version": analysis["model_version"],
            "inference_ms": analysis["inference_ms"],
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        (temp_dir / f"{temp_id}.json").write_text(
            json.dumps(payload, ensure_ascii=False), encoding="utf-8"
        )
        return {
            "temp_id": temp_id,
            "image_url": f"/uploads/tmp/{temp_id}.jpg",
            "slot": analysis["slot"],
            **{
                key: payload[key]
                for key in (
                    "predictions",
                    "low_confidence_fields",
                    "supported",
                    "model_version",
                    "inference_ms",
                )
            },
        }

    def save_item(self, payload: ItemCreate) -> ItemOut:
        temp_dir = self.images.root / "tmp"
        image_path = temp_dir / f"{payload.temp_id}.jpg"
        json_path = temp_dir / f"{payload.temp_id}.json"
        npy_path = temp_dir / f"{payload.temp_id}.npy"
        if not (image_path.exists() and json_path.exists() and npy_path.exists()):
            raise ApiError(404, "TEMP_NOT_FOUND", "Sesi unggah tidak ditemukan atau kedaluwarsa.")
        self.labels.validate_labels(payload.article_type, payload.base_colour, payload.usage)
        slot = self.labels.slot_for(payload.article_type)
        metadata = json.loads(json_path.read_text(encoding="utf-8"))
        predictions = metadata.get("predictions", {})
        embedding = np.load(npy_path)
        corrected = any(
            payload_value != predictions.get(field, {}).get("label")
            for field, payload_value in (
                ("article_type", payload.article_type),
                ("base_colour", payload.base_colour),
                ("usage", payload.usage),
            )
        )

        item_uuid = uuid.uuid4().hex
        with Image.open(image_path) as image:
            normalized = image.convert("RGB")
            stored = self.images.save_item(item_uuid, normalized)
        item = Item(
            user_id=1,
            image_path=stored[0],
            thumb_path=stored[1],
            image_width=stored[2],
            image_height=stored[3],
            slot=slot,
            article_type=payload.article_type,
            base_colour=payload.base_colour,
            usage=payload.usage,
            pred_article_type=predictions.get("article_type", {}).get("label"),
            pred_article_type_conf=predictions.get("article_type", {}).get("confidence"),
            pred_base_colour=predictions.get("base_colour", {}).get("label"),
            pred_base_colour_conf=predictions.get("base_colour", {}).get("confidence"),
            pred_usage=predictions.get("usage", {}).get("label"),
            pred_usage_conf=predictions.get("usage", {}).get("confidence"),
            is_label_corrected=corrected,
            embedding=emb_to_blob(embedding),
            embedding_dim=int(embedding.shape[0]),
            model_version=str(metadata.get("model_version", self.ml.model_version)),
        )
        try:
            self.session.add(item)
            self.session.commit()
            self.session.refresh(item)
        except Exception:
            self.session.rollback()
            self.images.remove(stored[0])
            self.images.remove(stored[1])
            raise
        self.images.remove_tmp(payload.temp_id)
        return self.to_out(item)

    def seed_demo(self) -> dict:
        manifest_path = self.settings.demo_path / "demo_manifest.json"
        if not manifest_path.exists():
            raise ApiError(404, "TEMP_NOT_FOUND", "Aset demo belum tersedia.")
        if not self.ml.ready:
            from ..core.errors import model_not_ready

            raise model_not_ready()
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        entries = manifest.get("items", [])
        created_paths: list[tuple[str, str]] = []
        counts = {slot: 0 for slot in CORE_SLOTS}
        try:
            for entry in entries:
                article_type = entry["article_type"]
                base_colour = entry["base_colour"]
                usage = entry["usage"]
                self.labels.validate_labels(article_type, base_colour, usage)
                slot = self.labels.slot_for(article_type)
                demo_path = self.settings.demo_path / entry["file"]
                with Image.open(demo_path) as image:
                    normalized = image.convert("RGB")
                    analysis = self.ml.analyze(self.images.preprocess(normalized))
                    item_uuid = uuid.uuid4().hex
                    stored = self.images.save_demo(item_uuid, normalized)
                created_paths.append((stored[0], stored[1]))
                predictions = analysis["predictions"]
                corrected = any(
                    final != predictions.get(field, {}).get("label")
                    for field, final in (
                        ("article_type", article_type),
                        ("base_colour", base_colour),
                        ("usage", usage),
                    )
                )
                item = Item(
                    user_id=1,
                    image_path=stored[0],
                    thumb_path=stored[1],
                    image_width=stored[2],
                    image_height=stored[3],
                    slot=slot,
                    article_type=article_type,
                    base_colour=base_colour,
                    usage=usage,
                    pred_article_type=predictions["article_type"]["label"],
                    pred_article_type_conf=predictions["article_type"]["confidence"],
                    pred_base_colour=predictions["base_colour"]["label"],
                    pred_base_colour_conf=predictions["base_colour"]["confidence"],
                    pred_usage=predictions["usage"]["label"],
                    pred_usage_conf=predictions["usage"]["confidence"],
                    is_label_corrected=corrected,
                    embedding=emb_to_blob(analysis["embedding"]),
                    embedding_dim=int(analysis["embedding"].shape[0]),
                    model_version=analysis["model_version"],
                )
                self.session.add(item)
                counts[slot] = counts.get(slot, 0) + 1
            self.session.commit()
        except Exception:
            self.session.rollback()
            for image_path, thumb_path in created_paths:
                self.images.remove(image_path)
                self.images.remove(thumb_path)
            raise
        return {"inserted_count": len(entries), "counts_by_slot": counts}

    def list_items(
        self,
        *,
        slot: str | None,
        article_type: str | None,
        base_colour: str | None,
        usage: str | None,
        limit: int,
        offset: int,
    ) -> dict:
        conditions = [Item.user_id == 1]
        if slot:
            conditions.append(Item.slot == slot)
        if article_type:
            conditions.append(Item.article_type == article_type)
        if base_colour:
            conditions.append(Item.base_colour == base_colour)
        if usage:
            conditions.append(Item.usage == usage)
        total = self.session.scalar(select(func.count()).select_from(Item).where(*conditions)) or 0
        items = self.session.scalars(
            select(Item)
            .where(*conditions)
            .order_by(Item.created_at.desc(), Item.id.desc())
            .limit(limit)
            .offset(offset)
        ).all()
        counts = {slot_key: 0 for slot_key in CORE_SLOTS}
        for slot_key, count in self.session.execute(
            select(Item.slot, func.count()).where(Item.user_id == 1).group_by(Item.slot)
        ):
            counts[slot_key] = int(count)
        return {
            "items": [self.to_out(item) for item in items],
            "total": int(total),
            "limit": limit,
            "offset": offset,
            "counts_by_slot": counts,
        }

    def get(self, item_id: int) -> Item:
        item = self.session.get(Item, item_id)
        if item is None or item.user_id != 1:
            raise ApiError(404, "ITEM_NOT_FOUND", "Item tidak ditemukan.")
        return item

    def delete(self, item_id: int) -> None:
        item = self.get(item_id)
        image_path = item.image_path
        thumb_path = item.thumb_path
        self.session.delete(item)
        self.session.commit()
        self.images.remove(image_path)
        self.images.remove(thumb_path)
