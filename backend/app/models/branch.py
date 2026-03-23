from __future__ import annotations
from datetime import datetime, time
from uuid import UUID

import sqlalchemy as sa
from sqlalchemy import func, text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.db.base import Base


class Branch(Base):
    __tablename__ = "branches"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    code: Mapped[str] = mapped_column(sa.Text, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(sa.Text, nullable=False)

    closing_time_local: Mapped[time] = mapped_column(sa.Time(timezone=False), nullable=False, server_default=text("'20:00'::time"))
    report_send_offset_minutes: Mapped[int] = mapped_column(sa.Integer, nullable=False, server_default="30")

    is_active: Mapped[bool] = mapped_column(sa.Boolean, nullable=False, server_default=text("true"))
    created_at: Mapped[datetime] = mapped_column(sa.TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(sa.TIMESTAMP(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
