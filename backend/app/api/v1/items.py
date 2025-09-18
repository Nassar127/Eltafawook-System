from typing import Annotated, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Path, Query
from pydantic import BaseModel, Field
from sqlalchemy import insert, select, update, func
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.models.item import Item
from backend.app.schemas.item import ItemCreate, ItemOut

router = APIRouter()

NonNegInt = Annotated[int, Field(ge=0)]


class PriceUpdate(BaseModel):
    default_price_cents: NonNegInt


def _teacher_scoped_sku_where(*, sku: str, grade: int, teacher_id: Optional[UUID]):
    """Build WHERE conditions for case-insensitive, teacher-and-grade-scoped SKU."""
    conds = [
        func.lower(Item.sku) == func.lower(sku),
        Item.grade == grade
    ]
    if teacher_id is None:
        conds.append(Item.teacher_id.is_(None))
    else:
        conds.append(Item.teacher_id == teacher_id)
    return conds


@router.post("", response_model=ItemOut, status_code=201)
def create_item(body: ItemCreate, db: Session = Depends(get_db)):
    exists = db.execute(
        select(Item.id).where(*_teacher_scoped_sku_where(
            sku=body.sku,
            grade=body.grade,
            teacher_id=body.teacher_id
        ))
    ).scalar_one_or_none()
    if exists:
        raise HTTPException(status_code=409, detail="SKU already exists for this teacher")

    values = {
        "sku": body.sku,
        "name": body.name,
        "resource_type": body.resource_type,
        "grade": body.grade,
        "teacher_id": body.teacher_id,
    }

    if hasattr(Item, "default_price_cents") and body.default_price_cents is not None:
        values["default_price_cents"] = body.default_price_cents

    row = db.execute(insert(Item).values(**values).returning(Item)).scalar_one()
    db.commit()
    return row


@router.get("", response_model=list[ItemOut])
def list_items(
    teacher_id: Optional[UUID] = Query(default=None),
    db: Session = Depends(get_db),
):
    q = select(Item)
    if teacher_id is not None:
        q = q.where(Item.teacher_id == teacher_id)
    rows = db.execute(q.order_by(func.lower(Item.sku))).scalars().all()
    return rows


@router.get("/{sku}", response_model=ItemOut)
def get_item_by_sku(
    sku: Annotated[str, Path(min_length=1)],
    teacher_id: Optional[UUID] = Query(...),
    grade: int = Query(...),
    db: Session = Depends(get_db),
):
    if teacher_id is None:
        rows = db.execute(
            select(Item).where(func.lower(Item.sku) == func.lower(sku))
        ).scalars().all()
        if not rows:
            raise HTTPException(status_code=404, detail="Item not found")
        if len(rows) > 1:
            raise HTTPException(
                status_code=409,
                detail="Multiple items use this SKU under different teachers. Pass ?teacher_id=…",
            )
        return rows[0]

    row = db.execute(
        select(Item).where(*_teacher_scoped_sku_where(
            sku=sku,
            grade=grade,
            teacher_id=teacher_id
        ))
    ).scalars().one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Item not found")
    return row


@router.patch("/{sku}/price", response_model=ItemOut)
def update_item_price(
    sku: Annotated[str, Path(min_length=1)],
    body: PriceUpdate,
    teacher_id: UUID = Query(...),
    grade: int = Query(...),
    db: Session = Depends(get_db),
):
    if not hasattr(Item, "default_price_cents"):
        raise HTTPException(status_code=400, detail="Price column not enabled in this deployment")

    if teacher_id is None:
        ids = db.execute(
            select(Item.id).where(func.lower(Item.sku) == func.lower(sku))
        ).scalars().all()
        if not ids:
            raise HTTPException(status_code=404, detail="Item not found")
        if len(ids) > 1:
            raise HTTPException(
                status_code=409,
                detail="Multiple items use this SKU under different teachers. Pass ?teacher_id=…",
            )
        target_id = ids[0]
        row = db.execute(
            update(Item)
            .where(Item.id == target_id)
            .values(default_price_cents=body.default_price_cents)
            .returning(Item)
        ).scalars().one()
    else:
        row = db.execute(
            update(Item)
            .where(*_teacher_scoped_sku_where(
                sku=sku,
                grade=grade,
                teacher_id=teacher_id
            ))
            .values(default_price_cents=body.default_price_cents)
            .returning(Item)
        ).scalars().one_or_none()
        if not row:
            raise HTTPException(status_code=404, detail="Item not found")

    db.commit()
    return row

@router.get("/by-id/{item_id}", response_model=ItemOut)
def get_item_by_id(item_id: UUID, db: Session = Depends(get_db)):
    row = db.execute(select(Item).where(Item.id == item_id)).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Item not found")
    return row