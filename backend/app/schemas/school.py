from uuid import UUID
from pydantic import BaseModel

class SchoolCreate(BaseModel):
    name: str
    city: str | None = None

class SchoolOut(BaseModel):
    id: UUID
    name: str
    city: str | None = None
