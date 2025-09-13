import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
from backend.app.db.base import Base

PaymentMethod = sa.Enum("cash", "vodafone_cash", "instapay", name="payment_method", create_type=False)
OrderStatus = sa.Enum("completed", "voided", name="order_status", create_type=False)

class Order(Base):
    __tablename__ = "orders"

    id = sa.Column(UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()"))
    branch_id = sa.Column(UUID(as_uuid=True), sa.ForeignKey("branches.id", ondelete="RESTRICT"), nullable=False)
    student_id = sa.Column(UUID(as_uuid=True), sa.ForeignKey("students.id", ondelete="RESTRICT"), nullable=False)

    payment_method = sa.Column(PaymentMethod, nullable=False)
    payer_reference = sa.Column(sa.Text)
    proof_media_url = sa.Column(sa.Text)
    status = sa.Column(OrderStatus, nullable=False, server_default="completed")

    total_cents = sa.Column(sa.Integer, nullable=False, server_default="0")

    created_at = sa.Column(sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()"))

    __table_args__ = (
        sa.Index("ix_orders_branch", "branch_id"),
        sa.Index("ix_orders_student", "student_id"),
        sa.Index("ix_orders_created", "created_at"),
    )

class OrderLine(Base):
    __tablename__ = "order_lines"

    id = sa.Column(UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()"))
    order_id = sa.Column(UUID(as_uuid=True), sa.ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    item_id  = sa.Column(UUID(as_uuid=True), sa.ForeignKey("items.id",  ondelete="RESTRICT"), nullable=False)

    qty = sa.Column(sa.Integer, nullable=False)
    unit_price_cents = sa.Column(sa.Integer, nullable=False)
    unit_cost_cents = sa.Column(sa.Integer, nullable=False, server_default="0")
    line_total_cents = sa.Column(sa.Integer, nullable=False)

    created_at = sa.Column(sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()"))

    __table_args__ = (
        sa.CheckConstraint("qty > 0", name="ck_order_lines_qty_positive"),
        sa.Index("ix_order_lines_order", "order_id"),
    )
