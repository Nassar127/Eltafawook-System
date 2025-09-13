from __future__ import annotations
from uuid import UUID
from sqlalchemy import insert
from sqlalchemy.orm import Session

from backend.app.models.order import Order, OrderLine
from backend.app.models.ledger import StockLedger
from backend.app.services.inventory_service import on_hand, reserved_qty, get_inventory_summary

def create_quick_sale(db: Session, *, branch_id: UUID, item_id: UUID, qty: int) -> tuple[UUID, UUID]:
    if qty <= 0:
        raise ValueError("qty must be > 0")

    available = on_hand(db, branch_id, item_id) - reserved_qty(db, branch_id, item_id)
    if available < qty:
        raise ValueError("Not enough available stock")

    order_id = db.execute(
        insert(Order).values(branch_id=branch_id).returning(Order.id)
    ).scalar_one()

    line_id = db.execute(
        insert(OrderLine)
        .values(order_id=order_id, item_id=item_id, qty=int(qty), unit_price_cents=0, line_total_cents=0)
        .returning(OrderLine.id)
    ).scalar_one()

    db.execute(
        insert(StockLedger).values(
            branch_id=branch_id,
            item_id=item_id,
            event="ship",
            qty=-int(qty),
            ref_type="order",
            ref_id=order_id,
        )
    )

    db.commit()
    return order_id, line_id
