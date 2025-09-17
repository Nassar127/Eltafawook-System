from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo
from uuid import UUID as PyUUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import cast

from backend.app.db.session import get_db
from backend.app.models.branch import Branch
from backend.app.models.user import User
from backend.app.schemas.kg_report import KgDailySalesOut, KgDetailedSalesReportOut, KgDetailedSalesRow, SubscriptionReportOut, SubscriptionStatusRow
from backend.app.services import kg_report_service as service
from .auth import get_current_active_user
from sqlalchemy import select


router = APIRouter()

@router.get("/subscriptions", response_model=SubscriptionReportOut)
def get_subscriptions(
    branch_id: PyUUID,
    search: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    rows = service.get_subscription_statuses(db=db, branch_id=branch_id, search_term=search)
    return SubscriptionReportOut(rows=[SubscriptionStatusRow.model_validate(row) for row in rows])


@router.get("/daily-sales", response_model=KgDailySalesOut)
def daily_sales(
    branch_id: PyUUID,
    start_date: date,
    end_date: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    return service.daily_sales_totals(db=db, branch_id=branch_id, start_date=start_date, end_date=end_date)


@router.get("/detailed-sales", response_model=KgDetailedSalesReportOut)
def get_detailed_sales(
    branch_id: PyUUID,
    start_date: date,
    end_date: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    raw_rows = service.get_detailed_sales_report(db=db, branch_id=branch_id, start_date=start_date, end_date=end_date)
    validated_rows = [KgDetailedSalesRow.model_validate(row) for row in raw_rows]

    return KgDetailedSalesReportOut(
        branch_id=branch_id,
        start_date=start_date,
        end_date=end_date,
        rows=validated_rows
    )