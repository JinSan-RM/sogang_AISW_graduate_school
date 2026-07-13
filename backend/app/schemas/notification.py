from pydantic import BaseModel


class NotificationSettingUpdate(BaseModel):
    notify_comment: bool = True
    notify_like: bool = True
    notify_notice: bool = True
    notify_event: bool = True
    notify_council: bool = True


class PushTokenRegister(BaseModel):
    token: str
    platform: str
