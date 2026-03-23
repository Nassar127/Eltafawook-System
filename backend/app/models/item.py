from __future__ import annotations
from datetime import datetime
from uuid import UUID as PyUUID

import sqlalchemy as sa
from sqlalchemy import func, text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.db.base import Base

ResourceType = sa.Enum("book", "code", "other", name="resource_type", create_type=False)


class Item(Base):
    __tablename__ = "items"

    id: Mapped[PyUUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    sku: Mapped[str] = mapped_column(sa.Text, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(sa.Text, nullable=False)

    resource_type: Mapped[str] = mapped_column(ResourceType, nullable=False)
    grade: Mapped[int] = mapped_column(sa.SmallInteger, nullable=False)
    teacher_id: Mapped[PyUUID] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("teachers.id", ondelete="RESTRICT"), nullable=False)

    default_price_cents: Mapped[int] = mapped_column(sa.Integer, nullable=False, server_default="0")
    profit_cents: Mapped[int] = mapped_column(sa.Integer, default=0, nullable=False)
    default_cost_cents: Mapped[int] = mapped_column(sa.Integer, nullable=False, server_default="0")

    active: Mapped[bool] = mapped_column(sa.Boolean, nullable=False, server_default=text("true"))

    created_at: Mapped[datetime] = mapped_column(sa.TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(sa.TIMESTAMP(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        sa.CheckConstraint("grade in (1,2,3)", name="ck_items_grade_123"),
        sa.Index("ix_items_name", "name"),
        sa.Index("ix_items_teacher_grade", "teacher_id", "grade"),
    )
