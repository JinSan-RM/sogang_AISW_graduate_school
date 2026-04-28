from email.message import EmailMessage
import smtplib

from app.config import settings


def is_email_configured() -> bool:
    return bool(settings.smtp_host and settings.smtp_from_email)


def send_email(to_email: str, subject: str, body: str) -> None:
    if not is_email_configured():
        return

    message = EmailMessage()
    message["From"] = settings.smtp_from_email
    message["To"] = to_email
    message["Subject"] = subject
    message.set_content(body)

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as smtp:
        if settings.smtp_use_tls:
            smtp.starttls()
        if settings.smtp_username and settings.smtp_password:
            smtp.login(settings.smtp_username, settings.smtp_password)
        smtp.send_message(message)
