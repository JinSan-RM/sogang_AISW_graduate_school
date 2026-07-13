from typing import Literal

from pydantic import BaseModel, Field


BoardType = Literal[
    "post",
    "notice",
    "calendar",
    "album",
    "resource",
    "activity_certification",
    "guide",
    "faq",
    "organization_intro",
    "activity_history",
    "external_link",
    "suggestion",
    "mutual_aid",
]
Permission = Literal["guest", "user", "admin"]


class BoardAdminCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    slug: str = Field(min_length=1, max_length=100, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    category: str = Field(min_length=1, max_length=50)
    board_type: BoardType = "post"
    description: str | None = None
    sort_order: int = 0
    allow_anonymous: bool = False
    read_permission: Permission = "user"
    write_permission: Permission = "user"
    metadata: dict | None = None
    is_active: bool = True


class BoardAdminUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    category: str | None = Field(default=None, min_length=1, max_length=50)
    board_type: BoardType | None = None
    description: str | None = None
    sort_order: int | None = None
    allow_anonymous: bool | None = None
    read_permission: Permission | None = None
    write_permission: Permission | None = None
    metadata: dict | None = None
    is_active: bool | None = None
