from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import insert, select
from typing import List

from backend.app.models.kg_items import KgItem
from backend.app.models.kg_sale import KgSale
from backend.app.models.kg_inventory_ledger import KgInventoryLedger
from backend.app.schemas.kg_sale import KgSaleCreate
from backend.app.services import kg_inventory_service

def create_kg_sale(db: Session, *, sale_in: KgSaleCreate) -> List[KgSale]:
    created_sales = []
    
    with db.begin():
        for line in sale_in.lines:
            item = db.get(KgItem, line.kg_item_id)
            if not item:
                raise ValueError(f"Item with ID {line.kg_item_id} not found.")

            if item.item_type == 'good':
                on_hand = kg_inventory_service.get_kg_on_hand(db=db, branch_id=sale_in.branch_id, kg_item_id=line.kg_item_id)
                if on_hand < line.qty:
                    raise ValueError(f"Not enough stock for item {item.name}. Available: {on_hand}, Requested: {line.qty}")
                
                db.execute(
                    insert(KgInventoryLedger).values(
                        branch_id=sale_in.branch_id,
                        kg_item_id=line.kg_item_id,
                        event='ship',
                        qty=-line.qty
                    )
                )

            total_cents = item.default_price_cents * line.qty
            sale_obj = KgSale(
                branch_id=sale_in.branch_id,
                kg_student_id=sale_in.kg_student_id,
                kg_item_id=line.kg_item_id,
                qty=line.qty,
                unit_price_cents=item.default_price_cents,
                total_cents=total_cents
            )
            db.add(sale_obj)
            created_sales.append(sale_obj)
    
    return created_sales