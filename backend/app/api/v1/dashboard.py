"""Admin-only dashboard KPI endpoint."""
from __future__ import annotations

from datetime import date, datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select, case, text
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.models.branch import Branch
from backend.app.models.item import Item
from backend.app.models.reservation import Reservation
from backend.app.models.sale import Sale
from backend.app.models.student import Student
from backend.app.models.kg_student import KgStudent
from backend.app.models.user import User
from .auth import get_current_active_user

router = APIRouter()


def _require_admin(user: User):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")


@router.get("/summary")
def dashboard_summary(
    branch_id: UUID | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    _require_admin(current_user)

    today = date.today()
    month_start = today.replace(day=1)

    # ── Student counts ──
    student_q = select(func.count()).select_from(Student)
    if branch_id:
        student_q = student_q.where(Student.branch_id == branch_id)
    total_students = db.execute(student_q).scalar() or 0

    kg_q = select(func.count()).select_from(KgStudent)
    if branch_id:
        kg_q = kg_q.where(KgStudent.branch_id == branch_id)
    total_kg_students = db.execute(kg_q).scalar() or 0

    # ── Sales today ──
    sales_today_q = select(
        func.count().label("count"),
        func.coalesce(func.sum(Sale.total_cents), 0).label("revenue_cents"),
    ).where(func.date(Sale.sold_at) == today)
    if branch_id:
        sales_today_q = sales_today_q.where(Sale.branch_id == branch_id)
    row = db.execute(sales_today_q).one()
    sales_today_count = row.count
    sales_today_cents = row.revenue_cents

    # ── Sales this month ──
    sales_month_q = select(
        func.count().label("count"),
        func.coalesce(func.sum(Sale.total_cents), 0).label("revenue_cents"),
    ).where(func.date(Sale.sold_at) >= month_start)
    if branch_id:
        sales_month_q = sales_month_q.where(Sale.branch_id == branch_id)
    mrow = db.execute(sales_month_q).one()
    sales_month_count = mrow.count
    sales_month_cents = mrow.revenue_cents

    # ── Reservation breakdown ──
    res_q = select(
        Reservation.status,
        func.count().label("cnt"),
    ).group_by(Reservation.status)
    if branch_id:
        res_q = res_q.where(Reservation.branch_id == branch_id)
    res_rows = db.execute(res_q).all()
    reservations_by_status = {r.status: r.cnt for r in res_rows}

    # ── Inventory health (items with zero or negative available) ──
    low_stock_q = text("""
        SELECT COUNT(*) FROM v_inventory_onhand
        WHERE available <= 0
    """)
    try:
        low_stock = db.execute(low_stock_q).scalar() or 0
    except Exception:
        low_stock = None  # view may not exist

    # ── Branch breakdown ──
    branch_sales_q = select(
        Branch.code,
        Branch.name,
        func.count(Sale.id).label("sales_count"),
        func.coalesce(func.sum(Sale.total_cents), 0).label("revenue_cents"),
    ).join(Sale, Sale.branch_id == Branch.id, isouter=True).where(
        func.date(Sale.sold_at) == today
    ).group_by(Branch.id)
    branch_rows = db.execute(branch_sales_q).all()
    branches_today = [
        {"code": r.code, "name": r.name, "sales_count": r.sales_count, "revenue_cents": r.revenue_cents}
        for r in branch_rows
    ]

    return {
        "date": str(today),
        "total_students": total_students,
        "total_kg_students": total_kg_students,
        "sales_today": {"count": sales_today_count, "revenue_cents": sales_today_cents},
        "sales_month": {"count": sales_month_count, "revenue_cents": sales_month_cents},
        "reservations_by_status": reservations_by_status,
        "low_stock_items": low_stock,
        "branches_today": branches_today,
    }
