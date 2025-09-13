from datetime import datetime, date
from uuid import UUID as PyUUID
from typing import Dict

from sqlalchemy import select, func, text, and_, cast as sa_cast
from sqlalchemy.orm import Session
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

from backend.app.models.branch import Branch
from backend.app.models.item import Item
from backend.app.models.ledger import StockLedger
from backend.app.models.reservation import Reservation
from backend.app.models.revenue_adjustment import RevenueAdjustment
from backend.app.models.sale import Sale
from backend.app.models.teacher import Teacher
from backend.app.schemas.report import DailySalesOut
from backend.app.services.inventory_service import get_inventory_summary

def branch_by_code(db: Session, code: str) -> Branch | None:
    return db.execute(select(Branch).where(Branch.code == code)).scalar_one_or_none()

inventory_view = sa.Table('inventory_view', sa.MetaData(),
    sa.Column('branch_id', UUID),
    sa.Column('item_id', UUID),
    sa.Column('on_hand', sa.Integer),
    sa.Column('reserved', sa.Integer),
    sa.Column('available', sa.Integer)
)

def branch_inventory_snapshot(db: Session, *, branch_id: PyUUID, sku: str | None = None) -> Dict:
    stmt = (
        select(
            Item.id.label("item_id"),
            Item.sku,
            Item.name,
            Item.teacher_id,
            Item.grade,
            Item.default_price_cents,
            func.coalesce(inventory_view.c.on_hand, 0).label("on_hand"),
            func.coalesce(inventory_view.c.reserved, 0).label("reserved"),
            func.coalesce(inventory_view.c.available, 0).label("available"),
        )
        .join(inventory_view,
              sa.and_(Item.id == inventory_view.c.item_id, inventory_view.c.branch_id == branch_id),
              isouter=True)
        .order_by(Item.sku)
    )
    if sku:
        stmt = stmt.where(Item.sku.ilike(f"%{sku}%"))
    rows = db.execute(stmt).mappings().all()
    results = []
    for row in rows:
        results.append({
            "item_id": row.item_id,
            "sku": row.sku,
            "name": row.name,
            "teacher_id": row.teacher_id,
            "grade": row.grade,
            "default_price_cents": row.default_price_cents,
            "on_hand": row.on_hand,
            "reserved": row.reserved,
            "available": row.available,
        })
    return {"items": results}

def daily_branch_activity(db: Session, *, branch_id: PyUUID, start: datetime, end: datetime) -> Dict:
    rows = db.execute(
        select(StockLedger.event, func.coalesce(func.sum(StockLedger.qty), 0))
        .where(
            StockLedger.branch_id == branch_id,
            StockLedger.at >= start,
            StockLedger.at < end,
        )
        .group_by(StockLedger.event)
    ).all()
    sums: dict[str, int] = {str(r[0]): int(r[1] or 0) for r in rows}
    lower = func.lower(Reservation.hold_window)
    res_count, res_qty = db.execute(
        select(
            func.count(Reservation.id),
            func.coalesce(func.sum(Reservation.qty), 0)
        ).where(
            Reservation.branch_id == branch_id,
            lower >= start,
            lower < end,
        )
    ).one()
    def s(ev: str) -> int:
        return int(sums.get(ev, 0))
    return {
        "receive": s("receive"),
        "adjust": s("adjust"),
        "transfer_in": s("transfer_in"),
        "transfer_out": abs(s("transfer_out")),
        "ship": abs(s("ship")),
        "return_qty": s("return"),
        "reservations_count": int(res_count or 0),
        "reservations_qty": int(res_qty or 0),
    }

def daily_sales_totals(db: Session, *, branch_id: PyUUID, start_date: date, end_date: date) -> DailySalesOut:
    """
    Calculates sales and adjustment totals over a given date range.
    """
    code = db.execute(select(Branch.code).where(Branch.id == branch_id)).scalar_one()

    sales_row = db.execute(
        text("""
            SELECT COALESCE(SUM(total_cents), 0) AS total_cents, COUNT(*) AS sales_count
            FROM sales
            WHERE branch_id = :branch_id 
              AND (sold_at AT TIME ZONE 'Africa/Cairo')::date >= :start_date
              AND (sold_at AT TIME ZONE 'Africa/Cairo')::date <= :end_date
        """),
        {"branch_id": str(branch_id), "start_date": start_date, "end_date": end_date},
    ).one()
    
    sales_total_cents = int(sales_row.total_cents or 0)
    sales_count = int(sales_row.sales_count or 0)

    adjustments_total_cents = db.execute(
        select(func.coalesce(func.sum(RevenueAdjustment.amount_cents), 0))
        .where(
            RevenueAdjustment.branch_id == branch_id,
            RevenueAdjustment.adjustment_date >= start_date,
            RevenueAdjustment.adjustment_date <= end_date,
            RevenueAdjustment.context == 'bookstore'
        )
    ).scalar_one()

    net_total_cents = sales_total_cents + adjustments_total_cents

    return DailySalesOut(
        branch_id=branch_id,
        branch_code=code,
        day=start_date,
        sales_count=sales_count,
        sales_total_cents=sales_total_cents,
        adjustments_total_cents=adjustments_total_cents,
        net_total_cents=net_total_cents,
        net_total_egp=round(net_total_cents / 100.0, 2),
    )

def get_detailed_sales_report(db: Session, *, branch_id: PyUUID, start_date: date, end_date: date):
    stmt = (
        select(
            Teacher.name.label("teacher_name"),
            Item.name.label("item_name"),
            Item.grade.label("item_grade"),
            Sale.payment_method,
            func.sum(Sale.qty).label("total_qty"),
            func.sum(Sale.total_cents).label("total_amount_cents")
        )
        .join(Item, Sale.item_id == Item.id)
        .join(Teacher, Item.teacher_id == Teacher.id)
        .where(
            Sale.branch_id == branch_id,
            sa.cast(Sale.sold_at, sa.Date) >= start_date,
            sa.cast(Sale.sold_at, sa.Date) <= end_date
        )
        .group_by(
            Teacher.name,
            Item.name,
            Item.grade,
            Sale.payment_method
        )
        .order_by(
            Teacher.name,
            Item.name,
            Item.grade
        )
    )
    results = db.execute(stmt).mappings().all()
    return [dict(row) for row in results]
