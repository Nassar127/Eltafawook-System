import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
from backend.app.db.base import Base

class Branch(Base):
    __tablename__ = "branches"

    id = sa.Column(UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()"))
    code = sa.Column(sa.Text, unique=True, nullable=False)
    name = sa.Column(sa.Text, nullable=False)

    closing_time_local = sa.Column(sa.Time(timezone=False), nullable=False, server_default=sa.text("'20:00'::time"))
    report_send_offset_minutes = sa.Column(sa.Integer, nullable=False, server_default="30")

    is_active = sa.Column(sa.Boolean, nullable=False, server_default=sa.text("true"))
    created_at = sa.Column(sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()"))
