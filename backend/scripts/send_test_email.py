from pathlib import Path
import argparse
import sys

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.email import is_email_configured, send_email
from app.email_templates import smtp_test_email
from app.security import ensure_school_email


def main() -> None:
    parser = argparse.ArgumentParser(description="Send a test auth email using backend SMTP settings.")
    parser.add_argument("to_email", help="Recipient email. Must be a sogang.ac.kr address.")
    args = parser.parse_args()

    to_email = args.to_email.strip().lower()
    ensure_school_email(to_email)

    if not is_email_configured():
        raise SystemExit("SMTP is not configured. Fill backend/.env SMTP_* values first.")

    plain_body, html_body = smtp_test_email()
    sent = send_email(
        to_email,
        "[서강 AI-SW 커뮤니티] SMTP 테스트 메일",
        plain_body,
        html_body=html_body,
    )
    if not sent:
        raise SystemExit("SMTP send failed. Check SMTP_HOST/SMTP_USERNAME/SMTP_PASSWORD/SMTP_FROM_EMAIL.")

    print(f"Test email sent to {to_email}")


if __name__ == "__main__":
    main()
