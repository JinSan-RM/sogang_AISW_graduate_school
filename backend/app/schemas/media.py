from datetime import datetime

from pydantic import BaseModel


class MediaAssetPayload(BaseModel):
    id: int
    original_filename: str
    stored_filename: str
    content_type: str
    file_size: int
    url: str
    access_url: str
    is_private: bool
    status: str
    created_at: datetime


class MediaAccessUrlPayload(BaseModel):
    url: str
    expires_in: int
