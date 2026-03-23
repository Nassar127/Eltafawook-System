from __future__ import annotations
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from uuid import uuid4
from pathlib import Path
import shutil, os

from backend.app.models.user import User
from .auth import get_current_active_user

router = APIRouter()

MEDIA_ROOT = Path(os.getenv("MEDIA_ROOT", "var/uploads")).resolve()
PAYMENTS_DIR = MEDIA_ROOT / "payments"
STATIC_PREFIX = "/static"

MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB
ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf"}

def _validate_upload(file: UploadFile) -> None:
    if file.content_type and file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{file.content_type}' is not allowed. "
                   f"Accepted types: {', '.join(sorted(ALLOWED_CONTENT_TYPES))}",
        )
    ext = Path(file.filename or "").suffix.lower()
    if ext and ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File extension '{ext}' is not allowed. "
                   f"Accepted extensions: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

def _save_upload(file: UploadFile) -> dict:
    PAYMENTS_DIR.mkdir(parents=True, exist_ok=True)
    uid = str(uuid4())
    ext = Path(file.filename or "").suffix.lower() or ""
    dest = PAYMENTS_DIR / f"{uid}{ext}"
    size = 0
    with dest.open("wb") as out:
        while chunk := file.file.read(64 * 1024):
            size += len(chunk)
            if size > MAX_UPLOAD_SIZE_BYTES:
                dest.unlink(missing_ok=True)
                raise HTTPException(
                    status_code=400,
                    detail=f"File too large. Maximum size is {MAX_UPLOAD_SIZE_BYTES // (1024 * 1024)} MB.",
                )
            out.write(chunk)
    url = f"{STATIC_PREFIX}/payments/{dest.name}"
    return {"id": uid, "url": url, "filename": file.filename, "content_type": file.content_type}

async def _handle_upload(file: UploadFile = File(...)):
    if not file:
        raise HTTPException(status_code=400, detail="file is required")
    _validate_upload(file)
    return _save_upload(file)

@router.post("/uploads")
async def upload_1(file: UploadFile = File(...), current_user: User = Depends(get_current_active_user)): return await _handle_upload(file)

@router.post("/media/upload")
async def upload_2(file: UploadFile = File(...), current_user: User = Depends(get_current_active_user)): return await _handle_upload(file)

@router.post("/files/upload")
async def upload_3(file: UploadFile = File(...), current_user: User = Depends(get_current_active_user)): return await _handle_upload(file)

@router.post("/payments/upload")
async def upload_4(file: UploadFile = File(...), current_user: User = Depends(get_current_active_user)): return await _handle_upload(file)
