from __future__ import annotations

from typing import Annotated, Literal
from pydantic import BaseModel, Field, ConfigDict

Language = Literal["arabic", "english"]
TeacherLanguage = Language

Gender = Literal["male", "female"]
Section = Literal["science", "math", "literature"]

ResourceType = Literal["book", "code", "other"]

PaymentMethod = Literal["cash", "vodafone_cash", "instapay"]
OrderStatus = Literal["completed", "voided"]

ReservationStatus = Literal["hold", "active", "fulfilled", "cancelled", "expired", "queued"]

Cents = Annotated[int, Field(ge=0)]
QtyPositive = Annotated[int, Field(gt=0)]
NonNegInt = Annotated[int, Field(ge=0)]

class OrmBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
