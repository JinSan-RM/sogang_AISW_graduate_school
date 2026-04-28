from pydantic import BaseModel, Field


class ReportCreate(BaseModel):
    reason: str = Field(min_length=1, max_length=50)
    detail: str | None = Field(default=None, max_length=1000)
