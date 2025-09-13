from __future__ import annotations
from uuid import UUID
from datetime import datetime
import sqlalchemy as sa
from sqlalchemy import func, text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from backend.app.db.base import Base

class User(Base):
    __tablename__ = "users"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    username: Mapped[str] = mapped_column(sa.Text, unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(sa.Text, nullable=False)
    role: Mapped[str] = mapped_column(sa.Text, nullable=False)
    branch_id: Mapped[UUID | None] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("branches.id"), nullable=True)
    
    is_active: Mapped[bool] = mapped_column(sa.Boolean, default=True, server_default=sa.text("true"))
    created_at: Mapped[datetime] = mapped_column(sa.TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    branch = relationship("Branch")

    __table_args__ = (
        sa.CheckConstraint(role.in_(['admin', 'banha_staff', 'qaliub_staff']), name='ck_user_role'),
    )