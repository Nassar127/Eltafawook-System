"""
Global exception handlers for consistent, structured error responses.
"""
from __future__ import annotations

import logging
import traceback
from uuid import uuid4

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError, OperationalError

logger = logging.getLogger("eltafawook")


def _error_body(
    *,
    status_code: int,
    error: str,
    detail: str | list | None = None,
    request_id: str | None = None,
) -> dict:
    return {
        "ok": False,
        "error": error,
        "detail": detail,
        "status_code": status_code,
        "request_id": request_id,
    }


async def _validation_error_handler(request: Request, exc: RequestValidationError):
    request_id = getattr(request.state, "request_id", None)
    errors = []
    for e in exc.errors():
        loc = " -> ".join(str(l) for l in e.get("loc", []))
        errors.append({"field": loc, "message": e.get("msg", ""), "type": e.get("type", "")})
    logger.warning("Validation error on %s %s: %s", request.method, request.url.path, errors)
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=_error_body(
            status_code=422,
            error="validation_error",
            detail=errors,
            request_id=request_id,
        ),
    )


async def _http_exception_handler(request: Request, exc):
    request_id = getattr(request.state, "request_id", None)
    status_code = getattr(exc, "status_code", 500)
    detail = getattr(exc, "detail", "Unknown error")
    if status_code >= 500:
        logger.error("HTTP %s on %s %s: %s", status_code, request.method, request.url.path, detail)
    else:
        logger.info("HTTP %s on %s %s: %s", status_code, request.method, request.url.path, detail)
    return JSONResponse(
        status_code=status_code,
        content=_error_body(
            status_code=status_code,
            error="http_error",
            detail=detail,
            request_id=request_id,
        ),
    )


async def _integrity_error_handler(request: Request, exc: IntegrityError):
    request_id = getattr(request.state, "request_id", None)
    logger.error("DB integrity error on %s %s: %s", request.method, request.url.path, str(exc.orig))
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content=_error_body(
            status_code=409,
            error="conflict",
            detail="A database constraint was violated. The record may already exist.",
            request_id=request_id,
        ),
    )


async def _db_connection_error_handler(request: Request, exc: OperationalError):
    request_id = getattr(request.state, "request_id", None)
    logger.critical("DB connection error on %s %s: %s", request.method, request.url.path, str(exc))
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content=_error_body(
            status_code=503,
            error="service_unavailable",
            detail="Database is temporarily unavailable. Please try again later.",
            request_id=request_id,
        ),
    )


async def _unhandled_exception_handler(request: Request, exc: Exception):
    request_id = getattr(request.state, "request_id", None)
    logger.critical(
        "Unhandled exception on %s %s: %s\n%s",
        request.method,
        request.url.path,
        str(exc),
        traceback.format_exc(),
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=_error_body(
            status_code=500,
            error="internal_server_error",
            detail="An unexpected error occurred." if not _is_debug() else str(exc),
            request_id=request_id,
        ),
    )


def _is_debug() -> bool:
    from backend.app.core.config import settings
    return settings.app_env == "dev"


def register_exception_handlers(app: FastAPI) -> None:
    from fastapi.exceptions import HTTPException
    app.add_exception_handler(RequestValidationError, _validation_error_handler)
    app.add_exception_handler(HTTPException, _http_exception_handler)
    app.add_exception_handler(IntegrityError, _integrity_error_handler)
    app.add_exception_handler(OperationalError, _db_connection_error_handler)
    app.add_exception_handler(Exception, _unhandled_exception_handler)
