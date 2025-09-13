from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.schemas.kg_student import KgStudentCreate, KgStudentUpdate, KgStudentOut, KgStudentStatusUpdate
from backend.app.services import kg_student_service as service
from .auth import get_current_active_user
from backend.app.models.user import User

router = APIRouter()

@router.post("", response_model=KgStudentOut, status_code=201)
def create_kg_student(
    student_in: KgStudentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role != 'admin' and student_in.branch_id != current_user.branch_id:
        raise HTTPException(status_code=403, detail="Cannot create student for another branch")
    
    return service.create_kg_student(db=db, student_in=student_in)

@router.get("", response_model=list[KgStudentOut])
def list_kg_students(
    branch_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role != 'admin' and branch_id != current_user.branch_id:
        raise HTTPException(status_code=403, detail="Cannot list students for another branch")
    return service.list_kg_students(db=db, branch_id=branch_id)

@router.get("/search", response_model=list[KgStudentOut])
def search_kg_students(
    branch_id: UUID,
    term: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role != 'admin' and branch_id != current_user.branch_id:
        raise HTTPException(status_code=403, detail="Cannot search students for another branch")
    return service.search_kg_students(db=db, branch_id=branch_id, term=term)

@router.get("/pending", response_model=list[KgStudentOut])
def get_pending_kg_students(
    branch_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role != 'admin' and branch_id != current_user.branch_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    return service.list_kg_students_by_status(db=db, branch_id=branch_id, status='pending')

@router.patch("/{student_id}/status", response_model=KgStudentOut)
def update_student_status(
    student_id: UUID,
    status_in: KgStudentStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    student = service.get_kg_student(db=db, student_id=student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    if current_user.role != 'admin' and student.branch_id != current_user.branch_id:
         raise HTTPException(status_code=403, detail="Not authorized")
    
    return service.update_kg_student_status(db=db, student_id=student_id, status_in=status_in)


@router.get("/{student_id}", response_model=KgStudentOut)
def get_kg_student(
    student_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    student = service.get_kg_student(db=db, student_id=student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    if current_user.role != 'admin' and student.branch_id != current_user.branch_id:
         raise HTTPException(status_code=403, detail="Not authorized to view this student")
    return student

@router.put("/{student_id}", response_model=KgStudentOut)
def update_kg_student(
    student_id: UUID,
    student_in: KgStudentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    student = service.get_kg_student(db=db, student_id=student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    if current_user.role != 'admin' and student.branch_id != current_user.branch_id:
         raise HTTPException(status_code=403, detail="Not authorized to update this student")

    updated_student = service.update_kg_student(db=db, student_id=student_id, student_in=student_in)
    return updated_student
