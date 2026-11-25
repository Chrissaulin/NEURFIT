"""Shared configuration & path helpers for the Smart Wardrobe ML pipeline.

Data and artifact locations are resolved from environment variables so the very
same flat scripts run on a local machine (VS Code + .venv) and on Google Colab:

    SW_DATA_DIR      default: ml/data
    SW_ARTIFACT_DIR  default: ml/artifacts

Run the scripts from the ``ml/`` directory.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict

import yaml

ML_DIR = Path(__file__).resolve().parent


def data_dir() -> Path:
    """Root directory holding the raw/processed datasets."""
    return Path(os.environ.get("SW_DATA_DIR", ML_DIR / "data")).resolve()


def artifact_dir() -> Path:
    """Root directory for models, metrics and reports."""
    return Path(os.environ.get("SW_ARTIFACT_DIR", ML_DIR / "artifacts")).resolve()


def configs_dir() -> Path:
    return ML_DIR / "configs"


def load_yaml(path: str | os.PathLike[str]) -> Dict[str, Any]:
    path = Path(path)
    if not path.is_absolute():
        path = configs_dir() / path
    with open(path, "r", encoding="utf-8") as fh:
        return yaml.safe_load(fh)


def load_config(name: str) -> Dict[str, Any]:
    """Load ``ml/configs/<name>`` (a ``.yaml`` suffix is optional)."""
    if not name.endswith((".yaml", ".yml")):
        name += ".yaml"
    return load_yaml(name)


def load_labels() -> Dict[str, Any]:
    """Load the single source of truth for the label taxonomy."""
    return load_yaml("labels.yaml")


def ensure_dir(path: str | os.PathLike[str]) -> Path:
    path = Path(path)
    path.mkdir(parents=True, exist_ok=True)
    return path


def fashion_raw_dir() -> Path:
    return data_dir() / "fashionProduct"


def polyvore_raw_dir() -> Path:
    return data_dir() / "polyvore"


def fashion_processed_dir() -> Path:
    return data_dir() / "processed"


def to_posix(path: str | os.PathLike[str]) -> str:
    """Normalise a path to forward slashes (Windows parity, R-03)."""
    return Path(path).as_posix()
