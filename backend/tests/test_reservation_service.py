"""Unit tests for reservation_service using mocked DB."""
import pytest
from unittest.mock import MagicMock, patch, PropertyMock
from uuid import uuid4
from collections import namedtuple

from backend.app.services.reservation_service import (
    cancel_reservation,
    prepay_reservation,
    _now_utc,
)


RES_ID = uuid4()
BRANCH = uuid4()
ITEM = uuid4()


class TestCancelReservation:
    def test_not_found_raises(self, mock_db):
        mock_db.execute.return_value.one_or_none.return_value = None
        with pytest.raises(ValueError, match="Reservation not found"):
            cancel_reservation(mock_db, reservation_id=RES_ID)

    def test_already_cancelled_noop(self, mock_db):
        Row = namedtuple("Row", ["branch_id", "item_id", "qty", "status"])
        mock_db.execute.return_value.one_or_none.return_value = Row(BRANCH, ITEM, 1, "cancelled")
        cancel_reservation(mock_db, reservation_id=RES_ID)
        mock_db.commit.assert_not_called()

    def test_already_fulfilled_noop(self, mock_db):
        Row = namedtuple("Row", ["branch_id", "item_id", "qty", "status"])
        mock_db.execute.return_value.one_or_none.return_value = Row(BRANCH, ITEM, 1, "fulfilled")
        cancel_reservation(mock_db, reservation_id=RES_ID)
        mock_db.commit.assert_not_called()

    def test_hold_cancels_and_releases(self, mock_db):
        Row = namedtuple("Row", ["branch_id", "item_id", "qty", "status"])
        mock_db.execute.return_value.one_or_none.return_value = Row(BRANCH, ITEM, 2, "hold")
        cancel_reservation(mock_db, reservation_id=RES_ID)
        mock_db.commit.assert_called_once()
        # Should have 3 execute calls: select, update status, insert ledger release
        assert mock_db.execute.call_count >= 3

    def test_queued_cancels_no_ledger(self, mock_db):
        Row = namedtuple("Row", ["branch_id", "item_id", "qty", "status"])
        mock_db.execute.return_value.one_or_none.return_value = Row(BRANCH, ITEM, 1, "queued")
        cancel_reservation(mock_db, reservation_id=RES_ID)
        mock_db.commit.assert_called_once()
        # queued status doesn't insert ledger entry (not in hold/active)
        # 2 calls: select + update
        assert mock_db.execute.call_count == 2


class TestPrepayReservation:
    def test_not_found_raises(self, mock_db):
        mock_db.execute.return_value.one_or_none.return_value = None
        with pytest.raises(ValueError, match="Reservation not found"):
            prepay_reservation(mock_db, reservation_id=RES_ID, unit_price_cents=100)

    def test_cancelled_raises(self, mock_db):
        Row = namedtuple("Row", ["id", "qty", "status"])
        mock_db.execute.return_value.one_or_none.return_value = Row(RES_ID, 2, "cancelled")
        with pytest.raises(ValueError, match="Cannot prepay"):
            prepay_reservation(mock_db, reservation_id=RES_ID, unit_price_cents=100)

    def test_negative_price_raises(self, mock_db):
        with pytest.raises(ValueError, match="unit_price_cents must be >= 0"):
            prepay_reservation(mock_db, reservation_id=RES_ID, unit_price_cents=-10)

    def test_success(self, mock_db):
        Row = namedtuple("Row", ["id", "qty", "status"])
        mock_db.execute.return_value.one_or_none.return_value = Row(RES_ID, 2, "hold")
        result = prepay_reservation(mock_db, reservation_id=RES_ID, unit_price_cents=500)
        assert result["reservation_id"] == RES_ID
        assert result["unit_price_cents"] == 500
        assert result["prepaid_cents"] == 1000  # 500 * 2
        mock_db.commit.assert_called_once()

    def test_explicit_prepaid_cents(self, mock_db):
        Row = namedtuple("Row", ["id", "qty", "status"])
        mock_db.execute.return_value.one_or_none.return_value = Row(RES_ID, 3, "active")
        result = prepay_reservation(mock_db, reservation_id=RES_ID, unit_price_cents=200, prepaid_cents=300)
        assert result["prepaid_cents"] == 300


class TestNowUtc:
    def test_returns_utc(self):
        now = _now_utc()
        assert now.tzinfo is not None
