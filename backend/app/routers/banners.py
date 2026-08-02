from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.deps import get_current_user, get_db, require_admin
from app.errors import AppException
from app.models.banner import Banner
from app.models.user import User
from app.response import success_response
from app.schemas.banner import BannerCreate, BannerUpdate
from app.security import utc_now
from app.audit import log_admin_action

router = APIRouter()


def _has_banner_image(image_url: str | None, image_urls: dict | None) -> bool:
    if isinstance(image_url, str) and image_url.strip():
        return True
    return isinstance(image_urls, dict) and any(
        isinstance(value, str) and value.strip() for value in image_urls.values()
    )


def _require_banner_image(image_url: str | None, image_urls: dict | None) -> None:
    if not _has_banner_image(image_url, image_urls):
        raise AppException(
            status_code=422,
            message="홈 배너 이미지를 하나 이상 등록해주세요.",
            code="BANNER_IMAGE_REQUIRED",
        )


def _banner_payload(banner: Banner) -> dict:
    return {
        "id": banner.id,
        "placement": banner.placement,
        "title": banner.title,
        "subtitle": banner.subtitle,
        "badge_text": banner.badge_text,
        "cta_label": banner.cta_label,
        "cta_href": banner.cta_href,
        "image_url": banner.image_url,
        "image_urls": banner.image_urls,
        "theme": banner.theme,
        "sort_order": banner.sort_order,
        "is_active": banner.is_active,
        "starts_at": banner.starts_at,
        "ends_at": banner.ends_at,
        "deadline_at": banner.deadline_at,
        "created_by": banner.created_by,
        "created_at": banner.created_at,
        "updated_at": banner.updated_at,
    }


@router.get("")
def get_banners(
    placement: str = Query("home", pattern="^home$"),
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if include_inactive and current_user.role != "admin":
        raise AppException(status_code=403, message="Admin access required.", code="FORBIDDEN")

    now = utc_now()
    filters = [Banner.placement == placement]
    if not include_inactive:
        filters.extend(
            [
                Banner.is_active.is_(True),
                (Banner.starts_at.is_(None) | (Banner.starts_at <= now)),
                (Banner.ends_at.is_(None) | (Banner.ends_at >= now)),
            ]
        )

    banners = db.scalars(select(Banner).where(*filters).order_by(Banner.sort_order.asc(), Banner.id.asc())).all()
    if not include_inactive:
        banners = [banner for banner in banners if _has_banner_image(banner.image_url, banner.image_urls)]
    return success_response([_banner_payload(banner) for banner in banners])


@router.post("")
def create_banner(payload: BannerCreate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    values = payload.model_dump()
    _require_banner_image(values.get("image_url"), values.get("image_urls"))
    banner = Banner(**values, created_by=admin.id)
    db.add(banner)
    db.flush()
    log_admin_action(db, actor_id=admin.id, action="banner.create", target_type="banner", target_id=banner.id)
    db.commit()
    db.refresh(banner)
    return success_response(_banner_payload(banner))


@router.put("/{banner_id}")
def update_banner(
    banner_id: int,
    payload: BannerUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    banner = db.get(Banner, banner_id)
    if banner is None:
        raise AppException(status_code=404, message="Banner not found.", code="NOT_FOUND")

    updates = payload.model_dump(exclude_unset=True)
    _require_banner_image(
        updates.get("image_url", banner.image_url),
        updates.get("image_urls", banner.image_urls),
    )
    for key, value in updates.items():
        setattr(banner, key, value)
    banner.updated_at = utc_now()
    log_admin_action(db, actor_id=admin.id, action="banner.update", target_type="banner", target_id=banner.id)
    db.commit()
    db.refresh(banner)
    return success_response(_banner_payload(banner))


@router.delete("/{banner_id}")
def delete_banner(banner_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    banner = db.get(Banner, banner_id)
    if banner is None:
        raise AppException(status_code=404, message="Banner not found.", code="NOT_FOUND")

    banner.is_active = False
    banner.updated_at = utc_now()
    log_admin_action(db, actor_id=admin.id, action="banner.deactivate", target_type="banner", target_id=banner.id)
    db.commit()
    return success_response({"id": banner_id, "is_active": False})
