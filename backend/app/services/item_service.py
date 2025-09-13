from typing import Optional
from uuid import UUID
from sqlalchemy import select, insert, func
from sqlalchemy.orm import Session
from backend.app.models.item import Item

def get_or_create_item(
    db: Session, *,
    teacher_id: UUID,
    sku: str,
    name: Optional[str] = None,
    default_price_cents: int = 0,
) -> UUID:
    existing = db.execute(
        select(Item.id).where(
            Item.teacher_id == teacher_id,
            func.lower(Item.sku) == func.lower(sku),
        )
    ).scalar_one_or_none()
    if existing:
        print(f"Fetched existing item {sku} for teacher {teacher_id}")
        return existing

    new_id = db.execute(
        insert(Item).values(
            teacher_id=teacher_id,
            sku=sku,
            name=name or sku,
            default_price_cents=default_price_cents,
        ).returning(Item.id)
    ).scalar_one()
    db.commit()
    return new_id
