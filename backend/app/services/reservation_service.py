from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Optional
from uuid import UUID

import sqlalchemy as sa
from sqlalchemy import select, update, insert, text, func, and_, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.app.models.reservation import Reservation
from backend.app.models.ledger import StockLedger
from backend.app.models.sale import Sale
from backend.app.models.branch import Branch
from backend.app.models.item import Item
from backend.app.models.student import Student
from backend.app.services.inventory_service import on_hand, reserved_qty, get_inventory_summary

def _now_utc() -> datetime:
    return datetime.now(timezone.utc)

def auto_allocate_queued(db: Session, *, branch_id: UUID, item_id: UUID, when: datetime | None = None) -> int:
    """
    Allocate stock to queued reservations FIFO. Moves them to 'active',
    creates reserve_hold in ledger, and opens a 14-day window.
    Returns number of reservations allocated.
    """
    when = when or _now_utc()
    available = on_hand(db, branch_id, item_id) - reserved_qty(db, branch_id, item_id)
    if available <= 0:
        return 0

    rows = db.execute(
        select(Reservation.id, Reservation.qty)
        .where(
            Reservation.branch_id == branch_id,
            Reservation.item_id == item_id,
            Reservation.status == "queued",
        )
        .order_by(Reservation.created_at.asc())
        .with_for_update(skip_locked=True)
    ).all()

    count = 0
    for rid, q in rows:
        q = int(q)
        if q > available:
            break
        db.execute(insert(StockLedger).values(
            branch_id=branch_id, item_id=item_id,
            event="reserve_hold", qty=-q,
            ref_type="reservation", ref_id=rid,
        ))
        db.execute(update(Reservation)
                  .where(Reservation.id == rid)
                  .values(
                      status="active",
                      hold_window=sa.func.tstzrange(when, when + timedelta(days=14), "[)"),
                      notified_at=None,
                  ))
        available -= q
        count += 1

    if count:
        db.commit()
    return count

def create_reservation(
    db: Session,
    *,
    branch_id: UUID,
    item_id: UUID,
    qty: int,
    unit_price_cents: int,
    prepaid_cents: int,
    hold_minutes: int = 120,
    student_id: UUID | None = None,
    payment_method: str | None = None,
    payer_reference: str | None = None,
    payment_proof_id: str | None = None,
    payment_proof_url: str | None = None,
) -> UUID:
    if qty <= 0:
        raise ValueError("qty must be > 0")

    lock_key = f"{branch_id}:{item_id}"
    db.execute(sa.text("SELECT pg_advisory_xact_lock(hashtextextended(:k, 0))"), {"k": lock_key})

    item_price = db.execute(
        select(Item.default_price_cents).where(Item.id == item_id)
    ).scalar_one_or_none()

    if item_price is None:
        raise ValueError(f"Could not find a price for item_id: {item_id}")
    available = on_hand(db, branch_id, item_id) - reserved_qty(db, branch_id, item_id)
    oos = available < qty

    existing_open = db.execute(
        select(Reservation.id).where(
            Reservation.branch_id == branch_id,
            Reservation.item_id == item_id,
            Reservation.student_id == student_id,
            Reservation.status.in_(("hold", "active")),
        )
    ).scalar_one_or_none()
    if existing_open:
        return existing_open

    start = _now_utc()
    end = start + timedelta(minutes=hold_minutes)

    status = "queued" if oos else "hold"
    stmt = (
        insert(Reservation)
        .values(
            branch_id=branch_id,
            item_id=item_id,
            qty=qty,
            status=status,
            student_id=student_id,
            hold_window=None if oos else sa.func.tstzrange(start, end, "[)"),
            unit_price_cents=unit_price_cents,
            prepaid_cents=prepaid_cents,
            payment_method=payment_method,
            payer_reference=payer_reference,
            payment_proof_id=payment_proof_id,
            payment_proof_url=payment_proof_url,
        )
        .returning(Reservation.id)
    )
    
    try:
        res_id = db.execute(stmt).scalar_one()
        if not oos:
            db.execute(
                insert(StockLedger).values(
                    branch_id=branch_id,
                    item_id=item_id,
                    event="reserve_hold",
                    qty=-qty,
                    ref_type="reservation",
                    ref_id=res_id,
                )
            )
        db.commit()
        return res_id

    except IntegrityError as e:
        db.rollback()
        diag = getattr(e.orig, "diag", None)
        cname = getattr(diag, "constraint_name", "")

        if cname == 'uq_reservation_student_item':
            reuse = db.execute(
                select(Reservation.id).where(
                    Reservation.branch_id == branch_id,
                    Reservation.item_id == item_id,
                    Reservation.student_id == student_id,
                )
            ).scalar_one_or_none()

            if reuse:
                return reuse

        detail = getattr(diag, "message_detail", None)
        raise RuntimeError(
            f"Reservation conflict (constraint={cname or 'unknown'}): {detail or e}"
        ) from e

