from pydantic import BaseModel, ConfigDict, Field


class DuesPayerDeleteRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    confirmation: str = Field(min_length=1, max_length=20)
