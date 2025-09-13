from __future__ import annotations
from uuid import UUID as _UUID

import sqlalchemy as sa
from sqlalchemy import select, func, insert, and_, update
from sqlalchemy.orm import Session

from backend.app.models.ledger import StockLedger
from backend.app.models.reservation import Reservation
from backend.app.models.adjustment import Adjustment
from backend.app.services.notify.outbox_service import ensure_queued_ready

_PHYSICAL_EXCLUDE = ("reserve_hold", "reserve_release")

def _active_reserved_qty(db: Session, branch_id: _UUID, item_id: _UUID) -> int:
    q = (
        select(func.coalesce(func.sum(Reservation.qty), 0))
        .where(
            Reservation.branch_id == branch_id,
            Reservation.item_id == item_id,
            Reservation.status == "active",
        )
    )
    return int(db.execute(q).scalar_one())

def _activate_oldest_holds(db: Session, branch_id: _UUID, item_id: _UUID) -> int:
    """
    Promote oldest 'hold' reservations to 'active' up to capacity:
      capacity = on_hand - sum(active.qty)
    Sets hold_window = [now, now+14d], stamps notified_at, enqueues WA.
    Returns number of reservations activated.
    """
    oh = on_hand(db, branch_id, item_id)
    cap = oh - _active_reserved_qty(db, branch_id, item_id)
    if cap <= 0:
        return 0

    rows = db.execute(
        select(Reservation.id, Reservation.qty)
        .where(
            Reservation.branch_id == branch_id,
            Reservation.item_id == item_id,
            Reservation.status == "hold",
        )
        .order_by(Reservation.created_at.asc())
        .limit(1000)
    ).all()

    activated = 0
    now = sa.func.now()
    for r in rows:
        q = int(r.qty)
        if q > cap:
            break
        end = sa.func.now() + sa.text("interval '14 days'")
        db.execute(
            sa.update(Reservation)
            .where(Reservation.id == r.id)
            .values(
                status="active",
                hold_window=sa.func.tstzrange(now, end, "[)"),
                notified_at=sa.func.now(),
            )
        )
        try:
            ensure_queued_ready(db, reservation_id=r.id)
        except Exception:
            pass
        cap -= q
        activated += 1

    return activated

def on_hand(db: Session, branch_id: _UUID, item_id: _UUID) -> int:
    q = (
        select(func.coalesce(func.sum(StockLedger.qty), 0))
        .where(
            StockLedger.branch_id == branch_id,
            StockLedger.item_id == item_id,
            StockLedger.event.notin_(_PHYSICAL_EXCLUDE),
        )
    )
    return int(db.execute(q).scalar_one())

def reserved_qty(db: Session, branch_id: _UUID, item_id: _UUID) -> int:
    q = (
        select(func.coalesce(func.sum(Reservation.qty), 0))
        .where(
            Reservation.branch_id == branch_id,
            Reservation.item_id == item_id,
            Reservation.status.in_(("hold", "active")),
        )
    )
    return int(db.execute(q).scalar_one())

def get_inventory_summary(db: Session, branch_id: _UUID, item_id: _UUID) -> dict:
    oh = on_hand(db, branch_id, item_id)
    rq = reserved_qty(db, branch_id, item_id)
    return {
        "branch_id": branch_id,
        "item_id": item_id,
        "on_hand": oh,
        "reserved": rq,
        "available": oh - rq,
    }

def receive_stock(db: Session, *, branch_id: _UUID, item_id: _UUID, qty: int) -> dict:
    if qty <= 0:
        raise ValueError("qty must be > 0")
    db.execute(
        insert(StockLedger).values(
            branch_id=branch_id,
            item_id=item_id,
            event="receive",
            qty=int(qty),
            ref_type="receipt",
        )
    )
    db.commit()

    try:
        _activate_oldest_holds(db, branch_id, item_id)
        db.commit()
    except Exception:
        db.rollback()

    return get_inventory_summary(db, branch_id, item_id)

def adjust_stock(
    db: Session, *, branch_id: _UUID, item_id: _UUID, delta: int, reason: str | None = None
) -> dict:
    if delta == 0:
        raise ValueError("delta must be non-zero")

    oh = on_hand(db, branch_id, item_id)
    rq = reserved_qty(db, branch_id, item_id)
    new_oh = oh + int(delta)
    if new_oh < rq:
        raise ValueError(f"Adjustment would make on_hand {new_oh} below reserved {rq}")

    adj_id = db.execute(
        insert(Adjustment)
        .values(
            branch_id=branch_id,
            item_id=item_id,
            delta_on_hand=int(delta),
            reason=reason or "manual_adjustment",
        )
        .returning(Adjustment.id)
    ).scalar_one()

    db.execute(
        insert(StockLedger).values(
            branch_id=branch_id,
            item_id=item_id,
            event="adjust",
            qty=int(delta),
            ref_type="adjustment",
        )
    )
    db.commit()
    return get_inventory_summary(db, branch_id, item_id)

def transfer_stock(
    db: Session, *,
    from_branch_id: _UUID,
    to_branch_id: _UUID,
    item_id: _UUID,
    qty: int
) -> dict:
    if qty <= 0:
        raise ValueError("qty must be > 0")

    available = on_hand(db, from_branch_id, item_id) - reserved_qty(db, from_branch_id, item_id)
    if available < qty:
        raise ValueError("Not enough available stock to transfer")

    now = sa.func.now()

    db.execute(
        insert(StockLedger).values(
            branch_id=from_branch_id,
            item_id=item_id,
            event="transfer_out",
            qty=-int(qty),
            at=now,
            ref_type="transfer",
        )
    )
    db.execute(
        insert(StockLedger).values(
            branch_id=to_branch_id,
            item_id=item_id,
            event="transfer_in",
            qty=int(qty),
            at=now,
            ref_type="transfer",
        )
    )
    db.commit()
    return {
        "from_summary": get_inventory_summary(db, branch_id=from_branch_id, item_id=item_id),
        "to_summary":   get_inventory_summary(db, branch_id=to_branch_id,   item_id=item_id),
    }
