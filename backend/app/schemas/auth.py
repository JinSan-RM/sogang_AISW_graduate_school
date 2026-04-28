from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class EmailVerificationRequest(BaseModel):
    email: EmailStr


class EmailVerificationConfirm(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6)


class RegisterRequest(BaseModel):
    verification_token: str
    password: str
    nickname: str = Field(min_length=1, max_length=50)
    cohort: str = Field(min_length=1, max_length=20)
    major: str | None = None
    phone: str | None = None


class RefreshRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: str


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str
