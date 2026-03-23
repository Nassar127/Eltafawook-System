from __future__ import annotations
from datetime import datetime
from uuid import UUID

import sqlalchemy as sa
from sqlalchemy import func, text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.db.base import Base


class Teacher(Base):
    __tablename__ = "teachers"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    name: Mapped[str] = mapped_column(sa.Text, nullable=False)
    subject: Mapped[str] = mapped_column(sa.Text, nullable=False)

    is_active: Mapped[bool] = mapped_column(sa.Boolean, nullable=False, server_default=text("true"))
    created_at: Mapped[datetime] = mapped_column(sa.TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(sa.TIMESTAMP(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        sa.Index("ix_teachers_name", "name"),
        sa.Index("ix_teachers_subject", "subject"),
    )
