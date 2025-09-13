from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import insert, select
from backend.app.db.session import get_db
from backend.app.models.branch import Branch
from backend.app.schemas.branch import BranchCreate, BranchOut
from backend.app.models.user import User
from .auth import get_current_active_user

router = APIRouter()

@router.post("", response_model=BranchOut, status_code=201)
def create_branch(body: BranchCreate, db: Session = Depends(get_db)):
    exists = db.execute(select(Branch).where(Branch.code == body.code)).scalar_one_or_none()
    if exists:
        raise HTTPException(status_code=409, detail="Branch code already exists")

    row = db.execute(
        insert(Branch).values(code=body.code, name=body.name).returning(Branch)
    ).scalar_one()
    db.commit()
    return row

@router.get("", response_model=list[BranchOut])
def list_branches(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    rows = db.execute(select(Branch).order_by(Branch.code)).scalars().all()
    return rows