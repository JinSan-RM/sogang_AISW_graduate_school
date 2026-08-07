from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.deps import get_current_user, get_db, require_admin
from app.errors import AppException
from app.models.event import Event
from app.models.post import Post
from app.models.user import User
from app.notifications import create_notification, deadline_message, event_message
from app.audit import log_admin_action
from app.response import success_response
from app.schemas.event import EventCreate, EventUpdate

router = APIRouter()


def _dispatch_for_date(db: Session, target_date: date) -> dict:
    created = 0
    active_user_ids = db.scalars(select(User.id).where(User.is_active.is_(True))).all()
    for days_before, label in ((0, "D-day"), (1, "D-1")):
        event_date = target_date + timedelta(days=days_before)
        window_start = datetime.combine(event_date, time.min)
        window_end = window_start + timedelta(days=1)
        events = db.scalars(
            select(Event).where(Event.start_at >= window_start, Event.start_at < window_end)
        ).all()
        for event in events:
            message = event_message(event.title, days_before)
            for user_id in active_user_ids:
                notification = create_notification(
                    db,
                    user_id=user_id,
                    actor_id=None,
                    notification_type="event",
                    message=message,
                    event_id=event.id,
                    setting_field="notify_event",
                    dedupe_key=f"event-reminder:{event.id}:{label}:{user_id}",
                )
                if notification is not None:
                    created += 1
        notices = db.scalars(
            select(Post).where(
                Post.is_notice.is_(True),
                Post.status == "published",
                Post.deleted_at.is_(None),
                Post.deadline_at >= window_start,
                Post.deadline_at < window_end,
            )
        ).all()
        for notice in notices:
            message = deadline_message(notice.title, days_before)
            for user_id in active_user_ids:
                notification = create_notification(
                    db,
                    user_id=user_id,
                    actor_id=None,
                    notification_type="notice",
                    message=message,
                    post_id=notice.id,
                    setting_field="notify_notice",
                    dedupe_key=f"notice-deadline:{notice.id}:{label}:{user_id}",
                )
                if notification is not None:
                    created += 1
    db.commit()
    return {"target_date": target_date.isoformat(), "created": created}


def _event_payload(event: Event) -> dict:
    return {
        "id": event.id,
        "title": event.title,
        "description": event.description,
        "location": event.location,
        "category": event.category,
        "color": event.color,
        "start_at": event.start_at,
        "end_at": event.end_at,
        "created_by": event.created_by,
        "created_at": event.created_at,
        "updated_at": event.updated_at,
    }


@router.get("")
def get_events(
    from_date: datetime | None = Query(None),
    to_date: datetime | None = Query(None),
    category: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    filters = []
    if from_date is not None:
        # 종료일(없으면 시작일)이 조회 시작 이후면 포함 → 여러 날에 걸친 일정도 모든 날에 조회된다.
        filters.append(func.coalesce(Event.end_at, Event.start_at) >= from_date)
    if to_date is not None:
        exclusive_end = to_date + timedelta(days=1) if to_date.time() == time.min else to_date
        filters.append(Event.start_at < exclusive_end)
    if category:
        filters.append(Event.category == category)

    events = db.scalars(select(Event).where(*filters).order_by(Event.start_at.asc(), Event.id.asc())).all()
    return success_response([_event_payload(event) for event in events])


@router.post("/admin/dispatch-reminders")
def dispatch_event_reminders(
    target_date: date | None = Query(None),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    result = _dispatch_for_date(db, target_date or datetime.now(ZoneInfo("Asia/Seoul")).date())
    log_admin_action(
        db,
        actor_id=admin.id,
        action="event.reminders.dispatch",
        target_type="event",
        details=result,
    )
    db.commit()
    return success_response(result)


@router.get("/{event_id}")
def get_event(event_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    event = db.get(Event, event_id)
    if event is None:
        raise AppException(status_code=404, message="Event not found.", code="NOT_FOUND")
    return success_response(_event_payload(event))


@router.post("")
def create_event(payload: EventCreate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    event = Event(**payload.model_dump(), created_by=admin.id)
    db.add(event)
    db.flush()
    log_admin_action(db, actor_id=admin.id, action="event.create", target_type="event", target_id=event.id)
    db.commit()
    db.refresh(event)
    return success_response(_event_payload(event))


@router.put("/{event_id}")
def update_event(
    event_id: int,
    payload: EventUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    event = db.get(Event, event_id)
    if event is None:
        raise AppException(status_code=404, message="Event not found.", code="NOT_FOUND")

    for key, value in payload.model_dump().items():
        setattr(event, key, value)
    log_admin_action(db, actor_id=admin.id, action="event.update", target_type="event", target_id=event.id)
    db.commit()
    db.refresh(event)
    return success_response(_event_payload(event))


@router.delete("/{event_id}")
def delete_event(event_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    event = db.get(Event, event_id)
    if event is None:
        raise AppException(status_code=404, message="Event not found.", code="NOT_FOUND")

    log_admin_action(db, actor_id=admin.id, action="event.delete", target_type="event", target_id=event.id)
    db.delete(event)
    db.commit()
    return success_response({"id": event_id})
