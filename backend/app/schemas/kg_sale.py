from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import List

class KgSaleLineItem(BaseModel):
    kg_item_id: UUID
    qty: int = Field(..., gt=0)

class KgSaleCreate(BaseModel):
    branch_id: UUID
    kg_student_id: UUID
    lines: List[KgSaleLineItem]

class KgSaleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    branch_id: UUID
    kg_student_id: UUID
    kg_item_id: UUID
    qty: int
    unit_price_cents: int
    total_cents: int
    sold_at: datetime