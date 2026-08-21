from __future__ import annotations

from html import escape


BRAND_NAME = "서강 AI-SW 대학원 커뮤니티"


def _contact_email() -> str:
    from app.config import settings

    return settings.support_email or settings.smtp_from_email or ""


def _code_box(value: str) -> str:
    escaped = escape(value)
    return f"""
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="background-color:#E6F1FB; border-radius:8px; padding:20px;" align="center">
                    <p style="margin:0; font-size:32px; font-weight:700; letter-spacing:8px; color:#0C447C;">{escaped}</p>
                  </td>
                </tr>
              </table>
    """


def _plain_email(
    title: str,
    intro: str,
    code: str,
    expiry_minutes: int,
    safe_outcome: str,
) -> str:
    return (
        f"{BRAND_NAME}\n\n"
        f"{title}\n\n"
        f"{intro}\n\n"
        f"확인 코드: {code}\n\n"
        f"확인 코드는 발급 후 {expiry_minutes}분간 유효합니다.\n\n"
        "직접 요청한 경우에만 앱에 입력해 주세요.\n"
        f"요청하지 않았다면 이 메일을 삭제해 주세요. {safe_outcome}"
    )


def _html_email(
    title: str,
    intro: str,
    code: str,
    expiry_minutes: int,
    compact_code: bool,
    safe_outcome: str,
) -> str:
    del compact_code  # 디자인 코드 박스는 단일 형태다.
    escaped_title = escape(title)
    escaped_intro = escape(intro)
    escaped_safe_outcome = escape(safe_outcome)
    escaped_contact = escape(_contact_email())
    return f"""<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{escaped_title}</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f4f5; font-family: -apple-system, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5; padding:40px 16px;">
  <tr>
    <td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background-color:#ffffff; border-radius:12px; overflow:hidden;">

        <tr>
          <td style="padding:32px 40px 0 40px;">
            <p style="margin:0; font-size:16px; font-weight:700; color:#2761FF;">AI·SW 캠퍼스</p>
          </td>
        </tr>

        <tr>
          <td style="padding:24px 40px 8px 40px;">
            <p style="margin:0; font-size:20px; font-weight:600; color:#15171C;">{escaped_title}</p>
          </td>
        </tr>

        <tr>
          <td style="padding:0 40px 24px 40px;">
            <p style="margin:0; font-size:15px; line-height:1.6; color:#4B5160;">{escaped_intro}<br>아래 인증번호를 입력해주세요.</p>
          </td>
        </tr>

        <tr>
          <td style="padding:0 40px 24px 40px;" align="center">{_code_box(code)}</td>
        </tr>

        <tr>
          <td style="padding:0 40px 32px 40px;">
            <p style="margin:0; font-size:13px; line-height:1.6; color:#8A919C;">
              인증번호는 {expiry_minutes}분간 유효해요.<br>
              직접 요청한 경우에만 앱에 입력해 주세요.<br>
              요청하지 않았다면 이 메일을 삭제해 주세요. {escaped_safe_outcome}
            </p>
          </td>
        </tr>

        <tr>
          <td style="padding:20px 40px; border-top:0.5px solid #E1E4E9;">
            <p style="margin:0; font-size:12px; color:#8A919C;">AI·SW대학원 원우회 · 문의: {escaped_contact}</p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>"""


def verification_email(code: str, expiry_minutes: int) -> tuple[str, str]:
    title = "이메일 주소 확인"
    intro = f"{BRAND_NAME} 회원가입 과정에서 요청하신 이메일 확인 코드입니다."
    safe_outcome = "확인 코드를 입력하지 않으면 계정은 생성되지 않습니다."
    return (
        _plain_email(title, intro, code, expiry_minutes, safe_outcome),
        _html_email(
            title,
            intro,
            code,
            expiry_minutes,
            compact_code=True,
            safe_outcome=safe_outcome,
        ),
    )


def password_reset_email(token: str, expiry_minutes: int) -> tuple[str, str]:
    title = "비밀번호 재설정 확인"
    intro = f"{BRAND_NAME} 비밀번호 재설정 과정에서 요청하신 확인 코드입니다."
    safe_outcome = "확인 코드를 입력하지 않으면 비밀번호는 변경되지 않습니다."
    return (
        _plain_email(title, intro, token, expiry_minutes, safe_outcome),
        _html_email(
            title,
            intro,
            token,
            expiry_minutes,
            compact_code=True,
            safe_outcome=safe_outcome,
        ),
    )


def account_deletion_email(code: str, expiry_minutes: int) -> tuple[str, str]:
    title = "계정 삭제 확인"
    intro = f"{BRAND_NAME} 계정 삭제 과정에서 요청하신 확인 코드입니다."
    safe_outcome = "확인 코드를 입력하지 않으면 계정은 삭제되지 않습니다."
    return (
        _plain_email(title, intro, code, expiry_minutes, safe_outcome),
        _html_email(
            title,
            intro,
            code,
            expiry_minutes,
            compact_code=True,
            safe_outcome=safe_outcome,
        ),
    )


def smtp_test_email() -> tuple[str, str]:
    title = "SMTP 테스트 메일"
    intro = "이 메일을 받았다면 회원가입 인증과 비밀번호 재설정 메일 발송 설정이 정상 동작합니다."
    return (
        f"{BRAND_NAME}\n\n{title}\n\n{intro}",
        f"""<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{title}</title>
  </head>
  <body style="margin:0;padding:0;background:#F4F6FB;font-family:Arial,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F4F6FB;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#FFFFFF;border:1px solid #E1E4E9;border-radius:18px;overflow:hidden;">
            <tr>
              <td style="background:linear-gradient(135deg,#07144A 0%,#1437AE 52%,#2761FF 100%);padding:28px;">
                <div style="font-size:13px;font-weight:800;color:#D5E0FE;">SOGANG AI-SW</div>
                <div style="font-size:24px;font-weight:900;color:#FFFFFF;margin-top:10px;">{title}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:30px 28px;">
                <p style="margin:0;font-size:16px;line-height:1.75;color:#111827;">{intro}</p>
                <div style="margin-top:24px;padding:16px;border-radius:12px;background:#EDF2FE;border:1px solid #D5E0FE;color:#0B1F56;font-size:15px;font-weight:800;">SMTP OK</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>""",
    )
