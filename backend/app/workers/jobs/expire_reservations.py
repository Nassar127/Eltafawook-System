from sqlalchemy import text
from sqlalchemy.orm import Session

def run(db: Session) -> int:
    rows = db.execute(
        text("""
            UPDATE reservations
               SET status = 'expired'
             WHERE status IN ('hold','active')
               AND upper(hold_window) < now()
             RETURNING id, branch_id, item_id, qty
        """)
    ).mappings().all()

    for r in rows:
        db.execute(
            text("""
                INSERT INTO stock_ledger (branch_id, item_id, event, qty, at, ref_type, ref_id)
                VALUES (:branch_id, :item_id, 'expire', :qty, now(), 'reservation', :res_id)
            """),
            {
                "branch_id": str(r["branch_id"]),
                "item_id": str(r["item_id"]),
                "qty": int(r["qty"]),
                "res_id": str(r["id"]),
            },
        )

    db.commit()
    return len(rows)
