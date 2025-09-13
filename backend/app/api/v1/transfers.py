from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.schemas.transfer import TransferRequest, TransferResponse
from backend.app.services.transfer_service import transfer_stock
from backend.app.models.user import User
from .auth import get_current_active_user

router = APIRouter()

@router.post("", response_model=TransferResponse, status_code=201)
def transfer(
    body: TransferRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to perform this action."
        )
    try:
        return transfer_stock(
            db,
            from_branch_id=body.from_branch_id,
            to_branch_id=body.to_branch_id,
            item_id=body.item_id,
            qty=body.qty,
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))