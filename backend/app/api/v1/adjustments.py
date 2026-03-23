from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import date
from uuid import UUID

from backend.app.db.session import get_db
from backend.app.schemas.adjustment import ReceiveRequest, AdjustRequest
from backend.app.schemas.inventory import InventorySummary
from backend.app.services.inventory_service import receive_stock, adjust_stock

from backend.app.models.revenue_adjustment import RevenueAdjustment
from backend.app.models.user import User
from backend.app.schemas.revenue_adjustment import RevenueAdjustmentCreate, RevenueAdjustmentOut, Context
from sqlalchemy import select, insert, func
from backend.app.schemas.pagination import PaginationParams
from .auth import get_current_active_user

router = APIRouter()

@router.post("/receive", response_model=InventorySummary, status_code=201)
def receive(body: ReceiveRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    try:
        return receive_stock(db, branch_id=body.branch_id, item_id=body.item_id, qty=body.qty)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))

@router.post("/adjust", response_model=InventorySummary, status_code=201)
def adjust(body: AdjustRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    try:
        return adjust_stock(
            db,
            branch_id=body.branch_id,
            item_id=body.item_id,
            delta=body.delta,
            reason=body.reason,
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    
@router.post("/revenue", response_model=RevenueAdjustmentOut, status_code=201)
def create_revenue_adjustment(body: RevenueAdjustmentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    if body.amount_cents == 0:
        raise HTTPException(status_code=400, detail="Adjustment amount cannot be zero")
    
    row = db.execute(
        insert(RevenueAdjustment).values(**body.model_dump()).returning(RevenueAdjustment)
    ).scalar_one()
    db.commit()
    return row

@router.get("/revenue")
def list_revenue_adjustments(
    branch_id: UUID = Query(...),
    start_date: date = Query(...), 
    end_date: date = Query(...),
    context: Context = Query(...),
    pg: PaginationParams = Depends(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    q = select(RevenueAdjustment).where(
        RevenueAdjustment.branch_id == branch_id,
        RevenueAdjustment.adjustment_date >= start_date,
        RevenueAdjustment.adjustment_date <= end_date,
        RevenueAdjustment.context == context,
    )
    total = db.execute(select(func.count()).select_from(q.subquery())).scalar() or 0
    rows = db.execute(q.order_by(RevenueAdjustment.created_at.desc()).offset(pg.offset).limit(pg.limit)).scalars().all()
    return {"items": rows, "total": total, "offset": pg.offset, "limit": pg.limit, "has_more": pg.offset + pg.limit < total}