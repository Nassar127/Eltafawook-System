"""Shared test fixtures for backend tests."""
import os, sys
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["JWT_SECRET"] = "test-secret-key-for-tests"
os.environ["APP_ENV"] = "test"

# Patch create_engine BEFORE session.py is imported so PostgreSQL-specific
# kwargs don't blow up on a SQLite URL.
from unittest.mock import patch as _patch
from sqlalchemy import create_engine as _real_create_engine
from sqlalchemy.orm import sessionmaker, Session

_test_engine = _real_create_engine(
    "sqlite:///:memory:", connect_args={"check_same_thread": False}
)

def _fake_create_engine(*args, **kwargs):
    """Ignore all kwargs and return the shared test engine."""
    return _test_engine

_patcher = _patch("sqlalchemy.create_engine", side_effect=_fake_create_engine)
_patcher.start()                         # active for the rest of the process

# Now import the app — session.py's create_engine() call will be intercepted
import backend.app.db.session as _sess_mod
_sess_mod.engine = _test_engine
_sess_mod.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_test_engine)

import pytest
from unittest.mock import MagicMock
from backend.app.core.security import create_access_token


# ── Fake DB session (mock-based, no real DB needed) ──

@pytest.fixture
def mock_db():
    """Return a MagicMock that behaves like a SQLAlchemy Session."""
    db = MagicMock(spec=Session)
    db.execute.return_value = MagicMock()
    return db


# ── TestClient with auth ──

@pytest.fixture
def app():
    from backend.app.main import app as _app
    return _app


@pytest.fixture
def client(app):
    from fastapi.testclient import TestClient
    return TestClient(app, raise_server_exceptions=False)


@pytest.fixture
def admin_token():
    return create_access_token(data={"sub": "admin", "role": "admin", "branch_id": None})


@pytest.fixture
def staff_token():
    return create_access_token(data={"sub": "staff1", "role": "banha_staff", "branch_id": "00000000-0000-0000-0000-000000000001"})


@pytest.fixture
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture
def staff_headers(staff_token):
    return {"Authorization": f"Bearer {staff_token}"}
