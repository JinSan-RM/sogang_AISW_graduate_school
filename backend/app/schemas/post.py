from datetime import datetime

from pydantic import BaseModel, Field


class PostCreate(BaseModel):
    title: str
    content: str
    is_anonymous: bool = False
    category: str | None = None
    metadata: dict | None = None
    attachment_ids: list[int] = Field(default_factory=list)


class PostUpdate(BaseModel):
    title: str
    content: str
    is_anonymous: bool = False
    category: str | None = None
    metadata: dict | None = None
    attachment_ids: list[int] | None = None


class SuggestionUpdate(BaseModel):
    status: str = Field(pattern="^(received|reviewing|answered|closed)$")
    admin_reply: str | None = None


class PostListItem(BaseModel):
    id: int
    board_id: int
    title: str
    content_preview: str
    author_id: int
    author_nickname: str
    is_pinned: bool
    is_notice: bool
    view_count: int
    like_count: int
    comment_count: int
    created_at: datetime


class PostDetail(BaseModel):
    id: int
    board_id: int
    title: str
    content: str
    author_id: int
    author_nickname: str
    is_pinned: bool
    is_notice: bool
    view_count: int
    like_count: int
    comment_count: int
    is_liked: bool
    is_bookmarked: bool
    created_at: datetime
    updated_at: datetime
