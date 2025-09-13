from sqlalchemy.orm import Session
from sqlalchemy import insert, select, func
from uuid import UUID
from typing import cast

from backend.app.models.student import Student
from backend.app.models.school import School
from backend.app.models.branch import Branch
from backend.app.utils.validators import normalize_phone
from backend.app.schemas.student import StudentCreate

def _get_or_create_school_id(db: Session, student_in: StudentCreate) -> UUID:
    if student_in.school_id:
        return student_in.school_id

    if not student_in.new_school_name:
        raise ValueError("A school must be provided.")
        
    existing_school = db.execute(
        select(School).where(func.lower(School.name) == func.lower(student_in.new_school_name))
    ).scalar_one_or_none()

    if existing_school:
        return cast(UUID, existing_school.id)

    branch = db.get(Branch, student_in.branch_id)
    if not branch:
        raise ValueError("Invalid branch_id provided.")

    new_school = School(name=student_in.new_school_name, city=branch.name)
    db.add(new_school)
    db.flush()
    
    return cast(UUID, new_school.id)

def create_student(db: Session, *, student_in: StudentCreate) -> Student:
    resolved_school_id = _get_or_create_school_id(db, student_in)

    student_data = student_in.model_dump(exclude={"new_school_name"})
    student_data["school_id"] = resolved_school_id
    
    student_data["phone_norm"] = normalize_phone(student_data.get("phone"))
    student_data["parent_phone_norm"] = normalize_phone(student_data.get("parent_phone"))

    student_obj = Student(**student_data)
    
    db.add(student_obj)
    db.commit()
    db.refresh(student_obj)
    return student_obj