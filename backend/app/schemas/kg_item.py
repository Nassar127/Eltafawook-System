from uuid import UUID
from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict

KgItemType = Literal['good', 'service']

class KgItemBase(BaseModel):
    sku: str
    name: str
    default_price_cents: int
    item_type: KgItemType

class KgItemCreate(KgItemBase):
    branch_id: UUID

class KgItemUpdate(BaseModel):
    name: Optional[str] = None
    default_price_cents: Optional[int] = None

class KgItemOut(KgItemBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    branch_id: UUID