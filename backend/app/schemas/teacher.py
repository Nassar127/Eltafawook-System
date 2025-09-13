from uuid import UUID
from typing import Literal
from pydantic import BaseModel

class TeacherCreate(BaseModel):
    name: str
    subject: str

class TeacherOut(BaseModel):
    id: UUID
    name: str
    subject: str
