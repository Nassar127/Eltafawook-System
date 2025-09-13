from fastapi import APIRouter
from .wa.enqueue import router as wa_enqueue

router = APIRouter()
router.include_router(wa_enqueue, prefix="/wa", tags=["notifications-wa"])
