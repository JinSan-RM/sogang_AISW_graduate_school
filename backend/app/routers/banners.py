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
    _: User = Depends(get_current_user),
):
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
    return success_response([_banner_payload(banner) for banner in banners])


@router.post("")
def create_banner(payload: BannerCreate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    banner = Banner(**payload.model_dump(), created_by=admin.id)
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

    for key, value in payload.model_dump(exclude_unset=True).items():
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
