from datetime import datetime

from pydantic import BaseModel


class EventCreate(BaseModel):
    title: str
    description: str | None = None
    location: str | None = None
    category: str
    color: str | None = None
    start_at: datetime
    end_at: datetime | None = None


class EventUpdate(EventCreate):
    pass
