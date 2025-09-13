from __future__ import annotations
from typing import Any, Literal
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field

OpName = Literal[
    "reservation.create",
    "reservation.prepay",
    "reservation.mark_ready",
    "reservation.cancel",
    "reservation.fulfill",
    "reservation.expire",
    "adjust.receive",
    "adjust.adjust",
    "transfer.create",
    "order.quick_sale",
    "order.return_line",
]

class OperationIn(BaseModel):
    id: UUID = Field(..., description="Client-generated idempotency key for this op")
    op: OpName
    payload: dict[str, Any]
    occurred_at: datetime | None = None

class OperationOut(BaseModel):
    id: UUID
    op: str
    status: Literal["ok", "error"]
    result: dict[str, Any] | None = None
    error: str | None = None

class BatchIn(BaseModel):
    operations: list[OperationIn]

class BatchOut(BaseModel):
    results: list[OperationOut]
