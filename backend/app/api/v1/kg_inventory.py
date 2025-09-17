from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.schemas.kg_inventory import KgReceiveStockRequest
from backend.app.services import kg_inventory_service as service

router = APIRouter()

@router.post("/receive", status_code=200)
def receive_stock(body: KgReceiveStockRequest, db: Session = Depends(get_db)):
    try:
        return service.receive_kg_stock(
            db=db, 
            branch_id=body.branch_id, 
            kg_item_id=body.kg_item_id, 
            qty=body.qty
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
@router.get("/summary")
def get_summary(branch_id: UUID, kg_item_id: UUID, db: Session = Depends(get_db)):
    return service.get_inventory_summary(db=db, branch_id=branch_id, kg_item_id=kg_item_id)