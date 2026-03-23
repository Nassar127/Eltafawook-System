from __future__ import annotations
from datetime import datetime
from typing import Optional
from uuid import UUID

import sqlalchemy as sa
from sqlalchemy import BigInteger, Identity, func, text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.db.base import Base

Gender = sa.Enum("male", "female", name="gender", create_type=False)
Section = sa.Enum("science", "math", "literature", "", name="section", create_type=False)


class Student(Base):
    __tablename__ = "students"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    full_name: Mapped[str] = mapped_column(sa.Text, nullable=False)

    phone: Mapped[Optional[str]] = mapped_column(sa.Text, nullable=True)
    phone_norm: Mapped[Optional[str]] = mapped_column(sa.Text, nullable=True)
    parent_phone: Mapped[Optional[str]] = mapped_column(sa.Text, nullable=True)
    parent_phone_norm: Mapped[Optional[str]] = mapped_column(sa.Text, nullable=True)

    school_id: Mapped[Optional[UUID]] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("schools.id", ondelete="SET NULL"), nullable=True)

    gender: Mapped[str] = mapped_column(Gender, nullable=False)
    grade: Mapped[int] = mapped_column(sa.SmallInteger, nullable=False)
    branch_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("branches.id", ondelete="RESTRICT"), nullable=False)
    section: Mapped[Optional[str]] = mapped_column(Section, nullable=True)
    whatsapp_opt_in: Mapped[bool] = mapped_column(sa.Boolean, nullable=False, server_default=text("true"))
    public_id: Mapped[int] = mapped_column(BigInteger, Identity(always=False), unique=True, index=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(sa.TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(sa.TIMESTAMP(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        sa.CheckConstraint("grade in (1,2,3)", name="ck_students_grade_123"),
        sa.Index("ix_students_phone_norm", "phone_norm"),
        sa.Index("ix_students_parent_phone_norm", "parent_phone_norm"),
        sa.Index("ix_students_name", "full_name"),
        sa.Index("ix_students_branch", "branch_id"),
        sa.CheckConstraint(r"phone ~ '^\+20(10|11|12|15)[0-9]{8}$'", name="ck_students_phone_eg"),
        sa.CheckConstraint(r"(parent_phone IS NULL) OR (parent_phone ~ '^\+20(10|11|12|15)[0-9]{8}$')",
                        name="ck_students_parent_phone_eg"),
    )