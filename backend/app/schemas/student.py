from pydantic import BaseModel, field_validator, model_validator, ConfigDict
from typing import Literal, Optional, cast
from uuid import UUID
from ..utils.phone import normalize_eg_phone

Section = Literal["science", "math", "literature", ""]

class StudentCreate(BaseModel):
    full_name: str
    phone: str
    parent_phone: Optional[str] = None
    school_id: Optional[UUID] = None
    new_school_name: Optional[str] = None
    gender: Literal["male", "female"]
    grade: int
    branch_id: UUID
    section: Optional[Section] = None
    whatsapp_opt_in: bool = True

    @model_validator(mode='after')
    def check_school_fields(self):
        if self.school_id and self.new_school_name:
            raise ValueError('Only one of school_id or new_school_name should be provided.')
        if not self.school_id and not self.new_school_name:
            raise ValueError('Either school_id or new_school_name is required.')
        return self
    
    @field_validator("phone")
    @classmethod
    def _v_phone(cls, v: str) -> str:
        return cast(str, normalize_eg_phone(v))

    @field_validator("parent_phone")
    @classmethod
    def _v_parent(cls, v: Optional[str]) -> Optional[str]:
        return normalize_eg_phone(v) if v else v

class StudentUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    parent_phone: Optional[str] = None
    school_id: Optional[UUID] = None
    gender: Optional[Literal["male", "female"]] = None
    grade: Optional[int] = None
    branch_id: Optional[UUID] = None
    section: Optional[Section] = None
    whatsapp_opt_in: Optional[bool] = None

    @field_validator("phone")
    @classmethod
    def _vu_phone(cls, v: Optional[str]) -> Optional[str]:
        return normalize_eg_phone(v) if v else v

    @field_validator("parent_phone")
    @classmethod
    def _vu_parent(cls, v: Optional[str]) -> Optional[str]:
        return normalize_eg_phone(v) if v else v

class StudentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    public_id: int
    full_name: str
    phone: str
    parent_phone: Optional[str] = None
    school_id: Optional[UUID] = None
    gender: str
    grade: int
    branch_id: UUID
    section: Optional[str] = None
    whatsapp_opt_in: bool
