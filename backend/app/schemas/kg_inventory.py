from uuid import UUID
from pydantic import BaseModel, Field

class KgReceiveStockRequest(BaseModel):
    branch_id: UUID
    kg_item_id: UUID
    qty: int = Field(..., gt=0)