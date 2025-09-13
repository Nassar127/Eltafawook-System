from uuid import UUID
from pydantic import BaseModel, Field
from typing import List
from datetime import date

class KgDailySalesOut(BaseModel):
    branch_id: UUID
    day: date
    sales_count: int
    sales_total_cents: int
    adjustments_total_cents: int
    net_total_cents: int
    net_total_egp: float

class KgDetailedSalesRow(BaseModel):
    item_name: str
    total_qty: int
    total_amount_cents: int

class KgDetailedSalesReportOut(BaseModel):
    branch_id: UUID
    start_date: date
    end_date: date
    rows: List[KgDetailedSalesRow]