from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import insert, select, func
from backend.app.db.session import get_db
from backend.app.models.teacher import Teacher
from backend.app.models.user import User
from backend.app.schemas.teacher import TeacherCreate, TeacherOut
from backend.app.schemas.pagination import PaginationParams
from .auth import get_current_active_user

router = APIRouter()

@router.post("", response_model=TeacherOut, status_code=201)
def create_teacher(body: TeacherCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    row = db.execute(
        insert(Teacher).values(
            name=body.name, subject=body.subject
        ).returning(Teacher)
    ).scalar_one()
    db.commit()
    return row

@router.get("")
def list_teachers(pg: PaginationParams = Depends(), db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    q = select(Teacher)
    total = db.execute(select(func.count()).select_from(q.subquery())).scalar() or 0
    rows = db.execute(q.order_by(Teacher.name).offset(pg.offset).limit(pg.limit)).scalars().all()
    return {"items": rows, "total": total, "offset": pg.offset, "limit": pg.limit, "has_more": pg.offset + pg.limit < total}
