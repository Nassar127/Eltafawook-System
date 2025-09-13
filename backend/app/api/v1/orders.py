from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.schemas.order import QuickSaleRequest, QuickSaleResponse
from backend.app.services.order_service import create_quick_sale
from backend.app.services.inventory_service import get_inventory_summary

router = APIRouter()

@router.post("/quick-sale", response_model=QuickSaleResponse, status_code=201)
def quick_sale(body: QuickSaleRequest, db: Session = Depends(get_db)):
    try:
        order_id, line_id = create_quick_sale(
            db,
            branch_id=body.branch_id,
            item_id=body.item_id,
            qty=body.qty,
        )
        inv = get_inventory_summary(db, branch_id=body.branch_id, item_id=body.item_id)
        return {"order_id": order_id, "line_id": line_id, **inv}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))

@router.post("/lines/{line_id}/return", status_code=405)
def return_order_line_disabled(line_id: UUID, db: Session = Depends(get_db)):
    raise HTTPException(status_code=405, detail="Returns are not allowed.")
