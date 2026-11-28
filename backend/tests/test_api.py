from __future__ import annotations

import io
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from PIL import Image

from app.config import BACKEND_ROOT, Settings
from app.main import create_app


@pytest.fixture(scope="session")
def client(tmp_path_factory: pytest.TempPathFactory):
    root = tmp_path_factory.mktemp("neurfit-backend")
    settings = Settings(
        database_url=f"sqlite:///{(root / 'test.db').as_posix()}",
        upload_dir=str(root / "uploads"),
        model_dir=str((BACKEND_ROOT / "models").resolve()),
        demo_dir=str((BACKEND_ROOT / "demo_assets").resolve()),
        scorer_backend="mlp",
    )
    app = create_app(settings)
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(scope="session")
def seeded_client(client: TestClient):
    response = client.post("/api/v1/items/seed-demo")
    assert response.status_code == 201, response.text
    return client


def jpeg_bytes(size=(240, 320), colour=(30, 60, 120)) -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", size, colour).save(buffer, "JPEG")
    return buffer.getvalue()


def test_health_and_labels(client: TestClient) -> None:
    health = client.get("/api/v1/health")
    assert health.status_code == 200
    assert health.json()["models_loaded"] is True
    labels = client.get("/api/v1/meta/labels")
    assert labels.status_code == 200
    body = labels.json()
    assert body["labels_version"] == "labels-v1"
    assert len(body["article_types"]) == 24
    assert {entry["key"] for entry in body["slots"]} == {"top", "bottom", "shoes", "accessory"}


def test_seed_demo_and_recommend(seeded_client: TestClient) -> None:
    items = seeded_client.get("/api/v1/items")
    assert items.status_code == 200
    body = items.json()
    assert body["counts_by_slot"] == {"top": 4, "bottom": 4, "shoes": 3, "accessory": 1}
    anchor = next(item for item in body["items"] if item["slot"] == "top")
    response = seeded_client.post(
        "/api/v1/outfits/recommend",
        json={
            "anchor_item_id": anchor["id"],
            "usage": None,
            "top_k": 5,
            "strict_usage": False,
            "include_accessory": True,
        },
    )
    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["anchor"]["id"] == anchor["id"]
    assert len(payload["recommendations"]) >= 1
    scores = [entry["score"] for entry in payload["recommendations"]]
    assert scores == sorted(scores, reverse=True)
    for recommendation in payload["recommendations"]:
        assert {item["slot"] for item in recommendation["items"]} >= {"top", "bottom", "shoes"}


def test_analyze_save_delete(client: TestClient) -> None:
    sample_path = BACKEND_ROOT / "demo_assets" / "demo_top_tshirt.jpg"
    response = client.post(
        "/api/v1/items/analyze",
        files={"file": (sample_path.name, sample_path.read_bytes(), "image/jpeg")},
    )
    assert response.status_code == 200, response.text
    analysis = response.json()
    assert analysis["supported"] is True
    article = analysis["predictions"]["article_type"]["label"]
    if article == "other":
        article = "tshirt"
    save = client.post(
        "/api/v1/items",
        json={
            "temp_id": analysis["temp_id"],
            "article_type": article,
            "base_colour": analysis["predictions"]["base_colour"]["label"],
            "usage": analysis["predictions"]["usage"]["label"],
        },
    )
    assert save.status_code == 201, save.text
    item = save.json()
    assert item["image_url"].startswith("/uploads/items/")
    assert client.get(item["image_url"]).status_code == 200
    assert client.delete(f"/api/v1/items/{item['id']}").status_code == 204
    assert client.delete(f"/api/v1/items/{item['id']}").status_code == 404


def test_rejects_non_image(client: TestClient) -> None:
    response = client.post(
        "/api/v1/items/analyze",
        files={"file": ("notes.txt", b"hello", "text/plain")},
    )
    assert response.status_code == 415
    assert response.json()["error"]["code"] == "UNSUPPORTED_MEDIA_TYPE"


def test_recommend_missing_slots(seeded_client: TestClient) -> None:
    client = seeded_client
    items = client.get("/api/v1/items").json()["items"]
    anchor = next(item for item in items if item["slot"] == "top")
    for item in items:
        if item["id"] != anchor["id"]:
            client.delete(f"/api/v1/items/{item['id']}")
    response = client.post(
        "/api/v1/outfits/recommend",
        json={"anchor_item_id": anchor["id"], "top_k": 3},
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "INSUFFICIENT_ITEMS"
    client.post("/api/v1/items/seed-demo")
