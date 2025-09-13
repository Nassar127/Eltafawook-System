"""replace_payment_method_constraint

Revision ID: 2c05178b041a
Revises: 99dbaaca5344
Create Date: 2025-09-07 22:15:02.641874

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '2c05178b041a'
down_revision: Union[str, Sequence[str], None] = '99dbaaca5344'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        UPDATE sales 
        SET payment_method = 'cash' 
        WHERE payment_method NOT IN ('cash', 'vodafone_cash', 'instapay');
    """)
    op.execute("""
        UPDATE reservations 
        SET payment_method = 'cash' 
        WHERE payment_method NOT IN ('cash', 'vodafone_cash', 'instapay');
    """)
    op.execute("ALTER TABLE sales DROP CONSTRAINT IF EXISTS ck_sales_payment_method;")
    op.create_check_constraint(
        "ck_sales_payment_method",
        "sales",
        "payment_method IN ('cash', 'vodafone_cash', 'instapay')"
    )


def downgrade() -> None:
    op.drop_constraint("ck_sales_payment_method", "sales", type_="check")