def cancel_reservation(db: Session, *, reservation_id: UUID) -> None:
    """
    Cancel a reservation. Returns availability (no on_hand change).
    """
    row = db.execute(
        select(Reservation.branch_id, Reservation.item_id, Reservation.qty, Reservation.status)
        .where(Reservation.id == reservation_id)
        .with_for_update()
    ).one_or_none()
    if not row:
        raise ValueError("Reservation not found")

    if str(row.status) in {"fulfilled", "cancelled", "expired"}:
        return

    db.execute(
        update(Reservation)
        .where(Reservation.id == reservation_id)
        .values(status="cancelled")
    )

    if str(row.status) in {"hold", "active"}:
        db.execute(
            insert(StockLedger).values(
                branch_id=row.branch_id,
                item_id=row.item_id,
                event="reserve_release",
                qty=int(row.qty),
                ref_type="reservation",
                ref_id=reservation_id,
            )
        )
    db.commit()

def prepay_reservation(
    db: Session,
    *,
    reservation_id: UUID,
    unit_price_cents: int,
    prepaid_cents: int | None = None,
    when: datetime | None = None,
) -> dict:
    if unit_price_cents < 0:
        raise ValueError("unit_price_cents must be >= 0")

    when = when or _now_utc()

    row = (
        db.execute(
            select(Reservation.id, Reservation.qty, Reservation.status)
            .where(Reservation.id == reservation_id)
            .with_for_update()
        )
        .one_or_none()
    )
    if not row:
        raise ValueError("Reservation not found")

    if row.status in ("cancelled", "expired", "fulfilled"):
        raise ValueError("Cannot prepay a cancelled/expired/fulfilled reservation")

    qty = int(row.qty)
    total = unit_price_cents * qty if prepaid_cents is None else int(prepaid_cents)
    if total < 0:
        raise ValueError("prepaid_cents must be >= 0")

    db.execute(
        update(Reservation)
        .where(Reservation.id == reservation_id)
        .values(
            unit_price_cents=unit_price_cents,
            prepaid_cents=total,
            prepaid_at=when,
        )
    )
    db.commit()

    return {
        "reservation_id": reservation_id,
        "unit_price_cents": unit_price_cents,
        "prepaid_cents": total,
        "prepaid_at": when.isoformat(),
    }

def mark_ready_reservation(
    db: Session,
    *,
    reservation_id: UUID,
    notify: bool = True,
    when: datetime | None = None,
) -> dict[str, Any]:
    """
    Move status to 'active' (stock allocated) and (optionally) set notified_at.
    If notify=True, try to send WhatsApp immediately; on failure, queue outbox.
    """
    when = when or _now_utc()

    row = db.execute(
        select(Reservation.status)
        .where(Reservation.id == reservation_id)
        .with_for_update()
    ).one_or_none()
    if not row:
        raise ValueError("Reservation not found")
    
    end = when + timedelta(days=14)

    if str(row.status) == "queued":
        b_id, i_id, qty = db.execute(
            select(Reservation.branch_id, Reservation.item_id, Reservation.qty)
            .where(Reservation.id == reservation_id)
        ).one()

        available = on_hand(db, b_id, i_id) - reserved_qty(db, b_id, i_id)
        if available < int(qty):
            raise ValueError("Not enough on-hand to mark ready")

        db.execute(insert(StockLedger).values(
            branch_id=b_id,
            item_id=i_id,
            event="reserve_hold",
            qty=-int(qty),
            ref_type="reservation",
            ref_id=reservation_id,
        ))

    values: dict[str, Any] = {"status": "active", "hold_window": sa.func.tstzrange(when, end, "[)")}
    if notify:
        values["notified_at"] = when

    db.execute(
        update(Reservation)
        .where(Reservation.id == reservation_id)
        .values(**values)
    )
    db.commit()

    result = {
        "reservation_id": reservation_id,
        "status": "active",
        "notified_at": when.isoformat() if notify else None,
    }

    if notify:
        try:
            from backend.app.core.config import get_settings
            settings = get_settings()

            info = get_reservation_summary(db, reservation_id=reservation_id)
            phone = (info.get("student_phone") or "").strip()
            if phone:
                student = info.get("student_name") or ""
                item    = info.get("item_name") or ""
                branch  = info.get("branch_code") or ""
                end_dt  = info.get("end")
                msg = (
                    f"Hi {student} 👋\n"
                    f"Your book '{item}' is ready at {branch}.\n"
                    f"Please collect before: {end_dt}."
                )

                sent_ok = False
                if getattr(settings, "wa_pywhatkit_enabled", False):
                    try:
                        from backend.app.services.notify.whatsapp_pywhatkit import send_ready_message
                        resp = send_ready_message(phone, msg)
                        sent_ok = bool(resp.get("ok", False))
                    except Exception:
                        sent_ok = False

                if not sent_ok:
                    try:
                        from backend.app.services.notify.outbox_service import ensure_queued_ready
                        ensure_queued_ready(db, reservation_id=reservation_id, when=when)
                        db.commit()
                    except Exception:
                        db.rollback()
        except Exception:
            pass

    return result


