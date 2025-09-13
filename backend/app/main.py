# backend/app/main.py
from fastapi import FastAPI
from backend.app.core.config import get_settings
from backend.app.api.v1.router import api_router
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from backend.app.db.session import SessionLocal
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import os

settings = get_settings()

app = FastAPI(title="eltafawook", version="0.1.0")
app.include_router(api_router, prefix="/api/v1")

MEDIA_ROOT = Path(os.getenv("MEDIA_ROOT", "var/uploads")).resolve()
MEDIA_ROOT.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(MEDIA_ROOT)), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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

origins = [
    "http://localhost:5173",
]

