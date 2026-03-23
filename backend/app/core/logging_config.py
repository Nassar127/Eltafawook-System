"""
Structured JSON logging configuration.
"""
from __future__ import annotations

import json
import logging
import sys
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import FastAPI, Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint


class JSONFormatter(logging.Formatter):
    """Emit each log record as a single JSON line."""

    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }
        if hasattr(record, "request_id"):
            log_entry["request_id"] = record.request_id
        if record.exc_info and record.exc_info[0] is not None:
            log_entry["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_entry, default=str)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Attach a request_id to every request and log request/response."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        request_id = request.headers.get("X-Request-ID", str(uuid4())[:8])
        request.state.request_id = request_id

        logger = logging.getLogger("eltafawook")
        logger.info(
            "%s %s started",
            request.method,
            request.url.path,
            extra={"request_id": request_id},
        )

        import time
        t0 = time.perf_counter()
        response = await call_next(request)
        ms = round((time.perf_counter() - t0) * 1000)

        logger.info(
            "%s %s -> %s (%dms)",
            request.method,
            request.url.path,
            response.status_code,
            ms,
            extra={"request_id": request_id},
        )
        response.headers["X-Request-ID"] = request_id
        return response


def setup_logging(app_env: str = "dev") -> None:
    """Configure the root 'eltafawook' logger with JSON output."""
    log_level = logging.DEBUG if app_env == "dev" else logging.INFO

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JSONFormatter())

    logger = logging.getLogger("eltafawook")
    logger.setLevel(log_level)
    logger.handlers.clear()
    logger.addHandler(handler)
    logger.propagate = False

    # Quieten noisy third-party loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

    logger.info("Logging initialized (level=%s, env=%s)", logging.getLevelName(log_level), app_env)


def register_logging_middleware(app: FastAPI) -> None:
    app.add_middleware(RequestLoggingMiddleware)
