import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
from backend.app.db.base import Base

SchoolLanguage = sa.Enum("arabic", "english", name="school_language", create_type=False)

class School(Base):
    __tablename__ = "schools"

    id = sa.Column(UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()"))
    name = sa.Column(sa.Text, unique=True, nullable=False)
    city = sa.Column(sa.Text)
    is_active = sa.Column(sa.Boolean, nullable=False, server_default=sa.text("true"))
    created_at = sa.Column(sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()"))

    __table_args__ = (
        sa.Index("ix_schools_name", "name"),
    )
