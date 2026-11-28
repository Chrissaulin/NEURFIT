from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(BACKEND_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    database_url: str = f"sqlite:///{(BACKEND_ROOT / 'smartwardrobe.db').as_posix()}"
    upload_dir: str = str(BACKEND_ROOT / "uploads")
    model_dir: str = str(BACKEND_ROOT / "models")
    demo_dir: str = str(BACKEND_ROOT / "demo_assets")

    max_upload_mb: int = 8
    confidence_threshold: float = 0.6
    max_candidates: int = 1500
    scorer_backend: str = "mlp"

    cors_origins: str = "http://localhost:5173"
    host: str = "127.0.0.1"
    port: int = 8000

    @staticmethod
    def _resolve(value: str | Path) -> Path:
        path = Path(value)
        if not path.is_absolute():
            path = BACKEND_ROOT / path
        return path.resolve()

    @property
    def upload_path(self) -> Path:
        return self._resolve(self.upload_dir)

    @property
    def model_path(self) -> Path:
        return self._resolve(self.model_dir)

    @property
    def demo_path(self) -> Path:
        return self._resolve(self.demo_dir)

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
