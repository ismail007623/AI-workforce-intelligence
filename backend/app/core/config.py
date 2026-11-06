from datetime import time
from functools import lru_cache
from zoneinfo import ZoneInfo

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Database — override via DATABASE_URL in .env
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/attendance_db"

    # Office hours (non-secret)
    office_start_time: str = "10:00"
    grace_period_end: str = "10:15"
    late_after: str = "10:16"
    office_end_time: str = "19:00"
    timezone: str = "Asia/Karachi"

    # OpenAI — set OPENAI_API_KEY in .env
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    openai_embedding_model: str = "text-embedding-3-small"

    # Pinecone — set PINECONE_API_KEY in .env
    pinecone_api_key: str = ""
    pinecone_index_name: str = "company-policy"
    # DEPRECATED: the old shared namespace. Kept only so the
    # one-time migration knows which namespace to copy from.
    # Uploads, queries and counts use the per-org namespace
    # stored on the Organization row instead.
    pinecone_namespace: str = "company-policy"
    policy_max_upload_bytes: int = 10_485_760
    policy_storage_dir: str = "storage/policies"

    # SMTP — set SMTP_USER / SMTP_PASSWORD / SMTP_FROM in .env
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = ""
    hr_notify_email: str = ""

    # JWT authentication (no default secret: auth fails fast when unset).
    jwt_secret_key: str = ""
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7

    # Reliability scoring (non-secret)
    reliability_late_penalty: int = 3
    reliability_absence_penalty: int = 5
    reliability_weak_penalty: int = 4
    reliability_invalid_penalty: int = 8
    reliability_risk_cap: int = 20
    high_risk_reason_threshold: int = 5

    concern_weak_weight: float = 0.25
    concern_invalid_weight: float = 0.50

    @property
    def tz(self) -> ZoneInfo:
        return ZoneInfo(self.timezone)

    def parse_time(self, value: str) -> time:
        parts = value.strip().split(":")
        hour = int(parts[0])
        minute = int(parts[1]) if len(parts) > 1 else 0
        return time(hour=hour, minute=minute)

    @property
    def office_start(self) -> time:
        return self.parse_time(self.office_start_time)

    @property
    def grace_end(self) -> time:
        return self.parse_time(self.grace_period_end)

    @property
    def late_threshold(self) -> time:
        return self.parse_time(self.late_after)

    @property
    def office_end(self) -> time:
        return self.parse_time(self.office_end_time)

    @property
    def hr_email(self) -> str:
        return self.hr_notify_email or self.smtp_user

    @property
    def sync_database_url(self) -> str:
        return self.database_url.replace("+asyncpg", "")


@lru_cache
def get_settings() -> Settings:
    return Settings()
