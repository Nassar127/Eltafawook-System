"""Unit tests for order_service using mocked DB."""
import pytest
from unittest.mock import MagicMock, patch
from uuid import uuid4

from backend.app.services.order_service import create_quick_sale


BRANCH = uuid4()
ITEM = uuid4()


class TestCreateQuickSale:
    @patch("backend.app.services.order_service.reserved_qty", return_value=0)
    @patch("backend.app.services.order_service.on_hand", return_value=20)
    def test_success(self, mock_oh, mock_rq, mock_db):
        order_id = uuid4()
        line_id = uuid4()
        mock_db.execute.return_value.scalar_one.side_effect = [order_id, line_id]
        oid, lid = create_quick_sale(mock_db, branch_id=BRANCH, item_id=ITEM, qty=2)
        assert oid == order_id
        assert lid == line_id
        mock_db.commit.assert_called_once()

    def test_zero_qty_raises(self, mock_db):
        with pytest.raises(ValueError, match="qty must be > 0"):
            create_quick_sale(mock_db, branch_id=BRANCH, item_id=ITEM, qty=0)

    def test_negative_qty_raises(self, mock_db):
        with pytest.raises(ValueError, match="qty must be > 0"):
            create_quick_sale(mock_db, branch_id=BRANCH, item_id=ITEM, qty=-1)

    @patch("backend.app.services.order_service.reserved_qty", return_value=0)
    @patch("backend.app.services.order_service.on_hand", return_value=3)
    def test_insufficient_stock_raises(self, mock_oh, mock_rq, mock_db):
        with pytest.raises(ValueError, match="Not enough available"):
            create_quick_sale(mock_db, branch_id=BRANCH, item_id=ITEM, qty=5)
