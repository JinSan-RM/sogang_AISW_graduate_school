from pydantic import BaseModel, ConfigDict, EmailStr, Field
from typing import Literal


class UserMeResponse(BaseModel):
    id: int
    nickname: str
    cohort: str | None = None
    major: str | None = None
    phone: str | None = None
    company: str | None = None
    job_title: str | None = None
    position: str | None = None
    email: EmailStr
    role: str


class UserMeUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    major: str | None = None
    phone: str | None = None
    company: str | None = None
    job_title: str | None = None
    position: str | None = None
    profile_image_url: str | None = None


class UserPasswordUpdate(BaseModel):
    current_password: str
    new_password: str


class UserPasswordVerify(BaseModel):
    current_password: str


class UserDeleteRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    current_password: str = Field(min_length=1, max_length=1024)


class UserBlockCreate(BaseModel):
    blocked_user_id: int
    reason: str | None = Field(default=None, max_length=500)


class UserBlockItem(BaseModel):
    id: int
    blocked_user_id: int
    blocked_user_nickname: str
    reason: str | None = None
    created_at: str


class AdminUserUpdate(BaseModel):
    role: Literal["user", "admin"] | None = None
    is_active: bool | None = None
    enrollment_status: Literal["active", "leave", "graduated"] | None = None
    dues_status: Literal["paid", "unpaid", "exempt"] | None = None
