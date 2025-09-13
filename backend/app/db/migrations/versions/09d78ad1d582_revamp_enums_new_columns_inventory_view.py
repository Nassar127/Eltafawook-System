"""revamp: enums + new columns + inventory_view

Revision ID: 09d78ad1d582
Revises: 9a20ab5d4a9c
Create Date: 2025-08-23 19:34:18.065938
"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "09d78ad1d582"
down_revision: Union[str, Sequence[str], None] = "9a20ab5d4a9c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    bind = op.get_bind()
    insp = sa.inspect(bind)

    def has_table(table: str) -> bool:
        try:
            return insp.has_table(table)
        except Exception:
            return table in insp.get_table_names()

    def has_col(table: str, col: str) -> bool:
        return col in {c["name"] for c in insp.get_columns(table)}

    def has_fk(table: str, constrained_cols: list[str], referred_table: str) -> bool:
        for fk in insp.get_foreign_keys(table):
            cols = fk.get("constrained_columns") or []
            if sorted(cols) == sorted(constrained_cols) and fk.get("referred_table") == referred_table:
                return True
        return False

    def create_index_if_not_exists(name: str, table: str, cols: list[str]):
        cols_sql = ", ".join(cols)
        op.execute(f'CREATE INDEX IF NOT EXISTS "{name}" ON {table} ({cols_sql});')

    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto;")

    enums_to_create = [
        ("school_language", ("arabic", "english")),
        ("gender", ("male", "female")),
        ("section", ("science", "math", "literature")),
        ("resource_type", ("book", "code", "other")),
        ("payment_method", ("cash", "vodafone_cash", "instapay")),
        ("order_status", ("completed", "voided")),
        ("reservation_status", ("hold", "active", "fulfilled", "cancelled", "expired")),
        ("teacher_language", ("arabic", "english")),
    ]
    for name, values in enums_to_create:
        postgresql.ENUM(*values, name=name, create_type=True).create(bind, checkfirst=True)

    T_SCHOOL_LANG = postgresql.ENUM("arabic", "english", name="school_language", create_type=False)
    T_GENDER = postgresql.ENUM("male", "female", name="gender", create_type=False)
    T_SECTION = postgresql.ENUM("science", "math", "literature", name="section", create_type=False)
    T_RESOURCE = postgresql.ENUM("book", "code", "other", name="resource_type", create_type=False)
    T_PAY = postgresql.ENUM("cash", "vodafone_cash", "instapay", name="payment_method", create_type=False)
    T_ORDER_STATUS = postgresql.ENUM("completed", "voided", name="order_status", create_type=False)
    T_RES_STATUS = postgresql.ENUM("hold", "active", "fulfilled", "cancelled", "expired", name="reservation_status", create_type=False)
    T_TEACHER_LANG = postgresql.ENUM("arabic", "english", name="teacher_language", create_type=False)

    if has_table("branches"):
        if not has_col("branches", "closing_time_local"):
            op.add_column(
                "branches",
                sa.Column(
                    "closing_time_local",
                    sa.Time(timezone=False),
                    nullable=False,
                    server_default=sa.text("'20:00'::time"),
                ),
            )
        if not has_col("branches", "report_send_offset_minutes"):
            op.add_column(
                "branches",
                sa.Column("report_send_offset_minutes", sa.Integer(), nullable=False, server_default="30"),
            )

        op.execute(
            """
            INSERT INTO branches (code, name, is_active)
            VALUES ('banha','Banha', true)
            ON CONFLICT (code) DO NOTHING;
        """
        )
        op.execute(
            """
            INSERT INTO branches (code, name, is_active, closing_time_local)
            VALUES ('qaliub','Qaliub', true, '18:00')
            ON CONFLICT (code) DO NOTHING;
        """
        )

    if has_table("schools"):
        if not has_col("schools", "language"):
            op.add_column("schools", sa.Column("language", T_SCHOOL_LANG, nullable=False, server_default="arabic"))
            op.alter_column("schools", "language", server_default=None)
        if not has_col("schools", "is_active"):
            op.add_column("schools", sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")))
        create_index_if_not_exists("ix_schools_name", "schools", ["name"])

    if has_table("students"):
        if not has_col("students", "parent_phone"):
            op.add_column("students", sa.Column("parent_phone", sa.Text()))
        if not has_col("students", "parent_phone_norm"):
            op.add_column("students", sa.Column("parent_phone_norm", sa.Text()))
        if not has_col("students", "gender"):
            op.add_column("students", sa.Column("gender", T_GENDER, nullable=False, server_default="male"))
        if not has_col("students", "grade"):
            op.add_column("students", sa.Column("grade", sa.SmallInteger(), nullable=False, server_default="1"))
        if not has_col("students", "branch_id"):
            op.add_column("students", sa.Column("branch_id", postgresql.UUID(as_uuid=True), nullable=True))
            op.execute(
                """
                UPDATE students
                SET branch_id = (SELECT id FROM branches WHERE code='banha' LIMIT 1)
                WHERE branch_id IS NULL;
            """
            )
            op.alter_column("students", "branch_id", nullable=False)
        if not has_fk("students", ["branch_id"], "branches"):
            op.create_foreign_key(
                "fk_students_branch", "students", "branches", ["branch_id"], ["id"], ondelete="RESTRICT"
            )
        if not has_col("students", "section"):
            op.add_column("students", sa.Column("section", T_SECTION, nullable=False, server_default="science"))
        if not has_col("students", "whatsapp_opt_in"):
            op.add_column(
                "students", sa.Column("whatsapp_opt_in", sa.Boolean(), nullable=False, server_default=sa.text("true"))
            )
        create_index_if_not_exists("ix_students_parent_phone_norm", "students", ["parent_phone_norm"])
        create_index_if_not_exists("ix_students_branch", "students", ["branch_id"])
        create_index_if_not_exists("ix_students_phone_norm", "students", ["phone_norm"])
        create_index_if_not_exists("ix_students_name", "students", ["full_name"])

    if not has_table("teachers"):
        op.create_table(
            "teachers",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
            sa.Column("name", sa.Text(), nullable=False),
            sa.Column("subject", sa.Text(), nullable=False),
            sa.Column("language", T_TEACHER_LANG, nullable=False),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
            sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
        )
        create_index_if_not_exists("ix_teachers_name", "teachers", ["name"])
        create_index_if_not_exists("ix_teachers_subject", "teachers", ["subject"])

    if has_table("items"):
        if not has_col("items", "resource_type"):
            op.add_column("items", sa.Column("resource_type", T_RESOURCE, nullable=False, server_default="book"))
            op.alter_column("items", "resource_type", server_default=None)
        if not has_col("items", "grade"):
            op.add_column("items", sa.Column("grade", sa.SmallInteger(), nullable=False, server_default="1"))
            op.alter_column("items", "grade", server_default=None)
        if not has_col("items", "teacher_id"):
            op.add_column("items", sa.Column("teacher_id", postgresql.UUID(as_uuid=True), nullable=True))
        if not has_fk("items", ["teacher_id"], "teachers"):
            op.create_foreign_key("fk_items_teacher", "items", "teachers", ["teacher_id"], ["id"], ondelete="RESTRICT")
        if not has_col("items", "default_cost_cents"):
            op.add_column("items", sa.Column("default_cost_cents", sa.Integer(), nullable=False, server_default="0"))
        if not has_col("items", "active"):
            op.add_column("items", sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true")))
        create_index_if_not_exists("ix_items_teacher_grade", "items", ["teacher_id", "grade"])
        create_index_if_not_exists("ix_items_name", "items", ["name"])

    if has_table("orders"):
        if not has_col("orders", "student_id"):
            op.add_column("orders", sa.Column("student_id", postgresql.UUID(as_uuid=True), nullable=True))
        if not has_fk("orders", ["student_id"], "students"):
            op.create_foreign_key("fk_orders_student", "orders", "students", ["student_id"], ["id"], ondelete="RESTRICT")
        if not has_col("orders", "payment_method"):
            op.add_column(
                "orders",
                sa.Column("payment_method", T_PAY, nullable=False, server_default="cash"),
            )
        if not has_col("orders", "payer_reference"):
            op.add_column("orders", sa.Column("payer_reference", sa.Text()))
        if not has_col("orders", "proof_media_url"):
            op.add_column("orders", sa.Column("proof_media_url", sa.Text()))
        if not has_col("orders", "status"):
            op.add_column(
                "orders",
                sa.Column("status", T_ORDER_STATUS, nullable=False, server_default="completed"),
            )
        if not has_col("orders", "total_cents"):
            op.add_column("orders", sa.Column("total_cents", sa.Integer(), nullable=False, server_default="0"))
        create_index_if_not_exists("ix_orders_branch", "orders", ["branch_id"])
        create_index_if_not_exists("ix_orders_student", "orders", ["student_id"])
        create_index_if_not_exists("ix_orders_created", "orders", ["created_at"])

    if has_table("order_lines"):
        if not has_col("order_lines", "unit_price_cents"):
            op.add_column("order_lines", sa.Column("unit_price_cents", sa.Integer(), nullable=False, server_default="0"))
        if not has_col("order_lines", "unit_cost_cents"):
            op.add_column("order_lines", sa.Column("unit_cost_cents", sa.Integer(), nullable=False, server_default="0"))
        if not has_col("order_lines", "line_total_cents"):
            op.add_column("order_lines", sa.Column("line_total_cents", sa.Integer(), nullable=False, server_default="0"))
        create_index_if_not_exists("ix_order_lines_order", "order_lines", ["order_id"])

    if has_table("reservations"):
        if not has_col("reservations", "unit_price_cents"):
            op.add_column("reservations", sa.Column("unit_price_cents", sa.Integer(), nullable=False, server_default="0"))
        if not has_col("reservations", "prepaid_cents"):
            op.add_column("reservations", sa.Column("prepaid_cents", sa.Integer(), nullable=False, server_default="0"))
        if not has_col("reservations", "prepaid_at"):
            op.add_column("reservations", sa.Column("prepaid_at", sa.TIMESTAMP(timezone=True)))
        if not has_col("reservations", "payment_method"):
            op.add_column("reservations", sa.Column("payment_method", T_PAY))
        if not has_col("reservations", "payer_reference"):
            op.add_column("reservations", sa.Column("payer_reference", sa.Text()))
        if not has_col("reservations", "proof_media_url"):
            op.add_column("reservations", sa.Column("proof_media_url", sa.Text()))
        for tscol in ("notified_at", "fulfilled_at", "expired_at", "cancelled_at"):
            if not has_col("reservations", tscol):
                op.add_column("reservations", sa.Column(tscol, sa.TIMESTAMP(timezone=True)))

    if has_table("sales"):
        if not has_col("sales", "order_id"):
            op.add_column("sales", sa.Column("order_id", postgresql.UUID(as_uuid=True)))
        if not has_col("sales", "student_id"):
            op.add_column("sales", sa.Column("student_id", postgresql.UUID(as_uuid=True)))
        if not has_fk("sales", ["order_id"], "orders"):
            op.create_foreign_key("fk_sales_order", "sales", "orders", ["order_id"], ["id"], ondelete="SET NULL")
        if not has_fk("sales", ["student_id"], "students"):
            op.create_foreign_key("fk_sales_student", "sales", "students", ["student_id"], ["id"], ondelete="SET NULL")
        if not has_col("sales", "unit_cost_cents"):
            op.add_column("sales", sa.Column("unit_cost_cents", sa.Integer(), nullable=False, server_default="0"))
        if not has_col("sales", "payment_method"):
            op.add_column(
                "sales",
                sa.Column("payment_method", T_PAY, nullable=False, server_default="cash"),
            )
        if not has_col("sales", "payer_reference"):
            op.add_column("sales", sa.Column("payer_reference", sa.Text()))
        if not has_col("sales", "proof_media_url"):
            op.add_column("sales", sa.Column("proof_media_url", sa.Text()))

    op.execute(
        """
        CREATE OR REPLACE VIEW inventory_view AS
        WITH onhand AS (
          SELECT branch_id, item_id, COALESCE(SUM(qty), 0) AS on_hand
          FROM stock_ledger
          GROUP BY branch_id, item_id
        ),
        reserved AS (
          SELECT branch_id, item_id, COALESCE(SUM(qty), 0) AS reserved
          FROM reservations
          WHERE status IN ('hold','active')
          GROUP BY branch_id, item_id
        )
        SELECT
          COALESCE(o.branch_id, r.branch_id) AS branch_id,
          COALESCE(o.item_id,  r.item_id)    AS item_id,
          COALESCE(o.on_hand, 0) AS on_hand,
          COALESCE(r.reserved, 0) AS reserved,
          (COALESCE(o.on_hand,0) - COALESCE(r.reserved,0)) AS available
        FROM onhand o
        FULL OUTER JOIN reserved r
          ON r.branch_id=o.branch_id AND r.item_id=o.item_id;
        """
    )
    op.execute("GRANT SELECT ON inventory_view TO eltfawook;")


def downgrade():
    op.execute("DROP VIEW IF EXISTS inventory_view;")
