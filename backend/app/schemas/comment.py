from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

COMMENT_MAX_LENGTH = 500


class CommentMutationBase(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    content: str = Field(min_length=1, max_length=COMMENT_MAX_LENGTH)


class CommentCreate(CommentMutationBase):
    parent_id: int | None = None


class CommentUpdate(CommentMutationBase):
    pass


class CommentNode(BaseModel):
    id: int
    post_id: int
    author_id: int | None
    author_nickname: str
    parent_id: int | None = None
    content: str
    created_at: datetime
    updated_at: datetime
    children: list["CommentNode"] = Field(default_factory=list)


CommentNode.model_rebuild()
