"""Exploratory Data Analysis for the Smart Wardrobe datasets.

Covers both datasets required on Day 1 (PRD §8.2):

* Fashion Product Images (Small) -> catalog used to train the CNN tagger.
* Polyvore (Re-PolyVore layout)   -> outfit sequences used to train the scorer.

Outputs go to ``SW_ARTIFACT_DIR/eda/`` (default ``ml/artifacts/eda/``):
    fashion_eda.json / fashion_eda.md + PNG plots
    polyvore_eda.json / polyvore_eda.md + PNG plots

Run from the ``ml/`` directory::

    python 00_eda.py                 # both datasets
    python 00_eda.py --skip-polyvore
"""

from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path
from typing import Any, Dict, List, Optional

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

import config_utils as cu
import fashion_utils as fu

# ---------------------------------------------------------------------------
# Polyvore slot mapping (PRD §4.5.2)
# ---------------------------------------------------------------------------
SLOT_KEYWORDS: Dict[str, List[str]] = {
    "top": [
        "tops", "tank tops", "t-shirts", "tshirts", "shirt", "shirts", "blouse",
        "blouses", "sweater", "sweaters", "sweatshirt", "sweatshirts", "jacket",
        "jackets", "coat", "coats", "hoodie", "hoodies", "cardigan", "cardigans",
        "blazer", "blazers", "outwear", "tunic", "tunics", "vest", "vests",
        "polo", "polos",
    ],
    "bottom": [
        "jeans", "pants", "trousers", "shorts", "skirt", "skirts", "leggings",
        "capri",
    ],
    "shoes": [
        "shoes", "sneakers", "boots", "sandals", "heels", "flats", "loafers",
        "pumps", "flip flops", "slippers", "oxfords", "clogs",
    ],
    "accessory": [
        "bags", "bag", "handbags", "backpacks", "watches", "belts", "sunglasses",
        "hats", "scarves", "jewelry", "necklaces", "earrings", "rings",
        "bracelets", "brooches", "ties", "eyewear", "gloves", "hair accessories",
        "wallet", "wallets", "clutches", "tote",
    ],
}

# Folder names in Re-PolyVore -> MVP slot (None = ignore for outfits).
FOLDER_SLOT: Dict[str, Optional[str]] = {
    "top": "top",
    "outwear": "top",
    "pants": "bottom",
    "skirt": "bottom",
    "shoes": "shoes",
    "bag": "accessory",
    "bracelet": "accessory",
    "brooch": "accessory",
    "earrings": "accessory",
    "eyewear": "accessory",
    "gloves": "accessory",
    "hairwear": "accessory",
    "hats": "accessory",
    "necklace": "accessory",
    "neckwear": "accessory",
    "rings": "accessory",
    "watches": "accessory",
    "dress": None,
    "jumpsuit": None,
    "legwear": None,
}

CORE_SLOTS = ("top", "bottom", "shoes")


def map_category_to_slot(name: Optional[str]) -> Optional[str]:
    if not name:
        return None
    low = name.lower()
    for slot, keywords in SLOT_KEYWORDS.items():
        if any(kw in low for kw in keywords):
            return slot
    return None


# ---------------------------------------------------------------------------
# Plot helpers
# ---------------------------------------------------------------------------
def _bar(series: pd.Series, title: str, path: Path, *, top: int = 30, rotate: int = 60) -> None:
    data = series.head(top)
    fig, ax = plt.subplots(figsize=(12, max(4, 0.28 * len(data) + 2)))
    ax.bar([str(i) for i in data.index], data.values, color="#2563EB")
    ax.set_title(title)
    ax.set_ylabel("count")
    plt.xticks(rotation=rotate, ha="right", fontsize=8)
    plt.tight_layout()
    fig.savefig(path, dpi=110)
    plt.close(fig)


def _hist(values: List[float], title: str, xlabel: str, path: Path, bins: int = 40) -> None:
    fig, ax = plt.subplots(figsize=(8, 4))
    ax.hist(values, bins=bins, color="#16A34A", edgecolor="white")
    ax.set_title(title)
    ax.set_xlabel(xlabel)
    ax.set_ylabel("count")
    plt.tight_layout()
    fig.savefig(path, dpi=110)
    plt.close(fig)


