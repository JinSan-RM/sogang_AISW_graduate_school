from pydantic import BaseModel, Field, model_validator
from typing import Literal


class ReportCreate(BaseModel):
    reason: str = Field(min_length=1, max_length=50)
    detail: str | None = Field(default=None, max_length=1000)

    @model_validator(mode="after")
    def require_detail_for_other(self):
        # "기타" 사유는 구체적인 내용이 없으면 관리자가 검토할 수 없다.
        if self.reason == "other" and not (self.detail or "").strip():
            raise ValueError("A specific reason is required when reporting with 'other'.")
        return self


class ReportStatusUpdate(BaseModel):
    status: Literal["open", "reviewing", "resolved", "dismissed"]
