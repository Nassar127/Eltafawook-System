from uuid import UUID
from pydantic import BaseModel

class InventorySummary(BaseModel):
    branch_id: UUID
    item_id: UUID
    on_hand: int
    reserved: int
    available: int
