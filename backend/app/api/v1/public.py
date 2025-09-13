from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from uuid import UUID
from typing import cast

from backend.app.db.session import get_db
from backend.app.models.branch import Branch
from backend.app.schemas.kg_student import KgStudentCreate, KgApplicationCreate, KgStudentOut
from backend.app.services import kg_student_service as service

router = APIRouter()

@router.post("/kg-applications", response_model=KgStudentOut, status_code=201)
def submit_kg_application(
    application_in: KgApplicationCreate,
    db: Session = Depends(get_db)
):
    qal_branch = db.execute(select(Branch).where(Branch.code == 'QAL')).scalar_one_or_none()
    if not qal_branch:
        raise HTTPException(status_code=500, detail="Qaliub branch not configured in the system.")
    
    student_payload = KgStudentCreate(
        **application_in.model_dump(),
        branch_id=cast(UUID, qal_branch.id)
    )
    
    try:
        student = service.create_kg_student(db=db, student_in=student_payload)
        return student
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))