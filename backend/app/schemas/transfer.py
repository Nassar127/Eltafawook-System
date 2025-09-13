from uuid import UUID
from pydantic import BaseModel, PositiveInt
from backend.app.schemas.inventory import InventorySummary

class TransferRequest(BaseModel):
    from_branch_id: UUID
    to_branch_id: UUID
    item_id: UUID
    qty: PositiveInt

class TransferResponse(BaseModel):
    from_summary: InventorySummary
    to_summary: InventorySummary
