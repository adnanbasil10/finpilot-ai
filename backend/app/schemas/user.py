"""Pydantic schemas for Users and Authentication."""

from pydantic import BaseModel, EmailStr, Field


# ── Auth Requests ────────────────────────────────────────────────
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    full_name: str = Field(..., min_length=1, max_length=150)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


# ── Auth Responses ───────────────────────────────────────────────
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str

    model_config = {"from_attributes": True}
