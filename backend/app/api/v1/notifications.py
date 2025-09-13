from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.services.notify.outbox_service import drain_whatsapp

router = APIRouter()

@router.post("/wa/drain")
def drain_wa(limit: int = 10, db: Session = Depends(get_db)):
    return drain_whatsapp(db, limit=limit)
