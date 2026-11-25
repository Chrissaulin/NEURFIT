"""Prepare the Fashion Product Images dataset for training (PRD §4.4.1, Day 1).

Steps
-----
1. Parse ``styles.csv`` with ``on_bad_lines='skip'``.
2. Clean: drop rows missing ``articleType``/``baseColour``, rows without an
   image, and configured genders (default Boys/Girls).
3. Map labels to the taxonomy in ``configs/labels.yaml``:
   article_type (24 incl. ``other``), base_colour (14), usage (5 + masked).
4. Cap the ``other`` class and build a stratified 80/10/10 split (seed 42).
5. Process every kept image **once** through ``preprocess_pil`` and cache the
   uint8 ``128x128x3`` arrays into ``data/processed/fashion_128.npy`` (memmap).

Artifacts
---------
    <SW_DATA_DIR>/processed/fashion_128.npy
    <SW_DATA_DIR>/processed/fashion_index.csv        (npy_index <-> labels <-> split)
    <SW_DATA_DIR>/processed/splits/{train,val,test}.csv
    <SW_ARTIFACT_DIR>/fashion_prepare_report.json

Run from ``ml/``::

    python 01_prepare_fashion.py
    python 01_prepare_fashion.py --max-samples 2000      # smoke test
    python 01_prepare_fashion.py --no-cache              # labels/splits only
"""

from __future__ import annotations

import argparse
import json
import os
import time
from pathlib import Path
from typing import Any, Dict, List, Tuple

import numpy as np
import pandas as pd
from tqdm import tqdm

import config_utils as cu
import fashion_utils as fu
from preprocess import preprocess_path

INDEX_COLUMNS = [
    "npy_index",
    "id",
    "gender",
    "article_type",
    "base_colour",
    "usage",
    "usage_valid",
    "is_other",
    "split",
    "image_path",
]


def _rel_posix(path: str | Path) -> str:
    try:
        return Path(path).resolve().relative_to(cu.data_dir()).as_posix()
    except ValueError:
        return Path(path).as_posix()


def cache_images(
    df: pd.DataFrame,
    npy_path: Path,
    img_size: int,
) -> Tuple[List[int], List[Dict[str, Any]]]:
    """Write processed images to a memmap npy. Returns (kept_positions, failures)."""
    n = len(df)
    arr = np.lib.format.open_memmap(
        npy_path, mode="w+", dtype=np.uint8, shape=(n, img_size, img_size, 3)
    )
    kept: List[int] = []
    failures: List[Dict[str, Any]] = []
    write = 0

    iterator = df.itertuples(index=False)
    for pos, row in enumerate(tqdm(iterator, total=n, desc="cache 128px", unit="img")):
        try:
            img = preprocess_path(row.image_path, size=img_size)
        except Exception as exc:  # corrupt / unreadable image
            failures.append({"id": int(row.id), "error": str(exc)})
            continue
        arr[write] = img
        kept.append(pos)
        write += 1

    arr.flush()
    del arr

    if write < n:
        # Compact the memmap in-place (chunked copy to avoid loading it all).
        src = np.lib.format.open_memmap(npy_path, mode="r")
        tmp_path = npy_path.with_name(npy_path.stem + "_compact.npy")
        dst = np.lib.format.open_memmap(
            tmp_path, mode="w+", dtype=np.uint8, shape=(write, img_size, img_size, 3)
        )
        chunk = 1024
        for start in range(0, write, chunk):
            end = min(start + chunk, write)
            dst[start:end] = src[start:end]
        dst.flush()
        del dst, src
        os.replace(tmp_path, npy_path)

    return kept, failures


