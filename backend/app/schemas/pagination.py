"""Reusable pagination parameters and response wrapper."""
from __future__ import annotations

from typing import Generic, TypeVar, Sequence

from fastapi import Query
from pydantic import BaseModel

T = TypeVar("T")


class PaginationParams:
    """Inject as a dependency: ``params: PaginationParams = Depends()``"""

    def __init__(
        self,
        offset: int = Query(0, ge=0, description="Number of records to skip"),
        limit: int = Query(50, ge=1, le=200, description="Max records to return"),
    ):
        self.offset = offset
        self.limit = limit


class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    offset: int
    limit: int
    has_more: bool
