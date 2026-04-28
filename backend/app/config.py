from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://postgres:postgres@db:5432/sogang_app"
    app_name: str = "Sogang AI-SW Community API"
    app_version: str = "0.1.0"
    auth_secret_key: str = "change-me-in-production"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 30
    email_verification_expire_minutes: int = 10
    password_reset_expire_minutes: int = 30
    dev_auth_codes: bool = True
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_from_email: str = "no-reply@sogang-ai-sw.local"
    smtp_use_tls: bool = True
    expo_push_enabled: bool = True

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
