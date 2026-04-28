from pathlib import Path

from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from app.deps import get_current_user, get_db
from app.errors import AppException
from app.models.media import MediaAsset
from app.models.user import User
from app.response import success_response
from app.security import generate_token_urlsafe

router = APIRouter()

UPLOAD_DIR = Path("uploads")


def _media_payload(media: MediaAsset) -> dict:
    return {
        "id": media.id,
        "original_filename": media.original_filename,
        "stored_filename": media.stored_filename,
        "content_type": media.content_type,
        "file_size": media.file_size,
        "url": media.url,
        "status": media.status,
        "created_at": media.created_at,
    }


@router.post("/uploads")
async def upload_media(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    content = await file.read()
    if not content:
        raise AppException(status_code=400, message="Empty file.", code="BAD_REQUEST")

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    suffix = Path(file.filename or "upload").suffix
    stored_filename = f"{generate_token_urlsafe()}{suffix}"
    path = UPLOAD_DIR / stored_filename
    path.write_bytes(content)

    media = MediaAsset(
        owner_id=user.id,
        original_filename=file.filename or stored_filename,
        stored_filename=stored_filename,
        content_type=file.content_type or "application/octet-stream",
        file_size=len(content),
        url=f"/uploads/{stored_filename}",
        status="ready",
    )
    db.add(media)
    db.commit()
    db.refresh(media)

    return success_response(_media_payload(media))


@router.get("/{media_id}")
def get_media(media_id: int, db: Session = Depends(get_db)):
    media = db.get(MediaAsset, media_id)
    if media is None:
        raise AppException(status_code=404, message="Media not found.", code="NOT_FOUND")
    return success_response(_media_payload(media))
