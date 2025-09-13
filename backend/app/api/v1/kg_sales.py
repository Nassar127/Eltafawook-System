from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.schemas.kg_sale import KgSaleCreate, KgSaleOut
from backend.app.services import kg_sale_service as service

router = APIRouter()

@router.post("", response_model=list[KgSaleOut], status_code=201)
def create_kg_sale(sale_in: KgSaleCreate, db: Session = Depends(get_db)):
    try:
        created_sales = service.create_kg_sale(db=db, sale_in=sale_in)
        return created_sales
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))