from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.deps import get_current_user, get_db
from app.errors import AppException
from app.models.notification import Notification, NotificationSetting, PushToken
from app.models.user import User
from app.response import success_response
from app.schemas.notification import NotificationSettingUpdate, PushTokenRegister

router = APIRouter()


def _setting_payload(setting: NotificationSetting) -> dict:
    return {
        "notify_comment": setting.notify_comment,
        "notify_like": setting.notify_like,
        "notify_notice": setting.notify_notice,
        "notify_event": setting.notify_event,
    }


def _notification_payload(notification: Notification) -> dict:
    return {
        "id": notification.id,
        "notification_type": notification.notification_type,
        "message": notification.message,
        "post_id": notification.post_id,
        "event_id": notification.event_id,
        "is_read": notification.is_read,
        "created_at": notification.created_at,
    }


def _get_or_create_setting(db: Session, user: User) -> NotificationSetting:
    setting = db.scalar(select(NotificationSetting).where(NotificationSetting.user_id == user.id))
    if setting is None:
        setting = NotificationSetting(user_id=user.id)
        db.add(setting)
        db.commit()
        db.refresh(setting)
    return setting


@router.get("")
def get_notifications(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    notifications = db.scalars(
        select(Notification)
        .where(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc(), Notification.id.desc())
        .limit(50)
    ).all()
    return success_response([_notification_payload(notification) for notification in notifications])


@router.put("/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    notification = db.get(Notification, notification_id)
    if notification is None or notification.user_id != user.id:
        raise AppException(status_code=404, message="Notification not found.", code="NOT_FOUND")

    notification.is_read = True
    db.commit()
    return success_response({"id": notification_id, "is_read": True})


@router.get("/settings/me")
def get_notification_settings(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    setting = _get_or_create_setting(db, user)
    return success_response(_setting_payload(setting))


@router.put("/settings/me")
def update_notification_settings(
    payload: NotificationSettingUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    setting = _get_or_create_setting(db, user)
    for key, value in payload.model_dump().items():
        setattr(setting, key, value)
    db.commit()
    db.refresh(setting)
    return success_response(_setting_payload(setting))


@router.post("/push-token")
def register_push_token(
    payload: PushTokenRegister,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    token = db.scalar(select(PushToken).where(PushToken.token == payload.token))
    if token is None:
        token = PushToken(user_id=user.id, token=payload.token, platform=payload.platform, is_active=True)
        db.add(token)
    else:
        token.user_id = user.id
        token.platform = payload.platform
        token.is_active = True
    db.commit()
    db.refresh(token)
    return success_response({"id": token.id, "registered": True})


@router.delete("/push-token")
def deactivate_push_token(
    payload: PushTokenRegister,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    token = db.scalar(select(PushToken).where(PushToken.token == payload.token, PushToken.user_id == user.id))
    if token is not None:
        token.is_active = False
        db.commit()
    return success_response({"registered": False})
