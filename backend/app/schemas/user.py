from pydantic import BaseModel, EmailStr


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
    nickname: str | None = None
    cohort: str | None = None
    major: str | None = None
    phone: str | None = None
    company: str | None = None
    job_title: str | None = None
    position: str | None = None
    profile_image_url: str | None = None


class UserPasswordUpdate(BaseModel):
    current_password: str
    new_password: str


class UserDeactivateRequest(BaseModel):
    reason: str | None = None
