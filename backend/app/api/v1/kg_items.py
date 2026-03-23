from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from backend.app.db.session import get_db
from backend.app.models.kg_items import KgItem
from backend.app.models.user import User
from backend.app.schemas.kg_item import KgItemCreate, KgItemOut, KgItemUpdate
from backend.app.schemas.pagination import PaginationParams
from .auth import get_current_active_user

router = APIRouter()

@router.post("", response_model=KgItemOut, status_code=201)
def create_kg_item(item_in: KgItemCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    item_obj = KgItem(**item_in.model_dump())
    db.add(item_obj)
    db.commit()
    db.refresh(item_obj)
    return item_obj

@router.get("", response_model=dict)
def list_kg_items(branch_id: UUID, pg: PaginationParams = Depends(), db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    q = select(KgItem).where(KgItem.branch_id == branch_id)
    total = db.execute(select(func.count()).select_from(q.subquery())).scalar() or 0
    rows = db.execute(q.order_by(KgItem.name).offset(pg.offset).limit(pg.limit)).scalars().all()
    return {"items": rows, "total": total, "offset": pg.offset, "limit": pg.limit, "has_more": pg.offset + pg.limit < total}