def _write_md(path: Path, title: str, sections: List[tuple[str, List[str]]]) -> None:
    lines = [f"# {title}", ""]
    for heading, bullets in sections:
        lines.append(f"## {heading}")
        lines.extend(f"- {b}" for b in bullets)
        lines.append("")
    path.write_text("\n".join(lines), encoding="utf-8")


# ---------------------------------------------------------------------------
# Fashion EDA
# ---------------------------------------------------------------------------
def run_fashion_eda(out_dir: Path, sample_images: int) -> Dict[str, Any]:
    labels = cu.load_labels()
    maps = fu.build_label_maps(labels)
    raw_dir = cu.fashion_raw_dir()
    styles_csv = raw_dir / "styles.csv"
    images_dir = raw_dir / "images"

    if not styles_csv.exists():
        raise FileNotFoundError(f"styles.csv not found at {styles_csv}")

    df = fu.read_styles(styles_csv)
    report: Dict[str, Any] = {
        "styles_csv": cu.to_posix(styles_csv),
        "images_dir": cu.to_posix(images_dir),
        "rows_raw": int(len(df)),
        "columns": list(df.columns),
        "dtypes": {c: str(t) for c, t in df.dtypes.items()},
        "missing_values": {c: int(v) for c, v in df.isna().sum().items()},
        "duplicate_ids": int(df["id"].duplicated().sum()) if "id" in df.columns else None,
        "gender_counts": {str(k): int(v) for k, v in df["gender"].value_counts().items()},
        "articleType_nunique": int(df["articleType"].nunique()),
        "baseColour_nunique": int(df["baseColour"].nunique()),
        "usage_nunique": int(df["usage"].nunique()),
        "usage_counts_raw": {str(k): int(v) for k, v in df["usage"].fillna("<NA>").value_counts().items()},
    }

    # Raw distributions (top 30).
    art_counts = df["articleType"].value_counts()
    colour_counts = df["baseColour"].value_counts()
    report["articleType_top30"] = {str(k): int(v) for k, v in art_counts.head(30).items()}
    report["baseColour_counts"] = {str(k): int(v) for k, v in colour_counts.items()}

    # Supported article types presence.
    supported = [e for e in labels["article_type"] if e.get("dataset")]
    report["supported_article_presence"] = {
        e["dataset"]: int(art_counts.get(e["dataset"], 0)) for e in supported
    }
    report["supported_article_missing"] = [
        e["dataset"] for e in supported if art_counts.get(e["dataset"], 0) == 0
    ]

    # Label mapping coverage on raw rows.
    mapped_art = df["articleType"].map(maps["article_ds_to_key"])
    unmapped_art = df.loc[mapped_art.isna() & df["articleType"].notna(), "articleType"]
    report["articleType_mapped_rows"] = int(mapped_art.notna().sum())
    report["articleType_other_rows"] = int(unmapped_art.shape[0])
    report["articleType_other_top15"] = {
        str(k): int(v) for k, v in unmapped_art.value_counts().head(15).items()
    }

    mapped_colour = df["baseColour"].map(maps["colour_ds_to_key"])
    unmapped_colour = df.loc[mapped_colour.isna() & df["baseColour"].notna(), "baseColour"]
    report["baseColour_mapped_rows"] = int(mapped_colour.notna().sum())
    report["baseColour_unmapped_rows"] = int(unmapped_colour.shape[0])
    report["baseColour_unmapped_values"] = {
        str(k): int(v) for k, v in unmapped_colour.value_counts().items()
    }

    mapped_usage = df["usage"].map(maps["usage_ds_to_key"])
    report["usage_mapped_rows"] = int(mapped_usage.notna().sum())
    report["usage_masked_rows"] = int(mapped_usage.isna().sum())
    report["usage_masked_values"] = {
        str(k): int(v) for k, v in df.loc[mapped_usage.isna(), "usage"].fillna("<NA>").value_counts().items()
    }

    # Image availability (all rows) + sampled corruption / size check.
    if images_dir.exists():
        paths = [images_dir / f"{i}.jpg" for i in df["id"]]
        exists = np.fromiter((p.exists() for p in paths), dtype=bool, count=len(paths))
        report["images_present"] = int(exists.sum())
        report["images_missing"] = int((~exists).sum())
    else:
        exists = np.zeros(len(df), dtype=bool)
        report["images_present"] = 0
        report["images_missing"] = int(len(df))

    from PIL import Image

    sample_n = min(sample_images, int(exists.sum()))
    sample_df = df[exists].sample(n=sample_n, random_state=42) if sample_n else df.iloc[0:0]
    widths: List[int] = []
    heights: List[int] = []
    modes: Counter = Counter()
    corrupt: List[str] = []
    for img_id in sample_df["id"]:
        p = images_dir / f"{img_id}.jpg"
        try:
            with Image.open(p) as im:
                widths.append(im.size[0])
                heights.append(im.size[1])
                modes[im.mode] += 1
        except Exception:
            corrupt.append(str(p))

    if widths:
        aspect = np.array(widths, dtype=float) / np.maximum(np.array(heights, dtype=float), 1)
        report["image_sample"] = {
            "n": int(len(widths)),
            "corrupt": len(corrupt),
            "corrupt_examples": corrupt[:10],
            "width_min": int(np.min(widths)),
            "width_max": int(np.max(widths)),
            "width_median": float(np.median(widths)),
            "height_min": int(np.min(heights)),
            "height_max": int(np.max(heights)),
            "height_median": float(np.median(heights)),
            "aspect_median": float(np.median(aspect)),
            "aspect_p05": float(np.percentile(aspect, 5)),
            "aspect_p95": float(np.percentile(aspect, 95)),
            "modes": {str(k): int(v) for k, v in modes.items()},
        }
        _hist(widths, "Fashion image widths (sample)", "width (px)", out_dir / "fashion_image_widths.png")
        _hist(
            aspect.tolist(),
            "Fashion image aspect ratio (sample)",
            "width / height",
            out_dir / "fashion_aspect_ratio.png",
        )

    # Clean frame (same logic as 01_prepare_fashion.py).
    clean, stats = fu.build_fashion_frame(
        styles_csv,
        images_dir,
        labels,
        other_class_max_samples=int(labels.get("other_class_max_samples", 4000)),
        seed=int(labels.get("seed", 42)),
    )
    report["cleaning_stats"] = stats
    report["clean_rows"] = int(len(clean))
    report["clean_article_type_counts"] = {
        str(k): int(v) for k, v in clean["article_type"].value_counts().items()
    }
    report["clean_base_colour_counts"] = {
        str(k): int(v) for k, v in clean["base_colour"].value_counts().items()
    }
    report["clean_usage_counts"] = {
        str(k): int(v) for k, v in clean["usage"].fillna("<masked>").value_counts().items()
    }
    report["clean_gender_counts"] = {
        str(k): int(v) for k, v in clean["gender"].value_counts().items()
    }
    report["class_imbalance_ratio_article"] = {
        "max": int(clean["article_type"].value_counts().max()),
        "min": int(clean["article_type"].value_counts().min()),
        "ratio": float(
            clean["article_type"].value_counts().max()
            / max(1, clean["article_type"].value_counts().min())
        ),
    }

    # Split preview.
    split_df = fu.stratified_split(clean, seed=int(labels.get("seed", 42)))
    report["split_sizes"] = {str(k): int(v) for k, v in split_df["split"].value_counts().items()}
    report["split_article_distribution"] = {
        split: {str(k): int(v) for k, v in g["article_type"].value_counts().items()}
        for split, g in split_df.groupby("split")
    }

    # Plots.
    _bar(art_counts, "Raw articleType distribution (top 30)", out_dir / "fashion_articleType.png")
    _bar(colour_counts, "Raw baseColour distribution", out_dir / "fashion_baseColour.png", rotate=70)
    _bar(
        df["usage"].fillna("<NA>").value_counts(),
        "Raw usage distribution",
        out_dir / "fashion_usage.png",
        rotate=30,
    )
    _bar(
        df["gender"].value_counts(),
        "Raw gender distribution",
        out_dir / "fashion_gender.png",
        top=10,
        rotate=0,
    )
    _bar(
        clean["article_type"].value_counts(),
        "Cleaned article_type distribution (24 classes)",
        out_dir / "fashion_clean_article_type.png",
        top=30,
    )

    # Markdown summary.
    sections = [
        (
            "Dataset",
            [
                f"styles.csv rows: {report['rows_raw']}",
                f"columns: {', '.join(report['columns'])}",
                f"duplicate ids: {report['duplicate_ids']}",
                f"images present: {report['images_present']} / {report['rows_raw']}",
                f"images missing: {report['images_missing']}",
            ],
        ),
        (
            "Raw label cardinality",
            [
                f"articleType unique: {report['articleType_nunique']}",
                f"baseColour unique: {report['baseColour_nunique']}",
                f"usage unique: {report['usage_nunique']}",
            ],
        ),
        (
            "Label mapping coverage",
            [
                f"articleType mapped: {report['articleType_mapped_rows']}, other: {report['articleType_other_rows']}",
                f"baseColour mapped: {report['baseColour_mapped_rows']}, unmapped(dropped): {report['baseColour_unmapped_rows']}",
                f"usage mapped: {report['usage_mapped_rows']}, masked: {report['usage_masked_rows']}",
            ],
        ),
        (
            "Cleaning",
            [f"{k}: {v}" for k, v in stats.items()],
        ),
        (
            "Final dataset",
            [
                f"clean rows: {report['clean_rows']}",
                f"split sizes: {report['split_sizes']}",
                f"article imbalance ratio (max/min): {report['class_imbalance_ratio_article']['ratio']:.1f}x",
            ],
        ),
    ]
    _write_md(out_dir / "fashion_eda.md", "Fashion Product Images - EDA", sections)
    (out_dir / "fashion_eda.json").write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    return report


