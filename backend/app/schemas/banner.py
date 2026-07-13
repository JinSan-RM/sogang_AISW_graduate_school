from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class BannerCreate(BaseModel):
    placement: Literal["home"] = "home"
    title: str | None = Field(default=None, max_length=120)
    subtitle: str | None = None
    badge_text: str | None = Field(default=None, max_length=80)
    cta_label: str | None = Field(default=None, max_length=50)
    cta_href: str | None = Field(default=None, max_length=255)
    image_url: str | None = Field(default=None, max_length=500)
    image_urls: dict[str, str] | None = None
    theme: Literal["none", "blue", "navy", "cyan", "purple"] = "blue"
    sort_order: int = 0
    is_active: bool = True
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    deadline_at: datetime | None = None


class BannerUpdate(BaseModel):
    placement: Literal["home"] | None = None
    title: str | None = Field(default=None, max_length=120)
    subtitle: str | None = None
    badge_text: str | None = Field(default=None, max_length=80)
    cta_label: str | None = Field(default=None, max_length=50)
    cta_href: str | None = Field(default=None, max_length=255)
    image_url: str | None = Field(default=None, max_length=500)
    image_urls: dict[str, str] | None = None
    theme: Literal["none", "blue", "navy", "cyan", "purple"] | None = None
    sort_order: int | None = None
    is_active: bool | None = None
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    deadline_at: datetime | None = None
