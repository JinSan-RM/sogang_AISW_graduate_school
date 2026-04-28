from datetime import datetime

from pydantic import BaseModel, Field


class CommentCreate(BaseModel):
    content: str
    parent_id: int | None = None


class CommentUpdate(BaseModel):
    content: str


class CommentNode(BaseModel):
    id: int
    post_id: int
    author_id: int
    author_nickname: str
    parent_id: int | None = None
    content: str
    created_at: datetime
    updated_at: datetime
    children: list["CommentNode"] = Field(default_factory=list)


CommentNode.model_rebuild()
