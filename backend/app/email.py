from email.message import EmailMessage
import logging
import smtplib

from app.config import settings

logger = logging.getLogger(__name__)


def is_email_configured() -> bool:
    return bool(settings.smtp_host and settings.smtp_from_email)


def send_email(to_email: str, subject: str, body: str, html_body: str | None = None) -> bool:
    if not is_email_configured():
        if settings.smtp_required:
            raise RuntimeError("SMTP_REQUIRED is true, but SMTP_HOST or SMTP_FROM_EMAIL is not configured.")
        return False

    message = EmailMessage()
    message["From"] = settings.smtp_from_email
    message["To"] = to_email
    message["Subject"] = subject
    message.set_content(body)
    if html_body:
        message.add_alternative(html_body, subtype="html")

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as smtp:
            if settings.smtp_use_tls:
                smtp.starttls()
            if settings.smtp_username and settings.smtp_password:
                smtp.login(settings.smtp_username, settings.smtp_password)
            smtp.send_message(message)
        return True
    except (OSError, smtplib.SMTPException):
        logger.exception("Failed to send email to %s", to_email)
        if settings.smtp_required:
            raise
        return False
