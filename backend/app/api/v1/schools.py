from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import insert, select, func

from backend.app.db.session import get_db
from backend.app.models.school import School
from backend.app.schemas.school import SchoolCreate, SchoolOut

from backend.app.models.user import User
from backend.app.schemas.pagination import PaginationParams
from .auth import get_current_active_user

router = APIRouter()

@router.post("", response_model=SchoolOut, status_code=201)
def create_school(body: SchoolCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    exists = db.execute(select(School.id).where(School.name == body.name)).scalar_one_or_none()
    if exists:
        raise HTTPException(status_code=409, detail="School already exists")
    row = db.execute(
        insert(School).values(name=body.name, city=body.city).returning(School)
    ).scalar_one()
    db.commit()
    return row

@router.get("", response_model=dict)
def list_schools(
    pg: PaginationParams = Depends(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    q = select(School)
    total = db.execute(select(func.count()).select_from(q.subquery())).scalar() or 0
    rows = db.execute(q.order_by(School.name).offset(pg.offset).limit(pg.limit)).scalars().all()
    return {"items": rows, "total": total, "offset": pg.offset, "limit": pg.limit, "has_more": pg.offset + pg.limit < total}