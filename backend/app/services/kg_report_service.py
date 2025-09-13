from datetime import date
from uuid import UUID as PyUUID
from sqlalchemy import select, func, text, cast, Date
from sqlalchemy.orm import Session
import sqlalchemy as sa

from backend.app.models.branch import Branch
from backend.app.models.kg_items import KgItem
from backend.app.models.kg_sale import KgSale
from backend.app.models.revenue_adjustment import RevenueAdjustment
from backend.app.schemas.kg_report import KgDailySalesOut

def daily_sales_totals(db: Session, *, branch_id: PyUUID, start_date: date, end_date: date) -> KgDailySalesOut:
    code = db.execute(select(Branch.code).where(Branch.id == branch_id)).scalar_one()

    sales_agg = db.execute(
        select(
            func.coalesce(func.sum(KgSale.total_cents), 0).label("total_cents"),
            func.count(KgSale.id).label("sales_count")
        ).where(
            KgSale.branch_id == branch_id,
            cast(KgSale.sold_at.op('AT TIME ZONE')('Africa/Cairo'), Date) >= start_date,
            cast(KgSale.sold_at.op('AT TIME ZONE')('Africa/Cairo'), Date) <= end_date
        )
    ).one()
    
    sales_total_cents = int(sales_agg.total_cents)
    sales_count = int(sales_agg.sales_count)

    adjustments_total_cents = db.execute(
        select(func.coalesce(func.sum(RevenueAdjustment.amount_cents), 0))
        .where(
            RevenueAdjustment.branch_id == branch_id,
            RevenueAdjustment.adjustment_date >= start_date,
            RevenueAdjustment.adjustment_date <= end_date,
            RevenueAdjustment.context == 'kindergarten'
        )
    ).scalar_one()

    net_total_cents = sales_total_cents + adjustments_total_cents

    return KgDailySalesOut(
        branch_id=branch_id,
        day=start_date,
        sales_count=sales_count,
        sales_total_cents=sales_total_cents,
        adjustments_total_cents=adjustments_total_cents,
        net_total_cents=net_total_cents,
        net_total_egp=round(net_total_cents / 100.0, 2),
    )

def get_detailed_sales_report(db: Session, *, branch_id: PyUUID, start_date: date, end_date: date):
    stmt = (
        select(
            KgItem.name.label("item_name"),
            func.sum(KgSale.qty).label("total_qty"),
            func.sum(KgSale.total_cents).label("total_amount_cents")
        )
        .join(KgItem, KgSale.kg_item_id == KgItem.id)
        .where(
            KgSale.branch_id == branch_id,
            cast(KgSale.sold_at.op('AT TIME ZONE')('Africa/Cairo'), Date) >= start_date,
            cast(KgSale.sold_at.op('AT TIME ZONE')('Africa/Cairo'), Date) <= end_date
        )
        .group_by(KgItem.name)
        .order_by(KgItem.name)
    )
    results = db.execute(stmt).mappings().all()
    return [dict(row) for row in results]