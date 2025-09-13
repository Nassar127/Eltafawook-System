from datetime import datetime
from typing import Any, Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import and_, func, select, cast, String
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.models.branch import Branch
from backend.app.models.item import Item
from backend.app.models.reservation import Reservation
from backend.app.models.student import Student
from backend.app.models.sale import Sale
from backend.app.schemas.reservation import ReservationCreate, ReservationOut, ReservationDetailOut
from backend.app.services import reservation_service as rsvc
from backend.app.utils.validators import normalize_phone
from backend.app.services.reservation_service import (
    cancel_reservation,
    fulfill_reservation,
    get_reservation_summary,
    mark_ready_reservation,
    prepay_reservation,
)
from backend.app.models.teacher import Teacher

router = APIRouter()

NonNegInt = Annotated[int, Field(ge=0)]

class PrepayIn(BaseModel):
    unit_price_cents: NonNegInt
    prepaid_cents: NonNegInt | None = None

class MarkReadyIn(BaseModel):
    notify: bool = True

@router.post("", response_model=ReservationOut)
def create_reservation_route(payload: ReservationCreate, db: Session = Depends(get_db)):
    data = payload.canonical()
    payer_ref = data.payer_reference or data.payer_phone
    proof_url = data.payment_proof_url or data.proof_media_url
    if (data.prepaid_cents or 0) > 0 and data.payment_method in ("vodafone_cash", "instapay"):
        if not payer_ref:
            raise HTTPException(status_code=400, detail="payer_reference (or payer_phone) is required for non-cash prepaid")
        if not proof_url:
            raise HTTPException(status_code=400, detail="payment_proof_url (or proof_media_url) is required for non-cash prepaid")

    res_id = rsvc.create_reservation(
        db,
        branch_id=data.branch_id,
        item_id=data.item_id,
        qty=data.qty,
        student_id=data.student_id,
        unit_price_cents=data.unit_price_cents,
        prepaid_cents=data.prepaid_cents or 0,
        payment_method=data.payment_method,
        payer_reference=payer_ref,
        payment_proof_id=data.payment_proof_id,
        payment_proof_url=proof_url,
    )
    return rsvc.get_reservation_summary(db, reservation_id=res_id)

@router.get("/search")
def search_reservations(
    q: str | None = None,
    phone: str | None = None,
    branch_code: str | None = None,
    sku: str | None = None,
    status: str | None = None,
    start_from: datetime | None = None,
    start_to: datetime | None = None,
    limit: int = 50,
    student_id: UUID | None = None,
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    lower = func.lower(Reservation.hold_window)
    upper = func.upper(Reservation.hold_window)

    price_expr = func.coalesce(Reservation.unit_price_cents, Item.default_price_cents)

    stmt = (
        select(
            Reservation.id,
            Reservation.qty,
            Reservation.status,
            lower.label("start"),
            upper.label("end"),
            Branch.code.label("branch_code"),
            Item.sku.label("sku"),
            Item.name.label("item_name"),
            Item.grade.label("item_grade"),
            Teacher.name.label("teacher_name"),
            Reservation.unit_price_cents,
            Item.default_price_cents.label("item_default_price_cents"),
            price_expr.label("unit_price_cents_effective"),
            (price_expr * Reservation.qty).label("total_cents"),
            Reservation.prepaid_cents,
            Reservation.payment_method,
            Student.full_name.label("student_name"),
            Student.phone.label("student_phone"),
            Student.public_id.label("student_public_id"),
            Reservation.created_at,
            Reservation.fulfilled_at
        )
        .join(Branch, Branch.id == Reservation.branch_id)
        .join(Item, Item.id == Reservation.item_id)
        .join(Teacher, Teacher.id == Item.teacher_id, isouter=True)
        .join(Student, Student.id == Reservation.student_id, isouter=True)
        .order_by(lower.desc())
        .limit(limit)
    )

    conds = []
    if status:
        conds.append(Reservation.status == status)
    if branch_code:
        conds.append(Branch.code == branch_code)
    if sku:
        conds.append(Item.sku == sku)
    if q:
        conds.append(Student.full_name.ilike(f"%{q}%"))
    if phone:
        try:
            conds.append(Student.phone_norm == normalize_phone(phone))
        except Exception:
            p = f"%{phone}%"
            conds.append(Student.phone.ilike(p))
    if start_from:
        conds.append(lower >= start_from)
    if start_to:
        conds.append(lower < start_to)
    if student_id: 
        conds.append(Reservation.student_id == student_id)

    if conds:
        stmt = stmt.where(and_(*conds))

    rows = db.execute(stmt).all()

    return [
        dict(
            id=r.id,
            qty=int(r.qty),
            status=str(r.status),
            start=r.start,
            end=r.end,
            branch_code=r.branch_code,
            sku=r.sku,
            item_name=r.item_name,
            item_grade=r.item_grade,
            teacher_name=r.teacher_name,
            unit_price_cents=r.unit_price_cents,
            item_default_price_cents=r.item_default_price_cents,
            unit_price_cents_effective=r.unit_price_cents_effective,
            total_cents=r.total_cents,
            prepaid_cents=r.prepaid_cents,
            payment_method=r.payment_method,
            student_name=r.student_name,
            student_phone=r.student_phone,
            student_public_id=r.student_public_id,
            created_at=r.created_at,
            fulfilled_at=r.fulfilled_at
        )
        for r in rows
    ]

@router.get("/{reservation_id}", response_model=ReservationDetailOut)
def get_res(reservation_id: UUID, db: Session = Depends(get_db)):
    try:
        return get_reservation_summary(db, reservation_id=reservation_id)
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))

@router.post("/{reservation_id}/prepay")
def prepay_reservation_route(
    reservation_id: UUID,
    body: PrepayIn,
    db: Session = Depends(get_db),
):
    try:
        return prepay_reservation(
            db,
            reservation_id=reservation_id,
            unit_price_cents=body.unit_price_cents,
            prepaid_cents=body.prepaid_cents,
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))

@router.post("/{reservation_id}/mark-ready")
def mark_ready_reservation_route(
    reservation_id: UUID,
    body: MarkReadyIn,
    db: Session = Depends(get_db),
):
    try:
        return mark_ready_reservation(
            db,
            reservation_id=reservation_id,
            notify=body.notify,
        )
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))

@router.post("/{reservation_id}/cancel", status_code=204)
def cancel_res(reservation_id: UUID, db: Session = Depends(get_db)):
    try:
        cancel_reservation(db, reservation_id=reservation_id)
        return
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))

@router.post("/{reservation_id}/fulfill")
def fulfill_res(reservation_id: UUID, db: Session = Depends(get_db)):
    try:
        return fulfill_reservation(db, reservation_id=reservation_id)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))

@router.post("/_maintenance/run-expire")
def run_expire_now(db: Session = Depends(get_db)):
    from backend.app.workers.jobs.expire_reservations import run as expire_run
    n = expire_run(db)
    return {"expired": n}

@router.post("/{reservation_id}/unfulfill")
def unfulfill_reservation_route(reservation_id: UUID, db: Session = Depends(get_db)):
    return rsvc.unfulfill_reservation(db, reservation_id=reservation_id)