from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class EmailVerificationRequest(BaseModel):
    email: EmailStr


class EmailVerificationConfirm(BaseModel):
    email: EmailStr
    code: str = Field(pattern=r"^\d{6}$")


class RegisterRequest(BaseModel):
    verification_token: str
    password: str
    nickname: str = Field(min_length=1, max_length=50)
    cohort: str = Field(pattern=r"^\d{1,3}$")
    major: str = Field(min_length=1, max_length=100)
    phone: str = Field(pattern=r"^01[016789]\d{7,8}$")
    privacy_policy_version: str = Field(min_length=1, max_length=50)
    privacy_consent: bool
    company: str | None = None
    job_title: str | None = None
    position: str | None = None


class RefreshRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: str


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetVerify(BaseModel):
    email: EmailStr
    code: str = Field(pattern=r"^\d{6}$")


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str
