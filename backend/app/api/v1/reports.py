from datetime import datetime, date, timedelta, timezone
from zoneinfo import ZoneInfo
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session
from typing import cast
from uuid import UUID as PyUUID

from backend.app.db.session import get_db
from backend.app.models.branch import Branch
from backend.app.models.user import User
from backend.app.schemas.report import BranchInventory, DailyActivity, DailySalesOut, DetailedSalesReportOut, DetailedSalesRow
from backend.app.services import report_service
from .auth import get_current_active_user

router = APIRouter()

@router.get("/branch-inventory", response_model=BranchInventory)
def branch_inventory(
    branch_code: str = Query(..., description="Branch code, e.g. CAI"),
    sku: str | None = Query(None, description="Optional SKU to filter"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    b = report_service.branch_by_code(db, branch_code)
    if not b:
        raise HTTPException(status_code=404, detail="Branch not found")
    
    branch_id = cast(PyUUID, b.id)
    payload = report_service.branch_inventory_snapshot(db, branch_id=branch_id, sku=sku)
    return {
        "branch_id": b.id,
        "branch_code": b.code,
        "items": payload["items"],
    }

@router.get("/daily-activity", response_model=DailyActivity)
def daily_activity(
    branch_code: str = Query(..., description="Branch code, e.g. CAI"),
    day: date | None = Query(None, description="YYYY-MM-DD; defaults to today"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    b = report_service.branch_by_code(db, branch_code)
    if not b:
        raise HTTPException(status_code=404, detail="Branch not found")

    if day is None:
        day = date.today()
    start = datetime.combine(day, datetime.min.time())
    end = start + timedelta(days=1)

    branch_id = cast(PyUUID, b.id)
    sums = report_service.daily_branch_activity(db, branch_id=branch_id, start=start, end=end)
    return {
        "branch_id": b.id,
        "branch_code": b.code,
        "start": start.isoformat(),
        "end": end.isoformat(),
        **sums,
    }

@router.get("/daily-sales", response_model=DailySalesOut)
def daily_sales(
    branch_code: str | None = Query(default=None),
    branch_id: PyUUID | None = Query(default=None),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if start_date is None:
        cairo = ZoneInfo("Africa/Cairo")
        today = datetime.now(timezone.utc).astimezone(cairo).date()
        start_date = today
        end_date = today

    if not branch_id and not branch_code:
        raise HTTPException(status_code=400, detail="Provide branch_code or branch_id")
    
    if not branch_id and branch_code:
        b = db.execute(select(Branch.id).where(Branch.code == branch_code)).first()
        if not b:
            raise HTTPException(status_code=404, detail="Branch not found")
        branch_id = cast(PyUUID, b[0])

    assert branch_id is not None
    assert start_date is not None
    assert end_date is not None

    return report_service.daily_sales_totals(
        db, 
        branch_id=branch_id, 
        start_date=start_date, 
        end_date=end_date
    )

@router.get("/detailed-sales", response_model=DetailedSalesReportOut)
def get_detailed_sales(
    branch_id: PyUUID,
    start_date: date,
    end_date: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    raw_rows = report_service.get_detailed_sales_report(
        db, branch_id=branch_id, start_date=start_date, end_date=end_date
    )
    validated_rows = [DetailedSalesRow.model_validate(row) for row in raw_rows]

    return DetailedSalesReportOut(
        branch_id=branch_id,
        start_date=start_date,
        end_date=end_date,
        rows=validated_rows
    )

