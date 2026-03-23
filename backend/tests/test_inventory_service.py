"""Unit tests for inventory_service using mocked DB."""
import pytest
from unittest.mock import MagicMock, patch, call
from uuid import uuid4

from backend.app.services.inventory_service import (
    on_hand,
    reserved_qty,
    get_inventory_summary,
    receive_stock,
    adjust_stock,
    transfer_stock,
)


BRANCH = uuid4()
ITEM = uuid4()


class TestOnHand:
    def test_returns_int(self, mock_db):
        mock_db.execute.return_value.scalar_one.return_value = 50
        result = on_hand(mock_db, BRANCH, ITEM)
        assert result == 50
        assert isinstance(result, int)

    def test_returns_zero_when_no_stock(self, mock_db):
        mock_db.execute.return_value.scalar_one.return_value = 0
        assert on_hand(mock_db, BRANCH, ITEM) == 0


class TestReservedQty:
    def test_returns_int(self, mock_db):
        mock_db.execute.return_value.scalar_one.return_value = 10
        assert reserved_qty(mock_db, BRANCH, ITEM) == 10

    def test_returns_zero(self, mock_db):
        mock_db.execute.return_value.scalar_one.return_value = 0
        assert reserved_qty(mock_db, BRANCH, ITEM) == 0


class TestGetInventorySummary:
    @patch("backend.app.services.inventory_service.reserved_qty", return_value=5)
    @patch("backend.app.services.inventory_service.on_hand", return_value=20)
    def test_summary(self, mock_oh, mock_rq, mock_db):
        result = get_inventory_summary(mock_db, BRANCH, ITEM)
        assert result["on_hand"] == 20
        assert result["reserved"] == 5
        assert result["available"] == 15
        assert result["branch_id"] == BRANCH
        assert result["item_id"] == ITEM


class TestReceiveStock:
    @patch("backend.app.services.inventory_service._activate_oldest_holds", return_value=0)
    @patch("backend.app.services.inventory_service.get_inventory_summary")
    def test_receive_positive_qty(self, mock_summary, mock_activate, mock_db):
        mock_summary.return_value = {"on_hand": 10, "reserved": 0, "available": 10, "branch_id": BRANCH, "item_id": ITEM}
        result = receive_stock(mock_db, branch_id=BRANCH, item_id=ITEM, qty=10)
        assert result["on_hand"] == 10
        mock_db.execute.assert_called()
        mock_db.commit.assert_called()

    def test_receive_zero_qty_raises(self, mock_db):
        with pytest.raises(ValueError, match="qty must be > 0"):
            receive_stock(mock_db, branch_id=BRANCH, item_id=ITEM, qty=0)

    def test_receive_negative_qty_raises(self, mock_db):
        with pytest.raises(ValueError, match="qty must be > 0"):
            receive_stock(mock_db, branch_id=BRANCH, item_id=ITEM, qty=-5)


class TestAdjustStock:
    @patch("backend.app.services.inventory_service.get_inventory_summary")
    @patch("backend.app.services.inventory_service.reserved_qty", return_value=5)
    @patch("backend.app.services.inventory_service.on_hand", return_value=20)
    def test_adjust_positive(self, mock_oh, mock_rq, mock_summary, mock_db):
        mock_db.execute.return_value.scalar_one.return_value = uuid4()
        mock_summary.return_value = {"on_hand": 25, "reserved": 5, "available": 20, "branch_id": BRANCH, "item_id": ITEM}
        result = adjust_stock(mock_db, branch_id=BRANCH, item_id=ITEM, delta=5, reason="recount")
        assert result["on_hand"] == 25
        mock_db.commit.assert_called()

    def test_adjust_zero_raises(self, mock_db):
        with pytest.raises(ValueError, match="delta must be non-zero"):
            adjust_stock(mock_db, branch_id=BRANCH, item_id=ITEM, delta=0)

    @patch("backend.app.services.inventory_service.reserved_qty", return_value=15)
    @patch("backend.app.services.inventory_service.on_hand", return_value=20)
    def test_adjust_below_reserved_raises(self, mock_oh, mock_rq, mock_db):
        with pytest.raises(ValueError, match="below reserved"):
            adjust_stock(mock_db, branch_id=BRANCH, item_id=ITEM, delta=-10)


class TestTransferStock:
    @patch("backend.app.services.inventory_service.get_inventory_summary")
    @patch("backend.app.services.inventory_service.reserved_qty", return_value=0)
    @patch("backend.app.services.inventory_service.on_hand", return_value=20)
    def test_transfer_success(self, mock_oh, mock_rq, mock_summary, mock_db):
        to_branch = uuid4()
        mock_summary.return_value = {"on_hand": 10, "reserved": 0, "available": 10, "branch_id": BRANCH, "item_id": ITEM}
        result = transfer_stock(mock_db, from_branch_id=BRANCH, to_branch_id=to_branch, item_id=ITEM, qty=5)
        assert "from_summary" in result
        assert "to_summary" in result
        mock_db.commit.assert_called()

    def test_transfer_zero_raises(self, mock_db):
        with pytest.raises(ValueError, match="qty must be > 0"):
            transfer_stock(mock_db, from_branch_id=BRANCH, to_branch_id=uuid4(), item_id=ITEM, qty=0)

    @patch("backend.app.services.inventory_service.reserved_qty", return_value=0)
    @patch("backend.app.services.inventory_service.on_hand", return_value=3)
    def test_transfer_insufficient_raises(self, mock_oh, mock_rq, mock_db):
        with pytest.raises(ValueError, match="Not enough available"):
            transfer_stock(mock_db, from_branch_id=BRANCH, to_branch_id=uuid4(), item_id=ITEM, qty=10)
