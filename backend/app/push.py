import json
from urllib import request

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.models.notification import PushToken


EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


def send_push_to_user(db: Session, user_id: int, title: str, body: str, data: dict | None = None) -> None:
    if not settings.expo_push_enabled:
        return

    tokens = db.scalars(
        select(PushToken.token).where(PushToken.user_id == user_id, PushToken.is_active.is_(True))
    ).all()
    if not tokens:
        return

    messages = [
        {
            "to": token,
            "sound": "default",
            "title": title,
            "body": body,
            "data": data or {},
        }
        for token in tokens
        if token.startswith("ExponentPushToken[") or token.startswith("ExpoPushToken[")
    ]
    if not messages:
        return

    payload = json.dumps(messages).encode("utf-8")
    req = request.Request(
        EXPO_PUSH_URL,
        data=payload,
        headers={
            "Accept": "application/json",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        request.urlopen(req, timeout=5).read()
    except Exception:
        # Push delivery must never block the core community action.
        return
