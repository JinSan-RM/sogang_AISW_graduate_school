from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.notification import Notification, NotificationSetting
from app.models.user import User
from app.push import send_push_to_user


def _settings_allows(db: Session, user_id: int, field: str) -> bool:
    setting = db.scalar(select(NotificationSetting).where(NotificationSetting.user_id == user_id))
    if setting is None:
        setting = NotificationSetting(user_id=user_id)
        db.add(setting)
        db.flush()
    return bool(getattr(setting, field))


def create_notification(
    db: Session,
    *,
    user_id: int,
    actor_id: int | None,
    notification_type: str,
    message: str,
    post_id: int | None = None,
    event_id: int | None = None,
    setting_field: str | None = None,
    dedupe_key: str | None = None,
) -> Notification | None:
    if actor_id is not None and user_id == actor_id:
        return None
    if dedupe_key and db.scalar(select(Notification.id).where(Notification.dedupe_key == dedupe_key)) is not None:
        return None
    if setting_field and not _settings_allows(db, user_id, setting_field):
        return None
    notification = Notification(
        user_id=user_id,
        notification_type=notification_type,
        message=message,
        post_id=post_id,
        event_id=event_id,
        dedupe_key=dedupe_key,
    )
    db.add(notification)
    db.flush()
    send_push_to_user(
        db,
        user_id,
        "Sogang AI-SW",
        message,
        {
            "notification_id": notification.id,
            "notification_type": notification_type,
            "post_id": post_id,
            "event_id": event_id,
        },
        notification_id=notification.id,
    )
    return notification


def notify_admins(
    db: Session,
    *,
    actor_id: int,
    notification_type: str,
    message: str,
    post_id: int | None = None,
) -> None:
    admin_ids = db.scalars(select(User.id).where(User.role == "admin", User.is_active.is_(True))).all()
    for admin_id in admin_ids:
        create_notification(
            db,
            user_id=admin_id,
            actor_id=actor_id,
            notification_type=notification_type,
            message=message,
            post_id=post_id,
            setting_field="notify_notice",
        )
