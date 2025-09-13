from uuid import UUID
from sqlalchemy import insert
from sqlalchemy.orm import Session

from backend.app.models.ledger import StockLedger
from backend.app.services.inventory_service import on_hand, reserved_qty, get_inventory_summary

def transfer_stock(
    db: Session,
    *,
    from_branch_id: UUID,
    to_branch_id: UUID,
    item_id: UUID,
    qty: int,
) -> dict:
    if qty <= 0:
        raise ValueError("qty must be > 0")
    if from_branch_id == to_branch_id:
        raise ValueError("from_branch_id and to_branch_id must be different")

    available = on_hand(db, from_branch_id, item_id) - reserved_qty(db, from_branch_id, item_id)
    if available < qty:
        raise ValueError("Not enough available stock to transfer")

    db.execute(
        insert(StockLedger).values(
            branch_id=from_branch_id,
            item_id=item_id,
            event="transfer_out",
            qty=-qty,
            ref_type="transfer",
        )
    )
    db.execute(
        insert(StockLedger).values(
            branch_id=to_branch_id,
            item_id=item_id,
            event="transfer_in",
            qty=qty,
            ref_type="transfer",
        )
    )
    db.commit()

    return {
        "from_summary": get_inventory_summary(db, from_branch_id, item_id),
        "to_summary": get_inventory_summary(db, to_branch_id, item_id),
    }
