"""API integration tests — Test route modules with TestClient.

These tests verify HTTP-level behavior (status codes, auth guards, response shape).
They hit the real FastAPI app but the DB calls will fail gracefully since there's
no live Postgres; we test what we can without a DB: auth, validation, error shapes.
"""
import pytest
from uuid import uuid4


# ── Auth routes ──

class TestAuthRoutes:
    def test_token_missing_credentials(self, client):
        resp = client.post("/api/v1/auth/token", data={})
        assert resp.status_code == 422

    def test_token_wrong_credentials(self, client):
        resp = client.post("/api/v1/auth/token", data={"username": "nobody", "password": "wrong"})
        # Will be 401 (bad creds) or 500 (no DB) — both acceptable
        assert resp.status_code in (401, 500, 503)

    def test_refresh_missing_body(self, client):
        resp = client.post("/api/v1/auth/refresh", json={})
        assert resp.status_code == 422

    def test_refresh_invalid_token(self, client):
        resp = client.post("/api/v1/auth/refresh", json={"refresh_token": "garbage"})
        assert resp.status_code == 401


# ── Health ──

class TestHealthRoute:
    def test_healthz(self, client):
        resp = client.get("/healthz")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"


# ── Protected routes require auth ──

class TestAuthGuards:
    """All protected endpoints should return 401 without a token."""

    @pytest.mark.parametrize("path", [
        "/api/v1/students/search?q=test",
        "/api/v1/branches",
        "/api/v1/teachers",
        "/api/v1/schools",
        "/api/v1/items",
        "/api/v1/kg-students?branch_id=00000000-0000-0000-0000-000000000001",
        "/api/v1/kg-items?branch_id=00000000-0000-0000-0000-000000000001",
    ])
    def test_unauthenticated_returns_401(self, client, path):
        resp = client.get(path)
        assert resp.status_code == 401

    @pytest.mark.parametrize("method,path", [
        ("POST", "/api/v1/students"),
        ("POST", "/api/v1/branches"),
        ("POST", "/api/v1/teachers"),
        ("POST", "/api/v1/reservations"),
    ])
    def test_unauthenticated_post_returns_401(self, client, method, path):
        resp = client.request(method, path, json={})
        assert resp.status_code == 401


# ── Structured error responses ──

class TestStructuredErrors:
    def test_404_returns_json(self, client):
        resp = client.get("/api/v1/nonexistent-route-xyz")
        assert resp.status_code in (404, 405)
        data = resp.json()
        # App may return structured {ok, error, request_id} or default {detail}
        assert "detail" in data or "error" in data

    def test_422_or_503_on_bad_body(self, client, admin_headers):
        # POST to students with empty body → 422 (validation) or 503 (no DB for auth)
        resp = client.post("/api/v1/students", json={}, headers=admin_headers)
        assert resp.status_code in (422, 503)
        data = resp.json()
        assert "detail" in data or "error" in data


# ── Admin-only routes ──

class TestAdminRoutes:
    def test_dashboard_requires_auth(self, client):
        resp = client.get("/api/v1/dashboard/summary")
        assert resp.status_code == 401

    def test_dashboard_requires_admin(self, client, staff_headers):
        resp = client.get("/api/v1/dashboard/summary", headers=staff_headers)
        # staff user → 403 or 500 (DB unavailable)
        assert resp.status_code in (403, 500, 503)

    def test_export_students_requires_auth(self, client):
        resp = client.get("/api/v1/export/students")
        assert resp.status_code == 401

    def test_export_students_requires_admin(self, client, staff_headers):
        resp = client.get("/api/v1/export/students", headers=staff_headers)
        assert resp.status_code in (403, 500, 503)

    def test_audit_requires_auth(self, client):
        resp = client.get("/api/v1/audit")
        assert resp.status_code == 401

    def test_audit_requires_admin(self, client, staff_headers):
        resp = client.get("/api/v1/audit", headers=staff_headers)
        assert resp.status_code in (403, 500, 503)

    def test_audit_types_requires_auth(self, client):
        resp = client.get("/api/v1/audit/types")
        assert resp.status_code == 401


# ── Pagination query params ──

class TestPaginationParams:
    def test_students_search_accepts_pagination(self, client, admin_headers):
        resp = client.get("/api/v1/students/search?q=test&offset=0&limit=10", headers=admin_headers)
        # Will be 200 (if DB works) or 503 (no DB for auth lookup) — not 422
        assert resp.status_code in (200, 500, 503)

    def test_invalid_limit_rejected(self, client, admin_headers):
        resp = client.get("/api/v1/students/search?q=test&limit=999", headers=admin_headers)
        # 422 (validation) or 503 (DB unreachable before validation)
        assert resp.status_code in (422, 503)

    def test_negative_offset_rejected(self, client, admin_headers):
        resp = client.get("/api/v1/students/search?q=test&offset=-1", headers=admin_headers)
        assert resp.status_code in (422, 503)
