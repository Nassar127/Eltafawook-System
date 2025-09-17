from __future__ import annotations
from datetime import date, datetime
from uuid import UUID
from typing import Optional, List, Literal
from pydantic import BaseModel, field_validator, model_validator, ConfigDict

KgStudentStatus = Literal['pending', 'accepted', 'rejected', 'waitlisted']
KgAttendancePeriod = Literal['morning', 'evening', 'both']

class KgStudentBase(BaseModel):
    full_name: str
    national_id: Optional[str] = None
    nationality: Optional[str] = None
    religion: Optional[str] = None
    address: Optional[str] = None
    date_of_birth: date
    place_of_birth: Optional[str] = None
    attendance_period: KgAttendancePeriod
    father_name: Optional[str] = None
    father_national_id: Optional[str] = None
    father_profession: Optional[str] = None
    father_phone: Optional[str] = None
    father_whatsapp: Optional[str] = None
    mother_phone: Optional[str] = None
    guardian_name: Optional[str] = None
    guardian_national_id: Optional[str] = None
    guardian_relation: Optional[str] = None
    guardian_phone: Optional[str] = None
    guardian_whatsapp: Optional[str] = None
    has_chronic_illness: bool = False
    chronic_illness_description: Optional[str] = None
    attended_previous_nursery: bool = False
    previous_nursery_name: Optional[str] = None
    needs_bus_subscription: bool = False
    alternative_transport_method: Optional[str] = None
    authorized_pickups: Optional[List[str]] = None

    @field_validator('national_id', 'father_national_id', 'guardian_national_id', mode='before')
    @classmethod
    def empty_str_to_none(cls, v):
        if isinstance(v, str) and not v.strip():
            return None
        return v

    @model_validator(mode='after')
    def check_transport_method(self):
        if self.needs_bus_subscription is False and not self.alternative_transport_method:
            raise ValueError('If bus subscription is not needed, an alternative transport method must be provided.')
        return self

class KgApplicationCreate(KgStudentBase):
    pass

class KgStudentCreate(KgStudentBase):
    branch_id: UUID

class KgStudentUpdate(BaseModel):
    full_name: Optional[str] = None
    national_id: Optional[str] = None
    nationality: Optional[str] = None
    religion: Optional[str] = None
    address: Optional[str] = None
    date_of_birth: Optional[date] = None
    attendance_period: Optional[KgAttendancePeriod] = None
    place_of_birth: Optional[str] = None
    father_name: Optional[str] = None
    father_national_id: Optional[str] = None
    father_profession: Optional[str] = None
    father_phone: Optional[str] = None
    father_whatsapp: Optional[str] = None
    mother_phone: Optional[str] = None
    guardian_name: Optional[str] = None
    guardian_national_id: Optional[str] = None
    guardian_relation: Optional[str] = None
    guardian_phone: Optional[str] = None
    guardian_whatsapp: Optional[str] = None
    has_chronic_illness: Optional[bool] = None
    chronic_illness_description: Optional[str] = None
    attended_previous_nursery: Optional[bool] = None
    previous_nursery_name: Optional[str] = None
    needs_bus_subscription: Optional[bool] = None
    alternative_transport_method: Optional[str] = None
    authorized_pickups: Optional[List[str]] = None

class KgStudentOut(KgStudentBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    branch_id: UUID
    application_date: date
    created_at: datetime
    status: KgStudentStatus
    age_oct_years: Optional[int] = None
    age_oct_months: Optional[int] = None
    age_oct_days: Optional[int] = None

class KgStudentStatusUpdate(BaseModel):
    status: KgStudentStatus