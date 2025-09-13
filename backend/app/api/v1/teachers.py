from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import insert, select
from backend.app.db.session import get_db
from backend.app.models.teacher import Teacher
from backend.app.schemas.teacher import TeacherCreate, TeacherOut

router = APIRouter()

@router.post("", response_model=TeacherOut, status_code=201)
def create_teacher(body: TeacherCreate, db: Session = Depends(get_db)):
    row = db.execute(
        insert(Teacher).values(
            name=body.name, subject=body.subject
        ).returning(Teacher)
    ).scalar_one()
    db.commit()
    return row

@router.get("", response_model=list[TeacherOut])
def list_teachers(db: Session = Depends(get_db)):
    return db.execute(select(Teacher).order_by(Teacher.name)).scalars().all()
