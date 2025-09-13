import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
from backend.app.db.base import Base

ContextEnum = sa.Enum('bookstore', 'kindergarten', name='revenue_adjustment_context', create_type=False)

class RevenueAdjustment(Base):
    __tablename__ = "revenue_adjustments"

    id = sa.Column(UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()"))
    branch_id = sa.Column(UUID(as_uuid=True), sa.ForeignKey("branches.id", ondelete="RESTRICT"), nullable=False)
    
    context = sa.Column(ContextEnum, nullable=False, server_default='bookstore')
    
    adjustment_date = sa.Column(sa.Date, nullable=False)
    amount_cents = sa.Column(sa.Integer, nullable=False)
    reason = sa.Column(sa.Text, nullable=False)
    created_by = sa.Column(sa.Text) 
    created_at = sa.Column(sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()"))