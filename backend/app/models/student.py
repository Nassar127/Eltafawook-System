import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
from backend.app.db.base import Base
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import BigInteger, Identity

Gender = sa.Enum("male", "female", name="gender", create_type=False)
Section = sa.Enum("science", "math", "literature", "", name="section", create_type=False)

class Student(Base):
    __tablename__ = "students"

    id = sa.Column(UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()"))
    full_name = sa.Column(sa.Text, nullable=False)

    phone = sa.Column(sa.Text)
    phone_norm = sa.Column(sa.Text)
    parent_phone = sa.Column(sa.Text)
    parent_phone_norm = sa.Column(sa.Text)

    school_id = sa.Column(UUID(as_uuid=True), sa.ForeignKey("schools.id", ondelete="SET NULL"))

    gender = sa.Column(Gender, nullable=False)
    grade = sa.Column(sa.SmallInteger, nullable=False)
    branch_id = sa.Column(UUID(as_uuid=True), sa.ForeignKey("branches.id", ondelete="RESTRICT"), nullable=False)
    section = sa.Column(Section, nullable=True)
    whatsapp_opt_in = sa.Column(sa.Boolean, nullable=False, server_default=sa.text("true"))
    public_id: Mapped[int] = mapped_column(BigInteger, Identity(always=False), unique=True, index=True, nullable=False)
    created_at = sa.Column(sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()"))

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