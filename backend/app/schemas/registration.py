from datetime import datetime

from pydantic import BaseModel, Field


class MajorOptionCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    sort_order: int = Field(default=0, ge=0, le=10000)


class MajorOptionUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    sort_order: int = Field(ge=0, le=10000)
    is_active: bool


class PrivacyPolicyUpdate(BaseModel):
    version: str = Field(min_length=1, max_length=50)
    effective_at: datetime
