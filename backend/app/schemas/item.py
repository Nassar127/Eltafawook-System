from typing import Literal, Annotated
from uuid import UUID
from pydantic import BaseModel, Field

ResourceType = Literal["book", "code", "other"]
NonNegInt = Annotated[int, Field(ge=0)]

class ItemCreate(BaseModel):
    sku: str
    name: str
    description: str | None = None
    resource_type: ResourceType
    grade: Annotated[int, Field(ge=1, le=3)]
    teacher_id: UUID | None = None
    default_price_cents: NonNegInt | None = None

class ItemOut(BaseModel):
    id: UUID
    sku: str
    name: str
    description: str | None = None
    resource_type: ResourceType
    grade: int
    teacher_id: UUID | None = None
    default_price_cents: NonNegInt