def main() -> None:
    parser = argparse.ArgumentParser(description="Prepare Fashion Product Images for training")
    parser.add_argument("--data-dir", default=None, help="override SW_DATA_DIR")
    parser.add_argument("--out-dir", default=None, help="override processed output dir")
    parser.add_argument("--artifact-dir", default=None, help="override SW_ARTIFACT_DIR")
    parser.add_argument("--max-samples", type=int, default=None, help="smoke-test subsample size")
    parser.add_argument("--other-max", type=int, default=None, help="cap for the 'other' class")
    parser.add_argument("--seed", type=int, default=None)
    parser.add_argument("--img-size", type=int, default=None)
    parser.add_argument("--no-cache", action="store_true", help="skip writing fashion_128.npy")
    parser.add_argument("--no-image-check", action="store_true", help="skip file-existence filtering")
    args = parser.parse_args()

    # Allow CLI overrides to flow through the same env-based path helpers.
    if args.data_dir:
        os.environ["SW_DATA_DIR"] = args.data_dir
    if args.artifact_dir:
        os.environ["SW_ARTIFACT_DIR"] = args.artifact_dir

    labels = cu.load_labels()
    seed = args.seed if args.seed is not None else int(labels.get("seed", 42))
    img_size = args.img_size if args.img_size is not None else int(labels["img_size"][0])
    other_max = args.other_max if args.other_max is not None else int(labels.get("other_class_max_samples", 4000))

    raw_dir = cu.fashion_raw_dir()
    styles_csv = raw_dir / "styles.csv"
    images_dir = raw_dir / "images"
    processed_dir = Path(args.out_dir) if args.out_dir else cu.fashion_processed_dir()
    splits_dir = cu.ensure_dir(processed_dir / "splits")
    artifact_dir = cu.ensure_dir(cu.artifact_dir())

    t0 = time.time()
    print(f"[prepare] reading {cu.to_posix(styles_csv)}")
    frame, clean_stats = fu.build_fashion_frame(
        styles_csv,
        images_dir,
        labels,
        other_class_max_samples=other_max,
        seed=seed,
        max_samples=args.max_samples,
        check_images=not args.no_image_check,
    )
    print(f"[prepare] kept rows: {len(frame)} (stats: {clean_stats})")

    frame = fu.stratified_split(frame, seed=seed)
    split_counts = frame["split"].value_counts().to_dict()
    print(f"[prepare] split sizes: {split_counts}")

    # Cache images and keep only successfully processed rows.
    npy_path = processed_dir / f"fashion_{img_size}.npy"
    failures: List[Dict[str, Any]] = []
    if not args.no_cache:
        cu.ensure_dir(processed_dir)
        print(f"[prepare] caching images -> {cu.to_posix(npy_path)}")
        kept, failures = cache_images(frame, npy_path, img_size)
        frame = frame.iloc[kept].reset_index(drop=True)
        if failures:
            print(f"[prepare] WARNING: {len(failures)} unreadable images skipped")
    else:
        print("[prepare] --no-cache: skipping image caching")
        frame = frame.reset_index(drop=True)

    # Build the master index aligned with the npy rows.
    index_df = frame[
        ["id", "gender", "article_type", "base_colour", "usage", "usage_valid", "is_other", "split"]
    ].copy()
    index_df.insert(0, "npy_index", np.arange(len(index_df), dtype=np.int64))
    index_df["usage"] = index_df["usage"].fillna("")
    index_df["usage_valid"] = index_df["usage_valid"].astype(bool)
    index_df["is_other"] = index_df["is_other"].astype(bool)
    index_df["image_path"] = [_rel_posix(p) for p in frame["image_path"]]
    index_df = index_df[INDEX_COLUMNS]

    index_path = processed_dir / "fashion_index.csv"
    index_df.to_csv(index_path, index=False)
    print(f"[prepare] wrote {cu.to_posix(index_path)}")

    for split in ("train", "val", "test"):
        sub = index_df[index_df["split"] == split]
        sub.to_csv(splits_dir / f"{split}.csv", index=False)
        print(f"[prepare]   {split}: {len(sub)} rows -> {cu.to_posix(splits_dir / (split + '.csv'))}")

    # Report.
    report: Dict[str, Any] = {
        "labels_version": labels.get("version"),
        "seed": seed,
        "img_size": img_size,
        "other_class_max_samples": other_max,
        "max_samples": args.max_samples,
        "caching_enabled": not args.no_cache,
        "clean_stats": clean_stats,
        "rows_final": int(len(index_df)),
        "split_sizes": {str(k): int(v) for k, v in index_df["split"].value_counts().items()},
        "split_article_type": {
            split: {str(k): int(v) for k, v in g["article_type"].value_counts().items()}
            for split, g in index_df.groupby("split")
        },
        "article_type_counts": {
            str(k): int(v) for k, v in index_df["article_type"].value_counts().items()
        },
        "base_colour_counts": {
            str(k): int(v) for k, v in index_df["base_colour"].value_counts().items()
        },
        "usage_counts": {
            str(k): int(v) for k, v in index_df["usage"].replace("", "<masked>").value_counts().items()
        },
        "usage_masked_rows": int((~index_df["usage_valid"]).sum()),
        "npy": {
            "path": cu.to_posix(npy_path) if not args.no_cache else None,
            "dtype": "uint8",
            "shape": [int(len(index_df)), img_size, img_size, 3] if not args.no_cache else None,
            "bytes": int(len(index_df) * img_size * img_size * 3) if not args.no_cache else 0,
        },
        "unreadable_images": len(failures),
        "unreadable_examples": failures[:20],
        "elapsed_s": round(time.time() - t0, 1),
    }
    report_path = artifact_dir / "fashion_prepare_report.json"
    report_path.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"[prepare] report -> {cu.to_posix(report_path)}")
    print(f"[prepare] done in {report['elapsed_s']}s")


if __name__ == "__main__":
    main()
