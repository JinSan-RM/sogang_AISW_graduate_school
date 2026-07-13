from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.deps import get_current_user, get_db, require_admin
from app.errors import AppException
from app.models.faq import FAQ
from app.models.user import User
from app.response import success_response
from app.schemas.faq import FAQCreate, FAQUpdate
from app.audit import log_admin_action

router = APIRouter()


def _faq_payload(faq: FAQ) -> dict:
    return {
        "id": faq.id,
        "question": faq.question,
        "answer": faq.answer,
        "category": faq.category,
        "sort_order": faq.sort_order,
        "is_active": faq.is_active,
        "created_at": faq.created_at,
        "updated_at": faq.updated_at,
    }


@router.get("")
def get_faqs(
    category: str | None = None,
    include_inactive: bool = Query(False),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    filters = []
    if category:
        filters.append(FAQ.category == category)
    if not include_inactive:
        filters.append(FAQ.is_active.is_(True))

    faqs = db.scalars(select(FAQ).where(*filters).order_by(FAQ.sort_order.asc(), FAQ.id.asc())).all()
    return success_response([_faq_payload(faq) for faq in faqs])


@router.post("")
def create_faq(payload: FAQCreate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    faq = FAQ(**payload.model_dump())
    db.add(faq)
    db.flush()
    log_admin_action(db, actor_id=admin.id, action="faq.create", target_type="faq", target_id=faq.id)
    db.commit()
    db.refresh(faq)
    return success_response(_faq_payload(faq))


@router.put("/{faq_id}")
def update_faq(faq_id: int, payload: FAQUpdate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    faq = db.get(FAQ, faq_id)
    if faq is None:
        raise AppException(status_code=404, message="FAQ not found.", code="NOT_FOUND")

    for key, value in payload.model_dump().items():
        setattr(faq, key, value)
    log_admin_action(db, actor_id=admin.id, action="faq.update", target_type="faq", target_id=faq.id)
    db.commit()
    db.refresh(faq)
    return success_response(_faq_payload(faq))


@router.delete("/{faq_id}")
def delete_faq(faq_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    faq = db.get(FAQ, faq_id)
    if faq is None:
        raise AppException(status_code=404, message="FAQ not found.", code="NOT_FOUND")

    faq.is_active = False
    log_admin_action(db, actor_id=admin.id, action="faq.deactivate", target_type="faq", target_id=faq.id)
    db.commit()
    return success_response({"id": faq_id})
