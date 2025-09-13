from uuid import UUID
from pydantic import BaseModel, PositiveInt, Field
from backend.app.schemas.inventory import InventorySummary

class ReceiveRequest(BaseModel):
    branch_id: UUID
    item_id: UUID
    qty: PositiveInt

class AdjustRequest(BaseModel):
    branch_id: UUID
    item_id: UUID
    delta: int = Field(..., description="Positive or negative. Non-zero.")
    reason: str | None = Field(None, max_length=200)

class AdjustResponse(BaseModel):
    summary: InventorySummary
