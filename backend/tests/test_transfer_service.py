"""Unit tests for transfer_service using mocked DB."""
import pytest
from unittest.mock import patch
from uuid import uuid4

from backend.app.services.transfer_service import transfer_stock


BRANCH_A = uuid4()
BRANCH_B = uuid4()
ITEM = uuid4()


class TestTransferStock:
    @patch("backend.app.services.transfer_service.get_inventory_summary")
    @patch("backend.app.services.transfer_service.reserved_qty", return_value=0)
    @patch("backend.app.services.transfer_service.on_hand", return_value=20)
    def test_transfer_success(self, mock_oh, mock_rq, mock_summary, mock_db):
        mock_summary.side_effect = [
            {"on_hand": 15, "reserved": 0, "available": 15, "branch_id": BRANCH_A, "item_id": ITEM},
            {"on_hand": 5, "reserved": 0, "available": 5, "branch_id": BRANCH_B, "item_id": ITEM},
        ]
        result = transfer_stock(mock_db, from_branch_id=BRANCH_A, to_branch_id=BRANCH_B, item_id=ITEM, qty=5)
        assert result["from_summary"]["on_hand"] == 15
        assert result["to_summary"]["on_hand"] == 5
        mock_db.commit.assert_called_once()

    def test_zero_qty_raises(self, mock_db):
        with pytest.raises(ValueError, match="qty must be > 0"):
            transfer_stock(mock_db, from_branch_id=BRANCH_A, to_branch_id=BRANCH_B, item_id=ITEM, qty=0)

    def test_negative_qty_raises(self, mock_db):
        with pytest.raises(ValueError, match="qty must be > 0"):
            transfer_stock(mock_db, from_branch_id=BRANCH_A, to_branch_id=BRANCH_B, item_id=ITEM, qty=-3)

    def test_same_branch_raises(self, mock_db):
        with pytest.raises(ValueError, match="must be different"):
            transfer_stock(mock_db, from_branch_id=BRANCH_A, to_branch_id=BRANCH_A, item_id=ITEM, qty=5)

    @patch("backend.app.services.transfer_service.reserved_qty", return_value=0)
    @patch("backend.app.services.transfer_service.on_hand", return_value=3)
    def test_insufficient_stock_raises(self, mock_oh, mock_rq, mock_db):
        with pytest.raises(ValueError, match="Not enough available"):
            transfer_stock(mock_db, from_branch_id=BRANCH_A, to_branch_id=BRANCH_B, item_id=ITEM, qty=10)
