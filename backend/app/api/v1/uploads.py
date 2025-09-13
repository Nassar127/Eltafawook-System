from __future__ import annotations
from fastapi import APIRouter, UploadFile, File, HTTPException
from uuid import uuid4
from pathlib import Path
import shutil, os

router = APIRouter()

MEDIA_ROOT = Path(os.getenv("MEDIA_ROOT", "var/uploads")).resolve()
PAYMENTS_DIR = MEDIA_ROOT / "payments"
STATIC_PREFIX = "/static"

def _save_upload(file: UploadFile) -> dict:
    PAYMENTS_DIR.mkdir(parents=True, exist_ok=True)
    uid = str(uuid4())
    ext = Path(file.filename or "").suffix or ""
    dest = PAYMENTS_DIR / f"{uid}{ext}"
    with dest.open("wb") as out:
        shutil.copyfileobj(file.file, out)
    url = f"{STATIC_PREFIX}/payments/{dest.name}"
    return {"id": uid, "url": url, "filename": file.filename, "content_type": file.content_type}

async def _handle_upload(file: UploadFile = File(...)):
    if not file:
        raise HTTPException(status_code=400, detail="file is required")
    return _save_upload(file)

@router.post("/uploads")
async def upload_1(file: UploadFile = File(...)): return await _handle_upload(file)

@router.post("/media/upload")
async def upload_2(file: UploadFile = File(...)): return await _handle_upload(file)

@router.post("/files/upload")
async def upload_3(file: UploadFile = File(...)): return await _handle_upload(file)

@router.post("/payments/upload")
async def upload_4(file: UploadFile = File(...)): return await _handle_upload(file)
