import sqlalchemy as sa
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, ARRAY
from backend.app.db.base import Base
from uuid import UUID
from datetime import date, datetime
from typing import Optional, List

KgStudentStatus = sa.Enum('pending', 'accepted', 'rejected', 'waitlisted', name='kg_student_status', create_type=False)
KgAttendancePeriod = sa.Enum('morning', 'evening', 'both', name='kg_attendance_period', create_type=False)

class KgStudent(Base):
    __tablename__ = "kg_students"

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()"))
    branch_id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), sa.ForeignKey("branches.id", ondelete="RESTRICT"))
    full_name: Mapped[str] = mapped_column(sa.Text)
    national_id: Mapped[Optional[str]] = mapped_column(sa.String(14), unique=True)
    nationality: Mapped[Optional[str]] = mapped_column(sa.Text)
    religion: Mapped[Optional[str]] = mapped_column(sa.Text)
    address: Mapped[Optional[str]] = mapped_column(sa.Text)
    date_of_birth: Mapped[date] = mapped_column(sa.Date)
    place_of_birth: Mapped[Optional[str]] = mapped_column(sa.Text)
    attendance_period: Mapped[str] = mapped_column(KgAttendancePeriod, nullable=False, server_default='morning')
    age_oct_years: Mapped[Optional[int]] = mapped_column(sa.Integer)
    age_oct_months: Mapped[Optional[int]] = mapped_column(sa.Integer)
    age_oct_days: Mapped[Optional[int]] = mapped_column(sa.Integer)
    father_name: Mapped[Optional[str]] = mapped_column(sa.Text)
    father_national_id: Mapped[Optional[str]] = mapped_column(sa.String(14))
    father_profession: Mapped[Optional[str]] = mapped_column(sa.Text)
    father_phone: Mapped[Optional[str]] = mapped_column(sa.String(20))
    father_whatsapp: Mapped[Optional[str]] = mapped_column(sa.String(20))
    mother_phone: Mapped[Optional[str]] = mapped_column(sa.String(20))
    guardian_name: Mapped[Optional[str]] = mapped_column(sa.Text)
    guardian_national_id: Mapped[Optional[str]] = mapped_column(sa.String(14))
    guardian_relation: Mapped[Optional[str]] = mapped_column(sa.Text)
    guardian_phone: Mapped[Optional[str]] = mapped_column(sa.String(20))
    guardian_whatsapp: Mapped[Optional[str]] = mapped_column(sa.String(20))
    has_chronic_illness: Mapped[bool] = mapped_column(sa.Boolean, server_default=sa.text("false"))
    chronic_illness_description: Mapped[Optional[str]] = mapped_column(sa.Text)
    attended_previous_nursery: Mapped[bool] = mapped_column(sa.Boolean, server_default=sa.text("false"))
    previous_nursery_name: Mapped[Optional[str]] = mapped_column(sa.Text)
    needs_bus_subscription: Mapped[bool] = mapped_column(sa.Boolean, server_default=sa.text("false"))
    alternative_transport_method: Mapped[Optional[str]] = mapped_column(sa.Text)
    authorized_pickups: Mapped[Optional[List[str]]] = mapped_column(ARRAY(sa.Text))
    application_date: Mapped[date] = mapped_column(sa.Date, server_default=sa.text("CURRENT_DATE"))
    created_at: Mapped[datetime] = mapped_column(sa.DateTime(timezone=True), server_default=sa.text("now()"))
    status: Mapped[str] = mapped_column(KgStudentStatus, nullable=False, server_default='pending')
    