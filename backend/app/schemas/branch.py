from __future__ import annotations
from uuid import UUID
from datetime import time
from pydantic import BaseModel, Field, ConfigDict
from backend.app.schemas.common import OrmBase

class BranchCreate(BaseModel):
    code: str
    name: str
    closing_time_local: time | None = Field(None, description="Local closing time, e.g. 20:00")
    report_send_offset_minutes: int | None = Field(None, ge=0)

class BranchUpdate(BaseModel):
    name: str | None = None
    closing_time_local: time | None = None
    report_send_offset_minutes: int | None = Field(None, ge=0)
    is_active: bool | None = None

class BranchOut(OrmBase):
    id: UUID
    code: str
    name: str
    closing_time_local: time
    report_send_offset_minutes: int
    is_active: bool
