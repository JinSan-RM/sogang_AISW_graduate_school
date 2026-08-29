from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class EventCreate(BaseModel):
    title: str
    description: str | None = None
    location: str | None = None
    category: Literal["academic", "event", "other"]
    color: str | None = None
    start_at: datetime
    end_at: datetime | None = None


class EventUpdate(EventCreate):
    pass
