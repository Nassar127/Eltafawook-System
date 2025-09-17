from datetime import date, timedelta
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

def get_subscription_statuses(db: Session, *, branch_id: PyUUID, search_term: str | None = None) -> list[dict]:
    # This CTE finds the most recent 'service' sale for each student
    # FIX: Using literal_column() to construct the WHERE clause. This is the definitive
    # way to handle a nullable parameter in a raw text query with SQLAlchemy.
    search_clause = "TRUE" # Default to a condition that is always true
    if search_term:
        search_clause = "student_name ILIKE :search_term OR parent_phone LIKE :search_term"
        
    query = text(f"""
        WITH ranked_sales AS (
            SELECT
                s.kg_student_id,
                s.sold_at,
                i.name as item_name,
                st.full_name as student_name,
                st.father_phone as parent_phone,
                ROW_NUMBER() OVER(PARTITION BY s.kg_student_id ORDER BY s.sold_at DESC) as rn
            FROM kg_sales s
            JOIN kg_items i ON s.kg_item_id = i.id
            JOIN kg_students st ON s.kg_student_id = st.id
            WHERE i.item_type IN ('morning_service', 'evening_service')
            AND s.branch_id = :branch_id
        )
        SELECT
            student_name,
            parent_phone,
            sold_at as last_payment_date,
            item_name as last_used_plan
        FROM ranked_sales
        WHERE rn = 1
        AND ({search_clause})
        ORDER BY last_payment_date ASC;
    """)

    params = {
        "branch_id": str(branch_id),
        "search_term": f"%{search_term}%" if search_term else None
    }
    
    rows = db.execute(query, params).mappings().all()

    # The rest of the function remains the same
    results = []
    for row in rows:
        row_dict = dict(row)
        duration_days = 30
        plan_name = row.last_used_plan.lower()

        if "اسبوع" in plan_name and "3" in plan_name:
            duration_days = 21
        elif "نصف شهر" in plan_name:
            duration_days = 15
        elif "اسبوع" in plan_name:
            duration_days = 7
        elif "إستضافة" in plan_name or "estedafa" in plan_name:
            duration_days = 1
        
        last_payment = row.last_payment_date
        next_payment = last_payment.date() + timedelta(days=duration_days)
        
        row_dict["next_payment_date"] = next_payment
        results.append(row_dict)
        
    return results
