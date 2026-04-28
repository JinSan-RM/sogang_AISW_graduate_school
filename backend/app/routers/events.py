from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.deps import get_db, require_admin
from app.errors import AppException
from app.models.event import Event
from app.models.user import User
from app.response import success_response
from app.schemas.event import EventCreate, EventUpdate

router = APIRouter()


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
):
    filters = []
    if from_date is not None:
        filters.append(Event.start_at >= from_date)
    if to_date is not None:
        filters.append(Event.start_at <= to_date)
    if category:
        filters.append(Event.category == category)

    events = db.scalars(select(Event).where(*filters).order_by(Event.start_at.asc(), Event.id.asc())).all()
    return success_response([_event_payload(event) for event in events])


@router.get("/{event_id}")
def get_event(event_id: int, db: Session = Depends(get_db)):
    event = db.get(Event, event_id)
    if event is None:
        raise AppException(status_code=404, message="Event not found.", code="NOT_FOUND")
    return success_response(_event_payload(event))


@router.post("")
def create_event(payload: EventCreate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    event = Event(**payload.model_dump(), created_by=admin.id)
    db.add(event)
    db.commit()
    db.refresh(event)
    return success_response(_event_payload(event))


@router.put("/{event_id}")
def update_event(
    event_id: int,
    payload: EventUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    event = db.get(Event, event_id)
    if event is None:
        raise AppException(status_code=404, message="Event not found.", code="NOT_FOUND")

    for key, value in payload.model_dump().items():
        setattr(event, key, value)
    db.commit()
    db.refresh(event)
    return success_response(_event_payload(event))


@router.delete("/{event_id}")
def delete_event(event_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin)):
    event = db.get(Event, event_id)
    if event is None:
        raise AppException(status_code=404, message="Event not found.", code="NOT_FOUND")

    db.delete(event)
    db.commit()
    return success_response({"id": event_id})
