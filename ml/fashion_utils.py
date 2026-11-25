"""Shared helpers to read, clean, label-map and split the Fashion dataset.

Used by both ``00_eda.py`` and ``01_prepare_fashion.py`` so the EDA reflects
exactly the rows the preprocessing pipeline keeps.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, Iterable, List, Tuple

import numpy as np
import pandas as pd

STYLE_COLUMNS = ["id", "gender", "articleType", "baseColour", "usage"]


def build_label_maps(labels: Dict[str, Any]) -> Dict[str, Any]:
    """Build dataset-value -> canonical-key lookup tables from labels.yaml."""
    art_ds_to_key: Dict[str, str] = {}
    art_to_slot: Dict[str, Any] = {}
    art_display: Dict[str, str] = {}
    for entry in labels["article_type"]:
        key = entry["key"]
        art_display[key] = entry["display"]
        art_to_slot[key] = entry.get("slot")
        ds = entry.get("dataset")
        if ds:
            art_ds_to_key[ds] = key

    colour_ds_to_key: Dict[str, str] = {}
    colour_display: Dict[str, Any] = {}
    for entry in labels["base_colour"]:
        colour_display[entry["key"]] = {"name": entry["display"], "hex": entry["hex"]}
        for ds in entry["dataset"]:
            colour_ds_to_key[ds] = entry["key"]

    usage_ds_to_key: Dict[str, str] = {}
    usage_display: Dict[str, str] = {}
    for entry in labels["usage"]:
        usage_display[entry["key"]] = entry["display"]
        for ds in entry["dataset"]:
            usage_ds_to_key[ds] = entry["key"]

    return {
        "article_ds_to_key": art_ds_to_key,
        "article_to_slot": art_to_slot,
        "article_display": art_display,
        "colour_ds_to_key": colour_ds_to_key,
        "colour_display": colour_display,
        "usage_ds_to_key": usage_ds_to_key,
        "usage_display": usage_display,
    }


def read_styles(styles_csv: str | Path) -> pd.DataFrame:
    """Read styles.csv. ``on_bad_lines='skip'`` is mandatory (PRD A-01)."""
    df = pd.read_csv(styles_csv, on_bad_lines="skip")
    missing = [c for c in STYLE_COLUMNS if c not in df.columns]
    if missing:
        raise ValueError(f"styles.csv is missing columns: {missing}")
    return df


def build_fashion_frame(
    styles_csv: str | Path,
    images_dir: str | Path,
    labels: Dict[str, Any],
    *,
    exclude_gender: Iterable[str] = ("Boys", "Girls"),
    other_class_max_samples: int = 4000,
    seed: int = 42,
    max_samples: int | None = None,
    check_images: bool = True,
) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """Parse, clean and label-map the catalog.

    Returns ``(frame, stats)`` where ``frame`` has one row per kept image and
    columns: id, gender, article_type, base_colour, usage, usage_valid,
    is_other, image_path.
    """
    maps = build_label_maps(labels)
    images_dir = Path(images_dir)
    stats: Dict[str, Any] = {}

    raw = read_styles(styles_csv)
    stats["rows_raw"] = int(len(raw))
    stats["columns"] = list(raw.columns)

    df = raw[STYLE_COLUMNS].copy()
    df["id"] = pd.to_numeric(df["id"], errors="coerce")
    before = len(df)
    df = df[df["id"].notna()].copy()
    df["id"] = df["id"].astype("int64")
    stats["dropped_bad_id"] = before - len(df)

    # Drop rows without the two mandatory label heads.
    before = len(df)
    df = df[df["articleType"].notna() & df["baseColour"].notna()].copy()
    stats["dropped_missing_core"] = before - len(df)

    # Exclude configured genders (default: Boys, Girls).
    if exclude_gender:
        before = len(df)
        df = df[~df["gender"].isin(list(exclude_gender))].copy()
        stats["dropped_gender"] = before - len(df)

    # Drop rows whose image file is missing.
    if check_images:
        paths = [images_dir / f"{i}.jpg" for i in df["id"]]
        exists = np.fromiter((p.exists() for p in paths), dtype=bool, count=len(paths))
        before = len(df)
        df = df[exists].copy()
        stats["dropped_missing_image"] = before - len(df)
    else:
        stats["dropped_missing_image"] = 0

    # Map article_type (unmapped -> 'other').
    df["article_type"] = df["articleType"].map(maps["article_ds_to_key"])
    df["is_other"] = df["article_type"].isna()
    df.loc[df["is_other"], "article_type"] = "other"

    # Map base_colour; unmapped colours are dropped (PRD §4.3).
    df["base_colour"] = df["baseColour"].map(maps["colour_ds_to_key"])
    before = len(df)
    df = df[df["base_colour"].notna()].copy()
    stats["dropped_unmapped_colour"] = before - len(df)

    # Map usage; unmapped/ethnic/home stay as rows but mask the usage head.
    df["usage"] = df["usage"].map(maps["usage_ds_to_key"])
    df["usage_valid"] = df["usage"].notna()
    stats["usage_masked"] = int((~df["usage_valid"]).sum())

    # Cap the 'other' class so it cannot dominate the loss (PRD §4.4.5).
    other = df[df["is_other"]]
    stats["other_before_cap"] = int(len(other))
    if len(other) > other_class_max_samples:
        keep = other.sample(n=other_class_max_samples, random_state=seed)
        df = pd.concat([df[~df["is_other"]], keep]).sort_index()
    stats["other_after_cap"] = int(df["is_other"].sum())

    df = df.reset_index(drop=True)

    # Optional smoke-test subsample (keeps all classes where possible).
    if max_samples is not None and len(df) > max_samples:
        df = df.sample(n=max_samples, random_state=seed).sort_index().reset_index(drop=True)
        stats["subsampled_to"] = int(len(df))

    df["image_path"] = [images_dir / f"{i}.jpg" for i in df["id"]]
    stats["rows_kept"] = int(len(df))
    return df, stats


def stratified_split(
    df: pd.DataFrame,
    *,
    val_frac: float = 0.1,
    test_frac: float = 0.1,
    seed: int = 42,
    stratify_col: str = "article_type",
) -> pd.DataFrame:
    """Deterministic per-class 80/10/10 split. Adds a ``split`` column."""
    rng = np.random.default_rng(seed)
    train_idx: List[int] = []
    val_idx: List[int] = []
    test_idx: List[int] = []

    for _, group in df.groupby(stratify_col, sort=True):
        idx = group.index.to_numpy().copy()
        rng.shuffle(idx)
        n = len(idx)
        if n < 3:
            train_idx.extend(idx.tolist())
            continue
        n_val = max(1, int(round(val_frac * n)))
        n_test = max(1, int(round(test_frac * n)))
        if n - n_val - n_test < 1:
            n_val, n_test = 0, 0
        val_idx.extend(idx[:n_val].tolist())
        test_idx.extend(idx[n_val : n_val + n_test].tolist())
        train_idx.extend(idx[n_val + n_test :].tolist())

    out = df.copy()
    out["split"] = "train"
    out.loc[val_idx, "split"] = "val"
    out.loc[test_idx, "split"] = "test"
    return out
