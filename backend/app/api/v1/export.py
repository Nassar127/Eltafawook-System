"""Admin-only CSV export endpoints."""
from __future__ import annotations

import csv
import io
from datetime import date, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.models.branch import Branch
from backend.app.models.item import Item
from backend.app.models.reservation import Reservation
from backend.app.models.sale import Sale
from backend.app.models.student import Student
from backend.app.models.teacher import Teacher
from backend.app.models.user import User
from .auth import get_current_active_user

router = APIRouter()


def _require_admin(user: User):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")


def _csv_response(rows: list[dict], filename: str) -> StreamingResponse:
    if not rows:
        return StreamingResponse(
            iter(["No data"]),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=rows[0].keys())
    writer.writeheader()
    writer.writerows(rows)
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/students")
def export_students(
    branch_id: UUID | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    _require_admin(current_user)
    q = select(Student).order_by(Student.full_name)
    if branch_id:
        q = q.where(Student.branch_id == branch_id)
    students = db.execute(q).scalars().all()
    rows = [
        {
            "id": str(s.id),
            "public_id": s.public_id,
            "full_name": s.full_name,
            "phone": s.phone or "",
            "parent_phone": s.parent_phone or "",
            "gender": s.gender,
            "grade": s.grade,
            "section": s.section or "",
            "created_at": str(s.created_at),
        }
        for s in students
    ]
    return _csv_response(rows, f"students_{date.today()}.csv")


@router.get("/sales")
def export_sales(
    branch_id: UUID | None = Query(None),
    start_date: date = Query(...),
    end_date: date = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    _require_admin(current_user)
    q = (
        select(Sale, Item.sku, Item.name.label("item_name"), Branch.code.label("branch_code"))
        .join(Item, Item.id == Sale.item_id)
        .join(Branch, Branch.id == Sale.branch_id)
        .where(func.date(Sale.sold_at) >= start_date, func.date(Sale.sold_at) <= end_date)
        .order_by(Sale.sold_at.desc())
    )
    if branch_id:
        q = q.where(Sale.branch_id == branch_id)
    results = db.execute(q).all()
    rows = [
        {
            "id": str(r.Sale.id),
            "branch": r.branch_code,
            "sku": r.sku,
            "item": r.item_name,
            "qty": r.Sale.qty,
            "unit_price_egp": r.Sale.unit_price_cents / 100,
            "total_egp": r.Sale.total_cents / 100,
            "sold_at": str(r.Sale.sold_at),
        }
        for r in results
    ]
    return _csv_response(rows, f"sales_{start_date}_{end_date}.csv")


@router.get("/inventory")
def export_inventory(
    branch_id: UUID | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    _require_admin(current_user)
    q = (
        select(Item, Teacher.name.label("teacher_name"))
        .join(Teacher, Teacher.id == Item.teacher_id, isouter=True)
        .order_by(Item.sku)
    )
    results = db.execute(q).all()
    rows = [
        {
            "sku": r.Item.sku,
            "name": r.Item.name,
            "grade": r.Item.grade,
            "teacher": r.teacher_name or "",
            "price_egp": r.Item.default_price_cents / 100,
            "cost_egp": r.Item.default_cost_cents / 100,
            "active": r.Item.active,
        }
        for r in results
    ]
    return _csv_response(rows, f"inventory_{date.today()}.csv")
