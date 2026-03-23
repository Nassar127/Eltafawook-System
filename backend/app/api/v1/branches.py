from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import insert, select, func
from backend.app.db.session import get_db
from backend.app.models.branch import Branch
from backend.app.schemas.branch import BranchCreate, BranchOut
from backend.app.models.user import User
from backend.app.schemas.pagination import PaginationParams
from .auth import get_current_active_user

router = APIRouter()

@router.post("", response_model=BranchOut, status_code=201)
def create_branch(body: BranchCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    exists = db.execute(select(Branch).where(Branch.code == body.code)).scalar_one_or_none()
    if exists:
        raise HTTPException(status_code=409, detail="Branch code already exists")

    row = db.execute(
        insert(Branch).values(code=body.code, name=body.name).returning(Branch)
    ).scalar_one()
    db.commit()
    return row

@router.get("")
def list_branches(
    pg: PaginationParams = Depends(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    q = select(Branch)
    total = db.execute(select(func.count()).select_from(q.subquery())).scalar() or 0
    rows = db.execute(q.order_by(Branch.code).offset(pg.offset).limit(pg.limit)).scalars().all()
    return {"items": rows, "total": total, "offset": pg.offset, "limit": pg.limit, "has_more": pg.offset + pg.limit < total}