"""Admin-only audit trail endpoint — surfaces the op_log table."""
from __future__ import annotations

from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.models.op_log import OpLog
from backend.app.models.user import User
from backend.app.schemas.pagination import PaginationParams
from .auth import get_current_active_user

router = APIRouter()


def _require_admin(user: User):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")


@router.get("")
def list_audit_logs(
    op_type: str | None = Query(None),
    status: str | None = Query(None),
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    pg: PaginationParams = Depends(),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    _require_admin(current_user)

    q = select(OpLog)
    if op_type:
        q = q.where(OpLog.op_type == op_type)
    if status:
        q = q.where(OpLog.status == status)
    if start_date:
        q = q.where(func.date(OpLog.created_at) >= start_date)
    if end_date:
        q = q.where(func.date(OpLog.created_at) <= end_date)

    total = db.execute(select(func.count()).select_from(q.subquery())).scalar() or 0
    rows = db.execute(
        q.order_by(OpLog.created_at.desc()).offset(pg.offset).limit(pg.limit)
    ).scalars().all()

    return {
        "items": [
            {
                "id": str(r.id),
                "op_type": r.op_type,
                "status": r.status,
                "error": r.error,
                "request": r.request,
                "response": r.response,
                "created_at": str(r.created_at),
            }
            for r in rows
        ],
        "total": total,
        "offset": pg.offset,
        "limit": pg.limit,
        "has_more": pg.offset + pg.limit < total,
    }


@router.get("/types")
def list_op_types(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    _require_admin(current_user)
    rows = db.execute(
        select(OpLog.op_type).distinct().order_by(OpLog.op_type)
    ).scalars().all()
    return {"types": rows}
