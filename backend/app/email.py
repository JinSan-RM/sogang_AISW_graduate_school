from datetime import datetime, timezone
from email.message import EmailMessage
from email.utils import format_datetime, formataddr, make_msgid
import logging
import smtplib
import ssl

from email_validator import EmailNotValidError, validate_email

from app.config import settings

logger = logging.getLogger(__name__)


def _single_line(value: str, setting_name: str) -> str:
    normalized = value.strip()
    if not normalized or "\r" in normalized or "\n" in normalized:
        raise RuntimeError(f"{setting_name} must be a non-empty single-line value.")
    return normalized


def _mailbox(value: str, setting_name: str) -> tuple[str, str]:
    normalized = _single_line(value, setting_name)
    try:
        result = validate_email(normalized, check_deliverability=False)
    except EmailNotValidError as exc:
        raise RuntimeError(f"{setting_name} must be a valid email address.") from exc
    return result.normalized, result.ascii_domain


def is_email_configured() -> bool:
    return bool(settings.smtp_host and settings.smtp_from_email)


def _connect_smtp() -> smtplib.SMTP:
    if not settings.smtp_host:
        raise RuntimeError("SMTP_HOST is not configured.")

    tls_context = ssl.create_default_context()
    if settings.resolved_smtp_security == "ssl":
        smtp: smtplib.SMTP = smtplib.SMTP_SSL(
            settings.smtp_host,
            settings.smtp_port,
            timeout=settings.smtp_timeout_seconds,
            context=tls_context,
        )
    else:
        smtp = smtplib.SMTP(
            settings.smtp_host,
            settings.smtp_port,
            timeout=settings.smtp_timeout_seconds,
        )

    try:
        smtp.ehlo()
        if settings.resolved_smtp_security == "starttls":
            smtp.starttls(context=tls_context)
            smtp.ehlo()
        smtp_username = (settings.smtp_username or "").strip()
        smtp_password = settings.smtp_password or ""
        if settings.smtp_auth == "password":
            if not smtp_username or not smtp_password.strip():
                raise RuntimeError(
                    "SMTP_AUTH=password requires non-empty SMTP_USERNAME and SMTP_PASSWORD."
                )
            smtp.login(smtp_username, smtp_password)
        elif smtp_username or smtp_password:
            raise RuntimeError(
                "SMTP_AUTH=none requires SMTP_USERNAME and SMTP_PASSWORD to be empty."
            )
        return smtp
    except Exception:
        smtp.close()
        raise


def check_email_connection() -> bool:
    """Check DNS/TCP/TLS/auth using the same transport as real delivery."""

    if not is_email_configured():
        raise RuntimeError("SMTP_HOST or SMTP_FROM_EMAIL is not configured.")
    with _connect_smtp() as smtp:
        status, response = smtp.noop()
        if status >= 400:
            raise smtplib.SMTPResponseException(status, response)
    return True


def send_email(to_email: str, subject: str, body: str, html_body: str | None = None) -> bool:
    if not is_email_configured():
        if settings.smtp_required:
            raise RuntimeError("SMTP_REQUIRED is true, but SMTP_HOST or SMTP_FROM_EMAIL is not configured.")
        return False

    from_email, message_id_domain = _mailbox(settings.smtp_from_email, "SMTP_FROM_EMAIL")
    recipient_email, _ = _mailbox(to_email, "recipient email")
    reply_to, _ = _mailbox(settings.smtp_reply_to or from_email, "SMTP_REPLY_TO")
    from_name = _single_line(settings.smtp_from_name, "SMTP_FROM_NAME")

    message = EmailMessage()
    message["From"] = formataddr((from_name, from_email), charset="utf-8")
    message["To"] = recipient_email
    message["Reply-To"] = reply_to
    message["Date"] = format_datetime(datetime.now(timezone.utc), usegmt=True)
    message["Message-ID"] = make_msgid(domain=message_id_domain)
    message["Auto-Submitted"] = "auto-generated"
    message["Subject"] = _single_line(subject, "email subject")
    message.set_content(body)
    if html_body:
        message.add_alternative(html_body, subtype="html")

    try:
        with _connect_smtp() as smtp:
            smtp.send_message(
                message,
                from_addr=from_email,
                to_addrs=[recipient_email],
            )
        return True
    except (OSError, smtplib.SMTPException):
        logger.exception("SMTP delivery failed")
        if settings.smtp_required:
            raise
        return False
