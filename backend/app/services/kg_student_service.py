from uuid import UUID
from datetime import date, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import select, update
import sqlalchemy as sa
from backend.app.models.kg_student import KgStudent
from backend.app.schemas.kg_student import KgStudentCreate, KgStudentUpdate, KgStudentStatusUpdate


def _calculate_age_at_october(birth_date: date) -> dict[str, int]:
    if not birth_date:
        return {'years': 0, 'months': 0, 'days': 0}

    target_date = date(date.today().year, 10, 1)

    years = target_date.year - birth_date.year
    months = target_date.month - birth_date.month
    days = target_date.day - birth_date.day

    if days < 0:
        months -= 1
        prev_month_end = date(target_date.year, target_date.month, 1) - timedelta(days=1)
        days += prev_month_end.day

    if months < 0:
        years -= 1
        months += 12

    return {'years': years, 'months': months, 'days': days}

def create_kg_student(db: Session, *, student_in: KgStudentCreate) -> KgStudent:
    age_data = _calculate_age_at_october(student_in.date_of_birth)

    student_data = student_in.model_dump()
    student_data['age_oct_years'] = age_data['years']
    student_data['age_oct_months'] = age_data['months']
    student_data['age_oct_days'] = age_data['days']
    student_data['status'] = 'pending'

    student_obj = KgStudent(**student_data)
    db.add(student_obj)
    db.commit()
    db.refresh(student_obj)
    return student_obj

def get_kg_student(db: Session, *, student_id: UUID) -> KgStudent | None:
    return db.get(KgStudent, student_id)

def list_kg_students(db: Session, *, branch_id: UUID) -> list[KgStudent]:
    return list(db.execute(
        select(KgStudent)
        .where(KgStudent.branch_id == branch_id)
        .order_by(KgStudent.full_name)
    ).scalars().all())

def list_kg_students_by_status(db: Session, *, branch_id: UUID, status: str) -> list[KgStudent]:
    return list(db.execute(
        select(KgStudent)
        .where(
            KgStudent.branch_id == branch_id,
            KgStudent.status == status
        )
        .order_by(KgStudent.application_date.asc())
    ).scalars().all())

def update_kg_student_status(db: Session, *, student_id: UUID, status_in: KgStudentStatusUpdate) -> KgStudent | None:
    student_obj = db.get(KgStudent, student_id)
    if not student_obj:
        return None
    
    student_obj.status = status_in.status
    db.add(student_obj)
    db.commit()
    db.refresh(student_obj)
    return student_obj

def update_kg_student(db: Session, *, student_id: UUID, student_in: KgStudentUpdate) -> KgStudent | None:
    student_obj = db.get(KgStudent, student_id)
    if not student_obj:
        return None
    
    update_data = student_in.model_dump(exclude_unset=True)
    
    if 'date_of_birth' in update_data:
        age_data = _calculate_age_at_october(update_data['date_of_birth'])
        update_data['age_oct_years'] = age_data['years']
        update_data['age_oct_months'] = age_data['months']
        update_data['age_oct_days'] = age_data['days']

    for key, value in update_data.items():
        setattr(student_obj, key, value)
        
    db.add(student_obj)
    db.commit()
    db.refresh(student_obj)
    return student_obj

def search_kg_students(db: Session, *, branch_id: UUID, term: str) -> list[KgStudent]:
    search_term = f"%{term.lower()}%"
    return list(db.execute(
        select(KgStudent).where(
            KgStudent.branch_id == branch_id,
            sa.or_(
                KgStudent.full_name.ilike(search_term),
                KgStudent.national_id.ilike(search_term),
                KgStudent.father_name.ilike(search_term),
                KgStudent.father_phone.ilike(search_term),
                KgStudent.mother_phone.ilike(search_term),
                KgStudent.guardian_name.ilike(search_term),
                KgStudent.guardian_phone.ilike(search_term)
            )
        ).order_by(KgStudent.full_name)
    ).scalars().all())