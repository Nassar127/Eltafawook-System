from uuid import UUID

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.schemas.inventory import InventorySummary
from backend.app.services.inventory_service import get_inventory_summary
from backend.app.models.branch import Branch
from backend.app.models.item import Item
from backend.app.models.user import User
from .auth import get_current_active_user

router = APIRouter()

@router.get("/summary", response_model=InventorySummary)
def inventory_summary(
    branch_id: UUID = Query(..., description="Branch UUID"),
    item_id: UUID = Query(..., description="Item UUID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    return get_inventory_summary(db, branch_id, item_id)

@router.get("/summary-by-code", response_model=InventorySummary)
def inventory_summary_by_code(
    branch_code: str,
    sku: str,
    teacher_id: UUID,
    grade: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    branch_id = db.execute(
        select(Branch.id).where(Branch.code == branch_code)
    ).scalar_one_or_none()
    if not branch_id:
        raise HTTPException(status_code=404, detail="Branch not found")

    item_id = db.execute(
        select(Item.id).where(
            Item.sku == sku,
            Item.teacher_id == teacher_id,
            Item.grade == grade
        )
    ).scalar_one_or_none()

    if not item_id:
        raise HTTPException(status_code=404, detail="Item not found for this teacher and grade")

    return get_inventory_summary(db, branch_id=branch_id, item_id=item_id)
