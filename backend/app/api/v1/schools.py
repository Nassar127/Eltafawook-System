from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import insert, select

from backend.app.db.session import get_db
from backend.app.models.school import School
from backend.app.schemas.school import SchoolCreate, SchoolOut

from backend.app.models.user import User
from .auth import get_current_active_user

router = APIRouter()

@router.post("", response_model=SchoolOut, status_code=201)
def create_school(body: SchoolCreate, db: Session = Depends(get_db)):
    exists = db.execute(select(School.id).where(School.name == body.name)).scalar_one_or_none()
    if exists:
        raise HTTPException(status_code=409, detail="School already exists")
    row = db.execute(
        insert(School).values(name=body.name, city=body.city).returning(School)
    ).scalar_one()
    db.commit()
    return row

@router.get("", response_model=list[SchoolOut])
def list_schools(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    return db.execute(select(School).order_by(School.name)).scalars().all()