def fulfill_reservation(
    db: Session,
    *,
    reservation_id: UUID,
    sold_at: datetime | None = None,
) -> dict:
    """
    On pickup:
      - ensure enough on_hand to ship
      - status -> fulfilled
      - ledger: ship (-qty)
      - insert Sale (revenue today)
    """
    sold_at = sold_at or _now_utc()

    r = db.execute(
        select(
            Reservation.branch_id,
            Reservation.item_id,
            Reservation.qty,
            Reservation.status,
            Reservation.unit_price_cents,
            Reservation.payment_method,
            Reservation.prepaid_cents,
        )
        .where(Reservation.id == reservation_id)
        .with_for_update()
    ).one_or_none()

    
    if not r:
        raise ValueError("Reservation not found")

    if str(r.status) not in {"active"}:
        raise ValueError(f"Cannot fulfill reservation in status '{r.status}'")

    b_id: UUID = r.branch_id
    i_id: UUID = r.item_id
    qty = int(r.qty)
    unit_price_cents = int(r.unit_price_cents or 0)
    method = (r.payment_method or "cash")

    lock_key = f"{b_id}:{i_id}"
    db.execute(text("SELECT pg_advisory_xact_lock(hashtextextended(:k, 0))"), {"k": lock_key})

    if on_hand(db, b_id, i_id) < qty:
        raise ValueError("Not enough on-hand stock to fulfill")

    db.execute(
        update(Reservation)
        .where(Reservation.id == reservation_id)
        .values(status="fulfilled", fulfilled_at=sold_at)
    )

    db.execute(
        insert(StockLedger).values(
            branch_id=b_id,
            item_id=i_id,
            event="reserve_release",
            qty=qty,
            ref_type="reservation",
            ref_id=reservation_id,
            at=sold_at,
        )
    )

    db.execute(
        insert(StockLedger).values(
            branch_id=b_id,
            item_id=i_id,
            event="ship",
            qty=-qty,
            ref_type="reservation",
            ref_id=reservation_id,
            at=sold_at,
        )
    )

    total_cents = unit_price_cents * qty
    sale_id = db.execute(
        insert(Sale)
        .values(
            branch_id=b_id,
            item_id=i_id,
            reservation_id=reservation_id,
            qty=qty,
            unit_price_cents=unit_price_cents,
            total_cents=total_cents,
            sold_at=sold_at,
            payment_method=method,
        )
        .returning(Sale.id)
    ).scalar_one()

    db.commit()

    inv = get_inventory_summary(db, b_id, i_id)
    inv["available"] = inv["on_hand"] - inv["reserved"]

    return {
        "reservation_id": reservation_id,
        "sale_id": str(sale_id),
        "qty": qty,
        "unit_price_cents": unit_price_cents,
        "total_cents": total_cents,
        "sold_at": sold_at.isoformat(),
        "inventory": inv,
    }

