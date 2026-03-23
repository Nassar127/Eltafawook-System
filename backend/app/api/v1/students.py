from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import select, or_, func
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.models.student import Student
from backend.app.models.user import User
from backend.app.schemas.student import StudentCreate, StudentUpdate, StudentOut
from backend.app.schemas.pagination import PaginationParams
from typing import Optional, cast
from uuid import UUID
from backend.app.services import student_service as service
from .auth import get_current_active_user

router = APIRouter()

def _to_phone_norm(e164: str | None) -> str | None:
    if not e164:
        return None
    if e164.startswith("+20"):
        return "0" + e164[3:]
    return e164

@router.post("", response_model=StudentOut, status_code=201)
def create_student(payload: StudentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    try:
        student = service.create_student(db=db, student_in=payload)
        return student
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/search")
def search_students(
    q: str | None = None,
    phone: str | None = None,
    parent_phone: str | None = None,
    public_id: int | None = None,
    pg: PaginationParams = Depends(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    stmt = select(Student)

    if public_id is not None:
        stmt = stmt.where(Student.public_id == public_id)
    if phone:
        phone_e164 = phone if phone.startswith("+20") else (f"+20{phone[1:]}" if phone.startswith("0") else phone)
        phone_norm = _to_phone_norm(phone_e164 if phone_e164.startswith("+20") else phone)
        stmt = stmt.where(or_(Student.phone == phone_e164, Student.phone_norm == phone_norm))
    if parent_phone:
        p_e164 = parent_phone if parent_phone.startswith("+20") else (f"+20{parent_phone[1:]}" if parent_phone.startswith("0") else parent_phone)
        p_norm = _to_phone_norm(p_e164 if p_e164.startswith("+20") else parent_phone)
        stmt = stmt.where(or_(Student.parent_phone == p_e164, Student.parent_phone_norm == p_norm))
    if q:
        stmt = stmt.where(func.lower(Student.full_name).like(f"%{q.lower()}%"))

    total = db.execute(select(func.count()).select_from(stmt.subquery())).scalar() or 0
    rows = db.execute(stmt.order_by(Student.full_name).offset(pg.offset).limit(pg.limit)).scalars().all()
    return {"items": rows, "total": total, "offset": pg.offset, "limit": pg.limit, "has_more": pg.offset + pg.limit < total}

@router.put("/{student_id}", response_model=StudentOut)
def update_student(student_id: UUID, payload: StudentUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    st = db.get(Student, student_id)
    if not st:
        raise HTTPException(status_code=404, detail="Student not found")

    data = payload.model_dump()

    phone_e164 = data.get("phone")
    parent_e164 = data.get("parent_phone")
    st.phone = data["phone"]
    setattr(st, "phone_norm", _to_phone_norm(cast(Optional[str], st.phone)))
    setattr(st, "parent_phone", data.get("parent_phone"))
    setattr(st, "parent_phone_norm", _to_phone_norm(cast(Optional[str], st.parent_phone)))
    st.full_name = data["full_name"]
    st.school_id = data["school_id"]
    st.gender = data["gender"]
    st.grade = data["grade"]
    st.branch_id = data["branch_id"]
    st.section = data["section"]
    st.whatsapp_opt_in = data["whatsapp_opt_in"]

    db.flush()
    db.commit()
    db.refresh(st)
    return st

@router.get("/{student_id}", response_model=StudentOut)
def get_student_by_id(student_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    """
    Fetch a single student by their UUID.
    """
    student = db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student