# ---------------------------------------------------------------------------
# Polyvore EDA
# ---------------------------------------------------------------------------
def _load_category_map(path: Path) -> Dict[int, str]:
    out: Dict[int, str] = {}
    for line in path.read_text(encoding="utf-8", errors="ignore").splitlines():
        line = line.strip()
        if not line:
            continue
        parts = line.split(maxsplit=1)
        if len(parts) != 2:
            continue
        try:
            out[int(parts[0])] = parts[1].strip()
        except ValueError:
            continue
    return out


def _index_polyvore_images(root: Path) -> tuple[Dict[str, str], int]:
    """Map ``<set_id>_<index>.jpg`` -> category folder name."""
    index: Dict[str, str] = {}
    duplicates = 0
    if not root.exists():
        return index, duplicates
    for cat_dir in root.iterdir():
        if not cat_dir.is_dir():
            continue
        for f in cat_dir.iterdir():
            if f.suffix.lower() not in (".jpg", ".jpeg", ".png"):
                continue
            if f.name in index:
                duplicates += 1
            else:
                index[f.name] = cat_dir.name
    return index, duplicates


def run_polyvore_eda(out_dir: Path) -> Dict[str, Any]:
    raw_dir = cu.polyvore_raw_dir()
    report: Dict[str, Any] = {"polyvore_dir": cu.to_posix(raw_dir)}

    cat_map = _load_category_map(raw_dir / "category_id.txt")
    report["category_id_entries"] = len(cat_map)

    repolyvore = raw_dir / "Re-PolyVore"
    folder_index, duplicates = _index_polyvore_images(repolyvore)
    report["layout"] = {
        "expected_by_prd": "images/{set_id}/{index}.jpg",
        "actual": "Re-PolyVore/{category}/{set_id}_{index}.jpg",
        "prd_path_exists": (raw_dir / "images").exists(),
        "re_polyvore_exists": repolyvore.exists(),
        "n_indexed_images": len(folder_index),
        "duplicate_filenames": duplicates,
    }

    # Which category folders exist and their counts.
    folder_counts = {}
    if repolyvore.exists():
        for d in repolyvore.iterdir():
            if d.is_dir():
                folder_counts[d.name] = sum(1 for f in d.iterdir() if f.is_file())
    report["re_polyvore_folder_counts"] = dict(sorted(folder_counts.items()))

    split_reports: Dict[str, Any] = {}
    for split in ("train", "valid", "test"):
        path = raw_dir / f"{split}_no_dup.json"
        if not path.exists():
            report[f"{split}_missing"] = True
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
        n_outfits = len(data)
        items_per_outfit: List[int] = []
        unique_fnames: set[str] = set()
        categoryid_counter: Counter = Counter()
        slot_folder_counter: Counter = Counter()
        slot_cat_counter: Counter = Counter()
        core_complete_folder = 0
        core_complete_cat = 0
        image_missing = 0
        image_found = 0
        outfits_all_images_present = 0
        category_unmapped = 0
        category_slot_unmapped = 0
        total_item_refs = 0

        for entry in data:
            set_id = str(entry.get("set_id"))
            items = entry.get("items", [])
            items_per_outfit.append(len(items))
            present_folder_slots: set[str] = set()
            present_cat_slots: set[str] = set()
            missing_in_outfit = 0
            for item in items:
                total_item_refs += 1
                idx = item.get("index")
                fname = f"{set_id}_{idx}.jpg"
                unique_fnames.add(fname)

                folder = folder_index.get(fname)
                if folder is None:
                    image_missing += 1
                    missing_in_outfit += 1
                else:
                    image_found += 1
                slot_folder = FOLDER_SLOT.get(folder) if folder else None
                if slot_folder:
                    slot_folder_counter[slot_folder] += 1
                    present_folder_slots.add(slot_folder)

                cid = item.get("categoryid")
                categoryid_counter[cid] += 1
                cat_name = cat_map.get(cid)
                if cat_name is None:
                    category_unmapped += 1
                    slot_cat = None
                else:
                    slot_cat = map_category_to_slot(cat_name)
                    if slot_cat is None:
                        category_slot_unmapped += 1
                if slot_cat:
                    slot_cat_counter[slot_cat] += 1
                    present_cat_slots.add(slot_cat)

            if all(s in present_folder_slots for s in CORE_SLOTS):
                core_complete_folder += 1
            if all(s in present_cat_slots for s in CORE_SLOTS):
                core_complete_cat += 1
            if missing_in_outfit == 0:
                outfits_all_images_present += 1

        top_cats = {
            f"{cid}:{cat_map.get(cid, '?')}": int(c)
            for cid, c in categoryid_counter.most_common(15)
        }
        split_reports[split] = {
            "n_outfits": n_outfits,
            "total_item_refs": total_item_refs,
            "unique_items": len(unique_fnames),
            "items_per_outfit_mean": float(np.mean(items_per_outfit)) if items_per_outfit else 0.0,
            "items_per_outfit_median": float(np.median(items_per_outfit)) if items_per_outfit else 0.0,
            "items_per_outfit_min": int(np.min(items_per_outfit)) if items_per_outfit else 0,
            "items_per_outfit_max": int(np.max(items_per_outfit)) if items_per_outfit else 0,
            "images_missing": image_missing,
            "images_found": image_found,
            "image_coverage_pct": round(100 * image_found / max(1, total_item_refs), 2),
            "outfits_all_images_present": outfits_all_images_present,
            "categoryid_unmapped": category_unmapped,
            "category_slot_unmapped": category_slot_unmapped,
            "slot_counts_folder": {k: int(v) for k, v in slot_folder_counter.items()},
            "slot_counts_category": {k: int(v) for k, v in slot_cat_counter.items()},
            "outfits_core_complete_folder": core_complete_folder,
            "outfits_core_complete_category": core_complete_cat,
            "outfits_core_complete_folder_pct": round(100 * core_complete_folder / max(1, n_outfits), 2),
            "top_categoryids": top_cats,
        }

        if split == "train" and items_per_outfit:
            _hist(
                items_per_outfit,
                "Polyvore train — items per outfit",
                "items",
                out_dir / "polyvore_items_per_outfit.png",
                bins=range(0, max(items_per_outfit) + 2),
            )
            _bar(
                pd.Series(slot_folder_counter).sort_values(ascending=False),
                "Polyvore train — slot distribution (folder mapping)",
                out_dir / "polyvore_slot_distribution.png",
                top=10,
                rotate=0,
            )

    report["splits"] = split_reports

    # Optional compatibility-label file (7076 outfit rows, 0/1 label + item stems).
    compat_path = raw_dir / "fashion_compatibility_prediction.txt"
    if compat_path.exists():
        tokens_total = 0
        tokens_found = 0
        rows = 0
        found_stems = set()
        for line in compat_path.read_text(encoding="utf-8", errors="ignore").splitlines():
            parts = line.split()
            if len(parts) < 2:
                continue
            rows += 1
            for tok in parts[1:]:
                tokens_total += 1
                if f"{tok}.jpg" in folder_index:
                    tokens_found += 1
                    found_stems.add(tok)
        report["fashion_compatibility"] = {
            "rows": rows,
            "tokens_total": tokens_total,
            "tokens_found": tokens_found,
            "token_coverage_pct": round(100 * tokens_found / max(1, tokens_total), 2),
            "unique_stems_referenced": len(found_stems),
        }

    # Markdown summary.
    sections = [
        (
            "Layout",
            [
                f"PRD expected: {report['layout']['expected_by_prd']}",
                f"actual: {report['layout']['actual']}",
                f"PRD path exists: {report['layout']['prd_path_exists']}",
                f"indexed images: {report['layout']['n_indexed_images']}",
                f"category_id entries: {report['category_id_entries']}",
            ],
        )
    ]
    if "fashion_compatibility" in report:
        fc = report["fashion_compatibility"]
        sections.append(
            (
                "Compatibility labels",
                [
                    f"rows: {fc['rows']}",
                    f"item token coverage: {fc['tokens_found']}/{fc['tokens_total']} ({fc['token_coverage_pct']}%)",
                ],
            )
        )
    for split, sr in split_reports.items():
        sections.append(
            (
                f"{split} split",
                [
                    f"outfits: {sr['n_outfits']}",
                    f"item refs: {sr['total_item_refs']} (unique {sr['unique_items']})",
                    f"items/outfit mean/median: {sr['items_per_outfit_mean']:.2f} / {sr['items_per_outfit_median']:.1f}",
                    f"images found: {sr['images_found']} ({sr['image_coverage_pct']}%), missing: {sr['images_missing']}",
                    f"outfits with all images available: {sr['outfits_all_images_present']}",
                    f"categoryid unmapped: {sr['categoryid_unmapped']}",
                    f"outfits with core slots & images (usable positives): {sr['outfits_core_complete_folder']} ({sr['outfits_core_complete_folder_pct']}%)",
                    f"outfits with core slots (category only): {sr['outfits_core_complete_category']}",
                    f"slot counts (folder): {sr['slot_counts_folder']}",
                ],
            )
        )
    _write_md(out_dir / "polyvore_eda.md", "Polyvore (Re-PolyVore) - EDA", sections)
    (out_dir / "polyvore_eda.json").write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    return report


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
def main() -> None:
    parser = argparse.ArgumentParser(description="EDA for Fashion + Polyvore datasets")
    parser.add_argument("--out-dir", default=None, help="output directory (default artifacts/eda)")
    parser.add_argument("--sample-images", type=int, default=3000, help="images to inspect for size/corruption")
    parser.add_argument("--skip-fashion", action="store_true")
    parser.add_argument("--skip-polyvore", action="store_true")
    args = parser.parse_args()

    out_dir = Path(args.out_dir) if args.out_dir else cu.artifact_dir() / "eda"
    cu.ensure_dir(out_dir)
    print(f"[eda] writing to {cu.to_posix(out_dir)}")

    if not args.skip_fashion:
        print("[eda] fashion dataset ...")
        rep = run_fashion_eda(out_dir, args.sample_images)
        print(f"[eda] fashion clean rows: {rep['clean_rows']}")

    if not args.skip_polyvore:
        print("[eda] polyvore dataset ...")
        rep = run_polyvore_eda(out_dir)
        print(f"[eda] polyvore splits: {list(rep.get('splits', {}).keys())}")

    print("[eda] done")


if __name__ == "__main__":
    main()
