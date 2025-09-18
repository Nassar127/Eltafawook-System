import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import Mapped, mapped_column
from backend.app.db.base import Base

ResourceType = sa.Enum("book", "code", "other", name="resource_type", create_type=False)

class Item(Base):
    __tablename__ = "items"

    id = sa.Column(UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()"))
    sku = sa.Column(sa.Text, unique=True, nullable=False)
    name = sa.Column(sa.Text, nullable=False)
    description = sa.Column(sa.Text)

    resource_type = sa.Column(ResourceType, nullable=False)
    grade = sa.Column(sa.SmallInteger, nullable=False)
    teacher_id = sa.Column(UUID(as_uuid=True), sa.ForeignKey("teachers.id", ondelete="RESTRICT"), nullable=False)

    default_price_cents: Mapped[int] = mapped_column(sa.Integer, nullable=False, server_default="0")
    profit_cents: Mapped[int] = mapped_column(sa.Integer, default=0, nullable=False)
    default_cost_cents: Mapped[int] = mapped_column(sa.Integer, nullable=False, server_default="0")

    active = sa.Column(sa.Boolean, nullable=False, server_default=sa.text("true"))

    created_at = sa.Column(sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()"))
    updated_at = sa.Column(sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()"), onupdate=func.now())

    __table_args__ = (
        sa.CheckConstraint("grade in (1,2,3)", name="ck_items_grade_123"),
        sa.Index("ix_items_name", "name"),
        sa.Index("ix_items_teacher_grade", "teacher_id", "grade"),
    )
