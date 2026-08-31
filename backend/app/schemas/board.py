from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


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
ACTIVITY_IMAGE_LAYOUT_KEY = "activity_image_layout"


class ActivityImageLayoutRule(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    max_width: int | None = Field(ge=120, le=1600)
    height: int | None = Field(ge=120, le=1600)
    max_height: int | None = Field(ge=120, le=2000)
    fit: Literal["contain", "cover"]
    expandable: bool

    @model_validator(mode="after")
    def validate_height_limit(self) -> "ActivityImageLayoutRule":
        if self.height is not None and self.max_height is not None:
            raise ValueError("max_height must be null when height is set")
        return self


class ActivityImageLayout(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    version: Literal[1]
    default: ActivityImageLayoutRule
    landscape: ActivityImageLayoutRule | None
    portrait: ActivityImageLayoutRule | None

    @field_validator("version", mode="before")
    @classmethod
    def validate_version_type(cls, value: object) -> object:
        if type(value) is not int or value != 1:
            raise ValueError("version must be the integer 1")
        return value


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

    @field_validator("board_type")
    @classmethod
    def validate_board_type_is_not_null(cls, value: BoardType | None) -> BoardType:
        if value is None:
            raise ValueError("board_type cannot be null")
        return value
