import json
import logging
from urllib import error, request

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.models.notification import PushDelivery, PushToken
from app.monitoring import send_operational_alert
from app.security import utc_now


EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"
EXPO_RECEIPTS_URL = "https://exp.host/--/api/v2/push/getReceipts"
logger = logging.getLogger(__name__)


def _post_json(url: str, payload: object) -> dict:
    req = request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Accept": "application/json", "Content-Type": "application/json"},
        method="POST",
    )
    with request.urlopen(req, timeout=5) as response:
        return json.loads(response.read().decode("utf-8"))


def _deactivate_invalid_token(token: PushToken, error_code: str | None) -> None:
    if error_code == "DeviceNotRegistered":
        token.is_active = False


def send_push_to_user(
    db: Session,
    user_id: int,
    title: str,
    body: str,
    data: dict | None = None,
    *,
    notification_id: int | None = None,
) -> None:
    if not settings.expo_push_enabled:
        return

    tokens = db.scalars(
        select(PushToken).where(PushToken.user_id == user_id, PushToken.is_active.is_(True))
    ).all()
    tokens = [
        token
        for token in tokens
        if token.token.startswith("ExponentPushToken[") or token.token.startswith("ExpoPushToken[")
    ]
    if not tokens:
        return

    deliveries = [
        PushDelivery(
            notification_id=notification_id,
            push_token_id=token.id,
            token_snapshot=token.token,
            status="pending",
        )
        for token in tokens
    ]
    db.add_all(deliveries)
    db.flush()
    messages = [
        {
            "to": token.token,
            "sound": "default",
            "title": title,
            "body": body,
            "data": data or {},
            **({"channelId": "default"} if token.platform == "android" else {}),
        }
        for token in tokens
    ]

    result = None
    last_error = None
    for _ in range(2):
        for delivery in deliveries:
            delivery.attempt_count += 1
            delivery.updated_at = utc_now()
        try:
            result = _post_json(EXPO_PUSH_URL, messages)
            break
        except (OSError, ValueError, error.URLError) as exc:
            last_error = str(exc)[:1000]
            logger.warning("Expo push send attempt failed for user %s: %s", user_id, exc)

    if result is None:
        for delivery in deliveries:
            delivery.status = "failed"
            delivery.error_message = last_error or "Unknown Expo push error"
        send_operational_alert(
            "push.send.failed",
            context={"delivery_count": len(deliveries)},
        )
        return

    tickets = result.get("data", []) if isinstance(result, dict) else []
    rejected = 0
    for index, delivery in enumerate(deliveries):
        ticket = tickets[index] if index < len(tickets) and isinstance(tickets[index], dict) else {}
        if ticket.get("status") == "ok":
            delivery.status = "sent"
            delivery.ticket_id = ticket.get("id")
            delivery.error_message = None
        else:
            rejected += 1
            details = ticket.get("details") if isinstance(ticket.get("details"), dict) else {}
            error_code = details.get("error")
            delivery.status = "failed"
            delivery.error_message = str(ticket.get("message") or error_code or "Expo rejected push")[:1000]
            _deactivate_invalid_token(tokens[index], error_code)
    if rejected:
        send_operational_alert(
            "push.ticket.rejected",
            context={"delivery_count": len(deliveries), "failed_count": rejected},
        )


def sync_push_receipts(db: Session, *, limit: int = 300) -> dict:
    deliveries = db.scalars(
        select(PushDelivery)
        .where(
            PushDelivery.status == "sent",
            PushDelivery.ticket_id.is_not(None),
            PushDelivery.receipt_checked_at.is_(None),
        )
        .order_by(PushDelivery.created_at.asc(), PushDelivery.id.asc())
        .limit(limit)
    ).all()
    if not deliveries:
        return {"checked": 0, "delivered": 0, "failed": 0}

    try:
        result = _post_json(EXPO_RECEIPTS_URL, {"ids": [item.ticket_id for item in deliveries]})
    except (OSError, ValueError, error.URLError) as exc:
        logger.warning("Expo receipt sync failed: %s", exc)
        send_operational_alert(
            "push.receipt_sync.failed",
            context={"delivery_count": len(deliveries)},
        )
        return {"checked": 0, "delivered": 0, "failed": 0, "error": "receipt_sync_failed"}

    receipts = result.get("data", {}) if isinstance(result, dict) else {}
    delivered = 0
    failed = 0
    token_by_id = {
        token.id: token
        for token in db.scalars(
            select(PushToken).where(PushToken.id.in_([item.push_token_id for item in deliveries if item.push_token_id]))
        ).all()
    }
    for delivery in deliveries:
        receipt = receipts.get(delivery.ticket_id) if isinstance(receipts, dict) else None
        if not isinstance(receipt, dict):
            continue
        delivery.receipt_checked_at = utc_now()
        delivery.updated_at = utc_now()
        if receipt.get("status") == "ok":
            delivery.status = "delivered"
            delivered += 1
        else:
            details = receipt.get("details") if isinstance(receipt.get("details"), dict) else {}
            error_code = details.get("error")
            delivery.status = "failed"
            delivery.error_message = str(receipt.get("message") or error_code or "Expo receipt error")[:1000]
            token = token_by_id.get(delivery.push_token_id)
            if token is not None:
                _deactivate_invalid_token(token, error_code)
            failed += 1
    db.commit()
    if failed:
        send_operational_alert(
            "push.receipt.failed",
            context={"checked_count": delivered + failed, "failed_count": failed},
        )
    return {"checked": delivered + failed, "delivered": delivered, "failed": failed}