def search_reservations(
    db: Session,
    *,
    q: Optional[str] = None,
    phone: Optional[str] = None,
    limit: int = 50,
) -> list[dict[str, Any]]:
    r = Reservation
    b = Branch
    i = Item
    s = Student

    j = (
        select(
            r.id, r.qty, r.status,
            func.lower(r.hold_window).label("start"),
            func.upper(r.hold_window).label("end"),
            r.created_at, r.fulfilled_at,
            b.code.label("branch_code"),
            i.sku.label("sku"),
            i.name.label("item_name"),
            s.full_name.label("student_name"),
            s.phone.label("student_phone"),
            Sale.payment_method.label("payment_method"),
            s.id.label("student_id"),
        )
        .join(b, b.id == r.branch_id)
        .join(i, i.id == r.item_id)
        .outerjoin(s, s.id == r.student_id)
        .outerjoin(Sale, Sale.reservation_id == r.id)
        .order_by(sa.desc(r.fulfilled_at.nullslast()), sa.desc(r.created_at))
        .limit(limit)
    )

    conds = []
    if q:
        q_like = f"%{q.lower()}%"
        conds.append(func.lower(s.full_name).like(q_like))
    if phone:
        phone_clean = phone.strip()
        alt = ("+2" + phone_clean) if phone_clean.startswith("0") else phone_clean
        conds.append(sa.or_(s.phone.ilike(f"%{phone_clean}%"), s.phone.ilike(f"%{alt}%")))

    if conds:
        j = j.where(and_(*conds))

    rows = db.execute(j).all()
    out: list[dict[str, Any]] = []
    for row in rows:
        out.append({
            "id": row.id,
            "qty": int(row.qty),
            "status": str(row.status),
            "start": row.start.isoformat() if row.start else None,
            "end": row.end.isoformat() if row.end else None,
            "created_at": row.created_at.isoformat() if row.created_at else None,
            "fulfilled_at": row.fulfilled_at.isoformat() if row.fulfilled_at else None,
            "branch_code": row.branch_code,
            "sku": row.sku,
            "item_name": row.item_name,
            "student_name": row.student_name,
            "student_phone": row.student_phone,
            "student_id": getattr(row, "student_id", None),
            "payment_method": getattr(row, "payment_method", None),
        })
    return out

def get_reservation_summary(
    db: Session,
    *,
    reservation_id: UUID,
) -> dict[str, Any]:
    r, b, i, s = Reservation, Branch, Item, Student
    lower = func.lower(r.hold_window).label("start")
    upper = func.upper(r.hold_window).label("end")

    row = (
        db.execute(
            select(
                r.id.label("id"),
                r.qty,
                r.status,
                lower,
                upper,
                b.id.label("branch_id"),
                b.code.label("branch_code"),
                i.id.label("item_id"),
                i.sku.label("sku"),
                i.name.label("item_name"),
                s.id.label("student_id"),
                s.full_name.label("student_name"),
                s.phone.label("student_phone"),
                r.unit_price_cents,
                r.prepaid_cents,
                r.prepaid_at,
                r.notified_at,
            )
            .join(b, b.id == r.branch_id)
            .join(i, i.id == r.item_id)
            .outerjoin(s, s.id == r.student_id)
            .where(r.id == reservation_id)
        )
        .mappings()
        .one_or_none()
    )

    if not row:
        raise ValueError("Reservation not found")

    return {
        "id": row["id"],
        "qty": int(row["qty"]),
        "status": str(row["status"]),
        "start": row["start"],
        "end": row["end"],
        "branch_id": row["branch_id"],
        "branch_code": row["branch_code"],
        "item_id": row["item_id"],
        "sku": row["sku"],
        "item_name": row["item_name"],
        "student_id": row["student_id"],
        "student_name": row["student_name"],
        "student_phone": row["student_phone"],
        "unit_price_cents": int(row["unit_price_cents"] or 0),
        "prepaid_cents": int(row["prepaid_cents"] or 0),
        "prepaid_at": row["prepaid_at"],
        "notified_at": row["notified_at"],
    }

def unfulfill_reservation(db: Session, *, reservation_id: UUID) -> dict:
    row = db.execute(
        select(Reservation.branch_id, Reservation.item_id, Reservation.qty, Reservation.status)
        .where(Reservation.id == reservation_id)
        .with_for_update()
    ).one_or_none()
    if not row:
        raise ValueError("Reservation not found")

    if str(row.status) != "fulfilled":
        return {"reservation_id": str(reservation_id), "status": str(row.status)}

    sale_id = db.execute(
        select(Sale.id).where(Sale.reservation_id == reservation_id)
    ).scalar_one_or_none()
    if sale_id:
        db.execute(sa.delete(Sale).where(Sale.id == sale_id))

    db.execute(insert(StockLedger).values(
        branch_id=row.branch_id,
        item_id=row.item_id,
        event="reserve_hold",
        qty=-int(row.qty),
        ref_type="reservation",
        ref_id=reservation_id,
    ))

    db.execute(insert(StockLedger).values(
        branch_id=row.branch_id,
        item_id=row.item_id,
        event="ship",
        qty=int(row.qty),
        ref_type="reservation",
        ref_id=reservation_id,
    ))

    db.execute(
        update(Reservation)
        .where(Reservation.id == reservation_id)
        .values(status="active", fulfilled_at=None)
    )

    db.commit()
    return {"reservation_id": str(reservation_id), "status": "active"}
