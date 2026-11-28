from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, LargeBinary, String, func
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    display_name: Mapped[str] = mapped_column(String, nullable=False, default="Guest")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=utcnow, server_default=func.now()
    )


class Item(Base):
    __tablename__ = "items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, default=1
    )

    image_path: Mapped[str] = mapped_column(String, nullable=False)
    thumb_path: Mapped[str] = mapped_column(String, nullable=False)
    image_width: Mapped[int] = mapped_column(Integer, nullable=False)
    image_height: Mapped[int] = mapped_column(Integer, nullable=False)

    slot: Mapped[str] = mapped_column(String, nullable=False)
    article_type: Mapped[str] = mapped_column(String, nullable=False)
    base_colour: Mapped[str] = mapped_column(String, nullable=False)
    usage: Mapped[str] = mapped_column(String, nullable=False)

    pred_article_type: Mapped[str | None] = mapped_column(String, nullable=True)
    pred_article_type_conf: Mapped[float | None] = mapped_column(Float, nullable=True)
    pred_base_colour: Mapped[str | None] = mapped_column(String, nullable=True)
    pred_base_colour_conf: Mapped[float | None] = mapped_column(Float, nullable=True)
    pred_usage: Mapped[str | None] = mapped_column(String, nullable=True)
    pred_usage_conf: Mapped[float | None] = mapped_column(Float, nullable=True)
    is_label_corrected: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    embedding: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    embedding_dim: Mapped[int] = mapped_column(Integer, nullable=False)
    model_version: Mapped[str] = mapped_column(String, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=utcnow, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=utcnow,
        onupdate=utcnow,
        server_default=func.now(),
    )
