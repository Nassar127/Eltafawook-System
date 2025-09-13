import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
from backend.app.db.base import Base


class Teacher(Base):
    __tablename__ = "teachers"

    id = sa.Column(UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()"))
    name = sa.Column(sa.Text, nullable=False)
    subject = sa.Column(sa.Text, nullable=False)

    is_active = sa.Column(sa.Boolean, nullable=False, server_default=sa.text("true"))
    created_at = sa.Column(sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()"))

    __table_args__ = (
        sa.Index("ix_teachers_name", "name"),
        sa.Index("ix_teachers_subject", "subject"),
    )
