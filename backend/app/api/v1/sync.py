from uuid import UUID
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select

from backend.app.models.reservation import Reservation
from backend.app.models.item import Item
from backend.app.services.inventory_service import get_inventory_summary
from backend.app.db.session import get_db
from backend.app.services.reservation_service import (
    create_reservation,
    prepay_reservation,
    mark_ready_reservation,
    cancel_reservation,
    fulfill_reservation,
    get_reservation_summary,
)

router = APIRouter()

def _uuid(payload: dict[str, Any], key: str) -> UUID:
    v = payload.get(key)
    if not v:
        raise ValueError(f"Missing {key}")
    return UUID(v)

def _uuid_opt(payload: dict[str, Any], key: str) -> UUID | None:
    v = payload.get(key)
    return UUID(v) if v else None

def _resolve_pricing(db: Session, *, item_id: UUID, payload: dict[str, Any]) -> tuple[int, int]:
    """
    Decide unit_price_cents and prepaid_cents for the reservation.
    - If the client provided unit_price_cents, use it; otherwise fall back to Item.default_price_cents.
    - prepaid_cents defaults to 0 unless provided by the client.
    """

    if "unit_price_cents" in payload and payload["unit_price_cents"] is not None:
        unit_price_cents = int(payload["unit_price_cents"])
    else:
        unit_price_cents = db.execute(
            select(Item.default_price_cents).where(Item.id == item_id)
        ).scalar_one_or_none()
        if unit_price_cents is None:
            raise HTTPException(status_code=400, detail="Unknown item_id (no price found)")
        unit_price_cents = int(unit_price_cents)

    prepaid_cents = int(payload.get("prepaid_cents") or 0)
    if prepaid_cents < 0:
        raise HTTPException(status_code=400, detail="prepaid_cents must be >= 0")

    return unit_price_cents, prepaid_cents

def _op_reservation_create(db: Session, payload: dict[str, Any]) -> dict[str, Any]:
    """
    payload: {
        branch_id, item_id, qty, hold_minutes?, student_id?,
        unit_price_cents?, prepaid_cents?, payment_method?, payer_reference?, payment_proof_id?, payment_proof_url?
    }
    Returns reservation summary (joined view).
    """
    item_id = _uuid(payload, "item_id")
    unit_price_cents, prepaid_cents = _resolve_pricing(db, item_id=item_id, payload=payload)

    res_id = create_reservation(
        db,
        branch_id=_uuid(payload, "branch_id"),
        item_id=item_id,
        qty=int(payload["qty"]),
        unit_price_cents=unit_price_cents,
        prepaid_cents=prepaid_cents,
        hold_minutes=int(payload.get("hold_minutes", 120)),
        student_id=_uuid_opt(payload, "student_id"),
        payment_method=payload.get("payment_method"),
        payer_reference=payload.get("payer_reference"),
        payment_proof_id=payload.get("payment_proof_id"),
        payment_proof_url=payload.get("payment_proof_url"),
    )
    return get_reservation_summary(db, reservation_id=res_id)
def _op_reservation_prepay(db: Session, payload: dict[str, Any]) -> dict[str, Any]:
    """
    payload: { reservation_id, unit_price_cents, prepaid_cents? }
    """
    return prepay_reservation(
        db,
        reservation_id=_uuid(payload, "reservation_id"),
        unit_price_cents=int(payload["unit_price_cents"]),
        prepaid_cents=(int(payload["prepaid_cents"]) if "prepaid_cents" in payload else None),
    )

def _op_reservation_mark_ready(db: Session, payload: dict[str, Any]) -> dict[str, Any]:
    """
    payload: { reservation_id, notify? }
    """
    return mark_ready_reservation(
        db,
        reservation_id=_uuid(payload, "reservation_id"),
        notify=bool(payload.get("notify", True)),
    )

def _op_reservation_cancel(db: Session, payload: dict[str, Any]) -> dict[str, bool]:
    """
    payload: { reservation_id }
    """
    cancel_reservation(db, reservation_id=_uuid(payload, "reservation_id"))
    return {"cancelled": True}

def _op_reservation_fulfill(db: Session, payload: dict[str, Any]) -> dict[str, Any]:
    """
    payload: { reservation_id }
    Returns sale payload including inventory snapshot.
    """
    res_id = _uuid(payload, "reservation_id")

    out = fulfill_reservation(db, reservation_id=res_id)

    row = db.execute(
        select(Reservation.branch_id, Reservation.item_id).where(Reservation.id == res_id)
    ).one_or_none()
    if row:
        out["inventory"] = get_inventory_summary(db, row.branch_id, row.item_id)

    return out



_OPS = {
    "reservation.create": _op_reservation_create,
    "reservation.prepay": _op_reservation_prepay,
    "reservation.mark_ready": _op_reservation_mark_ready,
    "reservation.cancel": _op_reservation_cancel,
    "reservation.fulfill": _op_reservation_fulfill,
}

@router.post("/batch")
def sync_batch(body: dict[str, Any], db: Session = Depends(get_db)) -> dict[str, Any]:
    ops = body.get("operations") or []
    results: list[dict[str, Any]] = []

    for entry in ops:
        op_id = entry.get("id")
        opname = entry.get("op")
        payload = entry.get("payload") or {}
        try:
            handler = _OPS[opname]
        except KeyError:
            results.append({"id": op_id, "ok": False, "result": None, "error": f"unknown op: {opname}"})
            continue

        try:
            out = handler(db, payload)
            results.append({"id": op_id, "ok": True, "result": out, "error": None})
        except Exception as e:
            results.append({"id": op_id, "ok": False, "result": None, "error": str(e)})

    return {"results": results}
