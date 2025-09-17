import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from backend.app.db.base import Base
from uuid import UUID
from datetime import datetime

KgItemType = sa.Enum('good', 'service', 'morning_service', 'evening_service',  name='kg_item_type', create_type=False)

class KgItem(Base):
    __tablename__ = "kg_items"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()"))
    branch_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), sa.ForeignKey("branches.id", ondelete="RESTRICT"))
    sku: Mapped[str] = mapped_column(sa.Text, unique=True)
    name: Mapped[str] = mapped_column(sa.Text)
    default_price_cents: Mapped[int] = mapped_column(sa.Integer)
    created_at: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), server_default=sa.text("now()"))

    item_type: Mapped[str] = mapped_column(KgItemType, nullable=False, server_default='good')

    __table_args__ = (
        sa.CheckConstraint('default_price_cents >= 0', name='ck_kg_items_price_non_negative'),
    )