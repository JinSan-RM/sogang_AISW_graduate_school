from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    app_environment: str = "development"
    database_url: str = "postgresql+psycopg://postgres:postgres@db:5432/sogang_app"
    app_name: str = "Sogang AI-SW Community API"
    app_version: str = "0.1.0"
    auth_secret_key: str = "change-me-in-production"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 30
    email_verification_expire_minutes: int = 5
    email_verification_resend_cooldown_seconds: int = 5 * 60
    password_reset_expire_minutes: int = 5
    password_reset_resend_cooldown_seconds: int = 5 * 60
    # Deprecated compatibility flag. Authentication codes are never returned by the API.
    dev_auth_codes: bool = False
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_from_email: str = "no-reply@sogang-ai-sw.local"
    smtp_use_tls: bool = True
    smtp_required: bool = False
    expo_push_enabled: bool = True
    rate_limit_enabled: bool = True
    rate_limit_trust_proxy: bool = False
    support_email: str | None = None
    cors_origin_regex: str = r"^https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$"

    def validate_runtime(self) -> None:
        if self.app_environment.lower() != "production":
            return
        if self.auth_secret_key == "change-me-in-production" or len(self.auth_secret_key) < 32:
            raise RuntimeError("Production AUTH_SECRET_KEY must be a non-default value with at least 32 characters.")
        if not self.smtp_required or not self.smtp_host:
            raise RuntimeError("Production SMTP must be configured and SMTP_REQUIRED must be true.")
        if "localhost" in self.cors_origin_regex:
            raise RuntimeError("Production CORS_ORIGIN_REGEX must explicitly target the deployed frontend origin.")

    model_config = SettingsConfigDict(env_file=BACKEND_ROOT / ".env", env_file_encoding="utf-8")


settings = Settings()
