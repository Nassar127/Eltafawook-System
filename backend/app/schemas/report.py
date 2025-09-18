from uuid import UUID
from pydantic import BaseModel, Field
from typing import List
from datetime import date

class InventoryRow(BaseModel):
    item_id: UUID
    sku: str
    name: str | None = None
    teacher_id: UUID | None = None
    grade: int | None = None 
    on_hand: int
    reserved: int
    available: int

class BranchInventory(BaseModel):
    branch_id: UUID
    branch_code: str
    items: List[InventoryRow]

class DailyActivity(BaseModel):
    branch_id: UUID
    branch_code: str
    start: str
    end: str
    receive: int
    adjust: int
    transfer_in: int
    transfer_out: int
    ship: int
    return_qty: int
    reservations_count: int
    reservations_qty: int

class DailySalesOut(BaseModel):
    branch_id: UUID
    branch_code: str
    day: date
    sales_count: int
    sales_cash_cents: int
    sales_voda_cents: int
    sales_instapay_cents: int
    total_profit_cents: int
    adjustments_total_cents: int
    net_total_cents: int
    net_total_egp: float

class DetailedSalesRow(BaseModel):
    teacher_name: str
    item_name: str
    item_grade: int
    payment_method: str
    total_qty: int
    total_amount_cents: int

class DetailedSalesReportOut(BaseModel):
    branch_id: UUID
    start_date: date
    end_date: date
    rows: list[DetailedSalesRow]