from __future__ import annotations
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel
from .common import OrmBase

class UserBase(OrmBase):
    username: str
    role: str
    branch_id: UUID | None = None
    is_active: bool | None = True

class UserCreate(UserBase):
    password: str

class UserOut(UserBase):
    id: UUID
    created_at: datetime

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: str | None = None