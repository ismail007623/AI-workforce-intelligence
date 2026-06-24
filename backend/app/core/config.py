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

    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/attendance_db"
    office_start_time: str = "10:00"
    grace_period_end: str = "10:15"
    late_after: str = "10:16"
    office_end_time: str = "19:00"
    timezone: str = "Asia/Karachi"

    openai_api_key: str = "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"
    openai_model: str = "gpt-4o-mini"
    openai_embedding_model: str = "text-embedding-3-small"

    pinecone_api_key: str = ""
    pinecone_index_name: str = "company-policy"
    pinecone_namespace: str = "company-policy"
    policy_max_upload_bytes: int = 10_485_760

    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = '587'
    smtp_user: str = "ismail.haider@xevensolutions.com"
    smtp_password: str = "bfgn plgq pmhv dczx"
    smtp_from: str = "ismail.haider@xevensolutions.com"

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
    def sync_database_url(self) -> str:
        return self.database_url.replace("+asyncpg", "")


@lru_cache
def get_settings() -> Settings:
    return Settings()
