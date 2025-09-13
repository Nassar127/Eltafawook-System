import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from backend.app.db.base import Base
from uuid import UUID
from datetime import datetime

class KgSale(Base):
    __tablename__ = "kg_sales"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()"))
    branch_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), sa.ForeignKey("branches.id", ondelete="RESTRICT"))
    kg_student_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), sa.ForeignKey("kg_students.id", ondelete="RESTRICT"))
    kg_item_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), sa.ForeignKey("kg_items.id", ondelete="RESTRICT"))
    
    qty: Mapped[int] = mapped_column(sa.Integer)
    unit_price_cents: Mapped[int] = mapped_column(sa.Integer)
    total_cents: Mapped[int] = mapped_column(sa.Integer)
    
    sold_at: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()"))

    __table_args__ = (
        sa.CheckConstraint('qty > 0', name='ck_kg_sales_qty_positive'),
    )