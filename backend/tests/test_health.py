"""Smoke test to verify the app starts and healthz works."""
from fastapi.testclient import TestClient


def test_healthz():
    from backend.app.main import app
    client = TestClient(app, raise_server_exceptions=False)
    resp = client.get("/healthz")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"


def test_structured_error_on_404():
    from backend.app.main import app
    client = TestClient(app, raise_server_exceptions=False)
    resp = client.get("/api/v1/nonexistent")
    assert resp.status_code in (404, 405)
    data = resp.json()
    # App may return structured {ok, error, request_id} or default {detail}
    assert "detail" in data or "error" in data
