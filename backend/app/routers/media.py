import hashlib
import hmac
import time
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, Query, Request, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.deps import get_current_user, get_db
from app.errors import AppException
from app.models.media import MediaAsset
from app.models.user import User
from app.response import success_response
from app.rate_limit import enforce_rate_limit
from app.security import generate_token_urlsafe


router = APIRouter()
UPLOAD_DIR = Path("uploads")
PRIVATE_UPLOAD_DIR = Path("private_uploads")
PRIVATE_LINK_SECONDS = 5 * 60


def _media_payload(media: MediaAsset) -> dict:
    return {
        "id": media.id,
        "original_filename": media.original_filename,
        "stored_filename": media.stored_filename,
        "content_type": media.content_type,
        "file_size": media.file_size,
        "url": None if media.is_private else media.url,
        "is_private": media.is_private,
        "status": media.status,
        "created_at": media.created_at,
    }


def _private_signature(media_id: int, expires: int) -> str:
    message = f"{media_id}:{expires}".encode("utf-8")
    return hmac.new(settings.auth_secret_key.encode("utf-8"), message, hashlib.sha256).hexdigest()


def _can_access_private(media: MediaAsset, user: User) -> bool:
    return user.role == "admin" or media.owner_id == user.id


def _private_path(media: MediaAsset) -> Path:
    PRIVATE_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    private_path = PRIVATE_UPLOAD_DIR / media.stored_filename
    legacy_public_path = UPLOAD_DIR / media.stored_filename
    if not private_path.exists() and legacy_public_path.exists():
        legacy_public_path.replace(private_path)
    return private_path


def migrate_private_files(db: Session) -> None:
    private_media = db.query(MediaAsset).filter(MediaAsset.is_private.is_(True)).all()
    for media in private_media:
        _private_path(media)


@router.post("/uploads")
async def upload_media(
    request: Request,
    file: UploadFile = File(...),
    private: bool = Form(False),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    enforce_rate_limit(request, action="media.upload", subject=str(user.id), limit=20, ip_limit=60, window_seconds=3600)
    content = await file.read()
    if not content:
        raise AppException(status_code=400, message="Empty file.", code="BAD_REQUEST")

    target_dir = PRIVATE_UPLOAD_DIR if private else UPLOAD_DIR
    target_dir.mkdir(parents=True, exist_ok=True)
    suffix = Path(file.filename or "upload").suffix
    stored_filename = f"{generate_token_urlsafe()}{suffix}"
    path = target_dir / stored_filename
    path.write_bytes(content)

    media = MediaAsset(
        owner_id=user.id,
        original_filename=file.filename or stored_filename,
        stored_filename=stored_filename,
        content_type=file.content_type or "application/octet-stream",
        file_size=len(content),
        url=None if private else f"/uploads/{stored_filename}",
        is_private=private,
        status="ready",
    )
    db.add(media)
    db.commit()
    db.refresh(media)
    return success_response(_media_payload(media))


@router.get("/{media_id}/download-link")
def create_private_download_link(
    media_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    media = db.get(MediaAsset, media_id)
    if media is None or not media.is_private:
        raise AppException(status_code=404, message="Private media not found.", code="NOT_FOUND")
    if not _can_access_private(media, user):
        raise AppException(status_code=403, message="Forbidden.", code="FORBIDDEN")
    expires = int(time.time()) + PRIVATE_LINK_SECONDS
    signature = _private_signature(media.id, expires)
    return success_response(
        {
            "url": f"/api/media/private/{media.id}?expires={expires}&signature={signature}",
            "expires_in": PRIVATE_LINK_SECONDS,
        }
    )


@router.get("/private/{media_id}")
def download_private_media(
    media_id: int,
    expires: int = Query(...),
    signature: str = Query(...),
    db: Session = Depends(get_db),
):
    if expires < int(time.time()) or not hmac.compare_digest(signature, _private_signature(media_id, expires)):
        raise AppException(status_code=403, message="Download link expired or invalid.", code="FORBIDDEN")
    media = db.get(MediaAsset, media_id)
    if media is None or not media.is_private:
        raise AppException(status_code=404, message="Private media not found.", code="NOT_FOUND")
    path = _private_path(media)
    if not path.exists():
        raise AppException(status_code=404, message="Private media file not found.", code="NOT_FOUND")
    return FileResponse(path, media_type=media.content_type, filename=media.original_filename)


@router.get("/{media_id}")
def get_media(media_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    media = db.get(MediaAsset, media_id)
    if media is None:
        raise AppException(status_code=404, message="Media not found.", code="NOT_FOUND")
    if media.is_private and not _can_access_private(media, user):
        raise AppException(status_code=403, message="Forbidden.", code="FORBIDDEN")
    return success_response(_media_payload(media))
