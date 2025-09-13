from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from backend.app.db.session import get_db
from backend.app.models.kg_items import KgItem
from backend.app.schemas.kg_item import KgItemCreate, KgItemOut, KgItemUpdate

router = APIRouter()

@router.post("", response_model=KgItemOut, status_code=201)
def create_kg_item(item_in: KgItemCreate, db: Session = Depends(get_db)):
    item_obj = KgItem(**item_in.model_dump())
    db.add(item_obj)
    db.commit()
    db.refresh(item_obj)
    return item_obj

@router.get("", response_model=list[KgItemOut])
def list_kg_items(branch_id: UUID, db: Session = Depends(get_db)):
    return db.execute(
        select(KgItem).where(KgItem.branch_id == branch_id).order_by(KgItem.name)
    ).scalars().all()