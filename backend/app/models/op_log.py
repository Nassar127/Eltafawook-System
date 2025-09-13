from __future__ import annotations
from uuid import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB
import sqlalchemy as sa
from backend.app.db.base import Base

class OpLog(Base):
    __tablename__ = "op_log"

    id: Mapped[UUID]           = mapped_column(PG_UUID(as_uuid=True), primary_key=True)
    op_type: Mapped[str]       = mapped_column(sa.Text, nullable=False)
    request: Mapped[dict]      = mapped_column(JSONB, nullable=False)
    response: Mapped[dict | None] = mapped_column(JSONB)
    status: Mapped[str]        = mapped_column(sa.Text, nullable=False)
    error: Mapped[str | None]  = mapped_column(sa.Text)
    created_at: Mapped["sa.DateTime"] = mapped_column(
        sa.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False
    )
