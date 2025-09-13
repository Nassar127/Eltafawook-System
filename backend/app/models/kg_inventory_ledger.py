import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from backend.app.db.base import Base
from uuid import UUID
from datetime import datetime

KgLedgerEvent = sa.Enum('receive', 'adjust', 'ship', 'return', name='kg_ledger_event', create_type=False)

class KgInventoryLedger(Base):
    __tablename__ = "kg_inventory_ledger"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()"))
    branch_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), sa.ForeignKey("branches.id", ondelete="RESTRICT"))
    kg_item_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), sa.ForeignKey("kg_items.id", ondelete="RESTRICT"))
    
    event: Mapped[str] = mapped_column(KgLedgerEvent)
    qty: Mapped[int] = mapped_column(sa.Integer)
    
    ref_id: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True))
    ref_type: Mapped[str | None] = mapped_column(sa.Text)

    created_at: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()"))