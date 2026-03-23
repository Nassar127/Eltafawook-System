# backend/app/main.py
from fastapi import FastAPI
from backend.app.core.config import get_settings
from backend.app.core.exceptions import register_exception_handlers
from backend.app.core.logging_config import setup_logging, register_logging_middleware
from backend.app.api.v1.router import api_router
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from backend.app.db.session import SessionLocal
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import os

settings = get_settings()

# Initialise structured logging before anything else
setup_logging(app_env=settings.app_env)

app = FastAPI(title="eltafawook", version="0.1.0")
app.include_router(api_router, prefix="/api/v1")

# Register global exception handlers (structured error responses)
register_exception_handlers(app)

# Request logging middleware (adds request_id, logs request/response)
register_logging_middleware(app)

MEDIA_ROOT = Path(os.getenv("MEDIA_ROOT", "var/uploads")).resolve()
MEDIA_ROOT.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(MEDIA_ROOT)), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def _warm_db_pool():
    with SessionLocal() as s:
        s.execute(text("SELECT 1"))

@app.get("/healthz")
def healthz():
    return {"status": "ok", "env": settings.app_env}

