from pydantic import BaseModel, Field
from typing import Literal


class ReportCreate(BaseModel):
    reason: str = Field(min_length=1, max_length=50)
    detail: str | None = Field(default=None, max_length=1000)


class ReportStatusUpdate(BaseModel):
    status: Literal["open", "reviewing", "resolved", "dismissed"]
