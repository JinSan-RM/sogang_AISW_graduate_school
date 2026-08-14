from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, Query, Request, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.deps import get_current_user, get_db
from app.errors import AppException
from app.media_service import (
    create_media_access_url,
    delete_stored_upload,
    media_access_reference,
    media_download_filename,
    media_storage_path,
    migrate_private_asset,
    migrate_private_files as migrate_private_files_for_session,
    require_media_access,
    resolve_media_reference,
    store_upload,
    validate_media_file_signature,
)
from app.models.media import MediaAsset
from app.models.user import User
from app.rate_limit import enforce_rate_limit
from app.response import success_response
from app.schemas.media import MediaAccessUrlPayload, MediaAssetPayload


router = APIRouter()


def _media_payload(media: MediaAsset) -> dict:
    access_reference = media_access_reference(media.id)
    return MediaAssetPayload(
        id=media.id,
        original_filename=media.original_filename,
        stored_filename=media.stored_filename,
        content_type=media.content_type,
        file_size=media.file_size,
        url=access_reference,
        access_url=access_reference,
        is_private=media.is_private,
        status=media.status,
        created_at=media.created_at,
    ).model_dump()


def _access_url_payload(media: MediaAsset) -> dict:
    url, expires_in = create_media_access_url(media)
    return MediaAccessUrlPayload(url=url, expires_in=expires_in).model_dump()


def _issue_access_url(media: MediaAsset | None, db: Session, user: User) -> dict:
    authorized_media = require_media_access(db, media, user)
    return success_response(_access_url_payload(authorized_media))


def migrate_private_files(db: Session) -> None:
    """Startup compatibility wrapper retained for app.main's lifespan hook."""

    migrate_private_files_for_session(db)


@router.post("/uploads")
async def upload_media(
    request: Request,
    file: UploadFile = File(...),
    private: bool = Form(False),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    enforce_rate_limit(
        request,
        action="media.upload",
        subject=str(user.id),
        limit=20,
        ip_limit=60,
        window_seconds=3600,
    )

    stored = None
    committed = False
    try:
        stored = await store_upload(file, private=private)
        media = MediaAsset(
            owner_id=user.id,
            original_filename=stored.original_filename,
            stored_filename=stored.stored_filename,
            content_type=stored.content_type,
            file_size=stored.file_size,
            url=None,
            is_private=private,
            status="ready",
        )
        db.add(media)
        db.flush()
        media.url = media_access_reference(media.id)
        db.commit()
        committed = True
        db.refresh(media)
    except BaseException:
        if not committed:
            db.rollback()
            if stored is not None:
                delete_stored_upload(stored)
        raise
    finally:
        await file.close()

    return success_response(_media_payload(media))


@router.get("/access-url")
def create_media_access_url_from_reference(
    path: str = Query(..., min_length=1, max_length=500),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Resolve stable and legacy server-relative references without exposing storage paths."""

    media = resolve_media_reference(db, path)
    return _issue_access_url(media, db, user)


def _serve_signed_media(
    media_id: int,
    *,
    expires: int,
    signature: str,
    db: Session,
) -> FileResponse:
    media = db.get(MediaAsset, media_id)
    if media is None or media.status != "ready":
        raise AppException(
            status_code=403,
            message="Media access URL expired or is invalid.",
            code="FORBIDDEN",
        )
    validate_media_file_signature(media, expires=expires, signature=signature)

    path: Path = migrate_private_asset(media) if media.is_private else media_storage_path(media)
    if not path.is_file():
        raise AppException(status_code=404, message="Media file not found.", code="NOT_FOUND")

    response = FileResponse(
        path,
        media_type=media.content_type,
        filename=media_download_filename(media),
        content_disposition_type="inline" if media.content_type.startswith("image/") else "attachment",
    )
    response.headers["Cache-Control"] = "private, no-store" if media.is_private else "private, max-age=60"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response


@router.get("/files/{media_id}")
def serve_media_file(
    media_id: int,
    expires: int = Query(...),
    signature: str = Query(..., min_length=64, max_length=64),
    db: Session = Depends(get_db),
):
    """Capability URL target; the signature is the short-lived authorization."""

    return _serve_signed_media(
        media_id,
        expires=expires,
        signature=signature,
        db=db,
    )


@router.get("/private/{media_id}")
def download_private_media_compat(
    media_id: int,
    expires: int = Query(...),
    signature: str = Query(..., min_length=64, max_length=64),
    db: Session = Depends(get_db),
):
    """Compatibility target for already-issued private-link clients."""

    return _serve_signed_media(
        media_id,
        expires=expires,
        signature=signature,
        db=db,
    )


@router.get("/{media_id}/access-url")
def issue_media_access_url(
    media_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return _issue_access_url(db.get(MediaAsset, media_id), db, user)


@router.get("/{media_id}/download-link")
def create_private_download_link_compat(
    media_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Backward-compatible alias; authorization now covers every media context."""

    return _issue_access_url(db.get(MediaAsset, media_id), db, user)


@router.get("/{media_id}")
def get_media(
    media_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    media = require_media_access(db, db.get(MediaAsset, media_id), user)
    return success_response(_media_payload(media))
