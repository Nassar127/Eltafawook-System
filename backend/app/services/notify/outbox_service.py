from __future__ import annotations

import time
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

import sqlalchemy as sa
from sqlalchemy import insert, select, update, func
from sqlalchemy.orm import Session

from backend.app.models.notify import NotifyOutbox
from backend.app.services.notify.whatsapp_pywhatkit import send_ready_message

from backend.app.models.reservation import Reservation
from backend.app.models.student import Student
from backend.app.models.item import Item
from backend.app.models.branch import Branch

MAX_ATTEMPTS = 2


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def queue_whatsapp_ready(
    db: Session,
    *,
    reservation_id: UUID,
    phone: str,
    message: str,
) -> UUID:
    """
    Queue a WhatsApp "ready for pickup" message in notification_outbox.

    Matches NotifyOutbox schema:
      - channel: "wa_web" (your worker drains these)
      - to: E.164 or raw number
      - message: text body
      - state: pending|sent|failed
      - attempts: starts at 0
      - reservation_id: foreign key for traceability
    """
    outbox_id = (
        db.execute(
            insert(NotifyOutbox)
            .values(
                channel="wa_web",
                to=phone,
                message=message,
                template_key="reservation_ready",
                state="pending",
                attempts=0,
                reservation_id=reservation_id,
            )
            .returning(NotifyOutbox.id)
        )
        .scalar_one()
    )
    db.commit()
    return outbox_id


def ensure_queued_ready(
    db: Session,
    *,
    reservation_id: UUID,
    when: datetime | None = None,
) -> Optional[UUID]:
    """
    If we have a phone, enqueue a ready message for this reservation.
    """
    r, s, i, b = Reservation, Student, Item, Branch
    row = (
        db.execute(
            select(
                s.phone.label("phone"),
                s.full_name.label("student_name"),
                i.name.label("item_name"),
                b.code.label("branch_code"),
                func.upper(r.hold_window).label("end"),
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
        return None

    phone = (row["phone"] or "").strip()
    if not phone:
        return None

    msg = (
        f"Hi {row['student_name'] or ''} 👋\n"
        f"Your book '{row['item_name']}' is ready at {row['branch_code']}.\n"
        f"Please collect before: {row['end']}. "
        f"Note: No returns are allowed."
    )

    return queue_whatsapp_ready(
        db,
        reservation_id=reservation_id,
        phone=phone,
        message=msg,
    )


def drain_whatsapp(db: Session, *, limit: int = 10, sleep_between: float = 2.0) -> dict:
    """
    Try to send up to `limit` pending wa_web messages.
    """
    q = (
        select(NotifyOutbox)
        .where(NotifyOutbox.channel == "wa_web", NotifyOutbox.state == "pending")
        .order_by(NotifyOutbox.created_at.asc())
        .limit(limit)
    )
    rows = db.execute(q).scalars().all()

    sent = 0
    failed = 0
    for o in rows:
        db.execute(
            update(NotifyOutbox)
            .where(NotifyOutbox.id == o.id)
            .values(attempts=o.attempts + 1)
        )
        db.commit()

        try:
            res = send_ready_message(o.to, o.message)
            ok = bool(res.get("ok")) if isinstance(res, dict) else False
            if ok:
                db.execute(
                    update(NotifyOutbox)
                    .where(NotifyOutbox.id == o.id)
                    .values(state="sent", sent_at=_now_utc(), last_error=None)
                )
                db.commit()
                sent += 1
            else:
                err_val = res.get("error") if isinstance(res, dict) else None
                err = str(err_val) if err_val is not None else "unknown"
                _mark_failed(db, o.id, err, o.attempts + 1)
                failed += 1
        except Exception as e:
            _mark_failed(db, o.id, str(e), o.attempts + 1)
            failed += 1

        time.sleep(sleep_between)

    return {"sent": sent, "failed": failed, "scanned": len(rows)}


def _mark_failed(db: Session, outbox_id: UUID, err: str, attempts: int) -> None:
    state = "failed" if attempts >= MAX_ATTEMPTS else "pending"
    db.execute(
        update(NotifyOutbox)
        .where(NotifyOutbox.id == outbox_id)
        .values(state=state, last_error=err)
    )
    db.commit()
