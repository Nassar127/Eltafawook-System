from fastapi import APIRouter
from . import (
    inventory, reservations, orders, branches, items, adjustments,
    transfers, schools, students, reports, sync, notifications, teachers, uploads, auth, kg_students, kg_items, kg_sales, kg_inventory, kg_reports, public
)

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(inventory.router,    prefix="/inventory",    tags=["inventory"])
api_router.include_router(reservations.router, prefix="/reservations", tags=["reservations"])
api_router.include_router(orders.router,       prefix="/orders",       tags=["orders"])
api_router.include_router(branches.router,     prefix="/branches",     tags=["branches"])
api_router.include_router(items.router,        prefix="/items",        tags=["items"])
api_router.include_router(adjustments.router,  prefix="/adjustments",  tags=["adjustments"])
api_router.include_router(transfers.router,    prefix="/transfers",    tags=["transfers"])
api_router.include_router(schools.router,      prefix="/schools",      tags=["schools"])
api_router.include_router(students.router,     prefix="/students",     tags=["students"])
api_router.include_router(reports.router,      prefix="/reports",      tags=["reports"])
api_router.include_router(sync.router,         prefix="/sync",         tags=["sync"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(teachers.router, prefix="/teachers", tags=["teachers"])
api_router.include_router(uploads.router, prefix="", tags=["uploads"])
api_router.include_router(kg_students.router, prefix="/kg-students", tags=["kindergarten"])
api_router.include_router(kg_items.router, prefix="/kg-items", tags=["kindergarten"])
api_router.include_router(kg_sales.router, prefix="/kg-sales", tags=["kindergarten"])
api_router.include_router(kg_inventory.router, prefix="/kg-inventory", tags=["kindergarten"])
api_router.include_router(kg_reports.router, prefix="/kg-reports", tags=["kindergarten"])
api_router.include_router(public.router, prefix="/public", tags=["public"])