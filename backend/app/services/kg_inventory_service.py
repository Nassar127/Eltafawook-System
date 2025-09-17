from uuid import UUID
from sqlalchemy import select, func, insert
from sqlalchemy.orm import Session
from backend.app.models.kg_inventory_ledger import KgInventoryLedger

def get_kg_on_hand(db: Session, *, branch_id: UUID, kg_item_id: UUID) -> int:
    result = db.execute(
        select(func.coalesce(func.sum(KgInventoryLedger.qty), 0))
        .where(
            KgInventoryLedger.branch_id == branch_id,
            KgInventoryLedger.kg_item_id == kg_item_id
        )
    ).scalar_one()
    return int(result)

def get_inventory_summary(db: Session, *, branch_id: UUID, kg_item_id: UUID) -> dict:
    on_hand = get_kg_on_hand(db=db, branch_id=branch_id, kg_item_id=kg_item_id)
    return {"on_hand": on_hand, "reserved": 0, "available": on_hand}

def receive_kg_stock(db: Session, *, branch_id: UUID, kg_item_id: UUID, qty: int) -> dict:
    if qty <= 0:
        raise ValueError("Quantity must be positive")
    
    db.execute(
        insert(KgInventoryLedger).values(
            branch_id=branch_id,
            kg_item_id=kg_item_id,
            event='receive',
            qty=qty
        )
    )
    db.commit()
    
    on_hand = get_kg_on_hand(db=db, branch_id=branch_id, kg_item_id=kg_item_id)
    return {"on_hand": on_hand}