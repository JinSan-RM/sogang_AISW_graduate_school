from __future__ import annotations

from html import escape


BRAND_NAME = "AI·SW CAMPUS"
DISPLAY_BRAND_NAME = "AI·SW CAMPUS"
FOOTER_ORGANIZATION = "AI·SW대학원 30대 원우회"


def _code_box(value: str, compact: bool = False) -> str:
    escaped = escape(value)
    letter_spacing = "8px" if compact else "0"
    font_size = "32px" if compact else "18px"
    return f"""
      <div style="padding:20px;border-radius:8px;background-color:#E6F1FB;text-align:center;">
        <div style="font-size:{font_size};font-weight:700;letter-spacing:{letter_spacing};color:#0C447C;line-height:1.3;word-break:break-all;">{escaped}</div>
      </div>
    """


def _footer_text(contact_email: str | None) -> str:
    if contact_email:
        return f"{FOOTER_ORGANIZATION} · 문의: {contact_email}"
    return FOOTER_ORGANIZATION


def _plain_email(
    title: str,
    intro: str,
    code: str,
    expiry_minutes: int,
    contact_email: str | None,
) -> str:
    return (
        f"{DISPLAY_BRAND_NAME}\n\n"
        f"{title}\n\n"
        f"{intro}\n\n"
        f"인증번호: {code}\n\n"
        f"인증번호는 {expiry_minutes}분간 유효해요.\n"
        "본인이 요청하지 않으셨다면 이 이메일을 무시해주세요.\n\n"
        f"{_footer_text(contact_email)}"
    )


def _html_email(
    title: str,
    intro: str,
    code: str,
    expiry_minutes: int,
    compact_code: bool,
    contact_email: str | None,
) -> str:
    escaped_title = escape(title)
    escaped_intro = escape(intro)
    escaped_footer = escape(_footer_text(contact_email))
    return f"""<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{escaped_title}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#F4F4F5;font-family:-apple-system,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#15171C;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#F4F4F5;padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background-color:#FFFFFF;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:32px 40px 0;">
                <div style="margin:0;font-size:16px;font-weight:700;color:#2761FF;">{DISPLAY_BRAND_NAME}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 40px 8px;">
                <div style="margin:0;font-size:20px;font-weight:600;line-height:1.4;color:#15171C;">{escaped_title}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 40px 24px;">
                <p style="margin:0;font-size:15px;line-height:1.6;color:#4B5160;">{escaped_intro}</p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:0 40px 24px;">
                {_code_box(code, compact=compact_code)}
              </td>
            </tr>
            <tr>
              <td style="padding:14px 40px;border-top:0.5px solid #E1E4E9;">
                <p style="margin:0;font-size:13px;line-height:1.6;color:#8A919C;">
                  인증번호는 <strong>{expiry_minutes}분</strong>간 유효해요.<br>
                  본인이 요청하지 않으셨다면 이 이메일을 무시해주세요.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 40px;border-top:0.5px solid #E1E4E9;">
                <div style="margin:0;font-size:12px;line-height:1.6;color:#8A919C;">
                  {escaped_footer}
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>"""


def verification_email(
    code: str,
    expiry_minutes: int,
    *,
    contact_email: str | None = None,
) -> tuple[str, str]:
    title = "인증번호 안내"
    intro = "안녕하세요. 아래 인증번호를 입력해주세요."
    return (
        _plain_email(title, intro, code, expiry_minutes, contact_email),
        _html_email(
            title,
            intro,
            code,
            expiry_minutes,
            compact_code=True,
            contact_email=contact_email,
        ),
    )


def password_reset_email(
    token: str,
    expiry_minutes: int,
    *,
    contact_email: str | None = None,
) -> tuple[str, str]:
    title = "비밀번호 재설정"
    intro = "안녕하세요. 비밀번호 재설정을 요청하셨어요. 아래 인증번호를 입력해주세요."
    return (
        _plain_email(title, intro, token, expiry_minutes, contact_email),
        _html_email(
            title,
            intro,
            token,
            expiry_minutes,
            compact_code=True,
            contact_email=contact_email,
        ),
    )


def account_deletion_email(
    code: str,
    expiry_minutes: int,
    *,
    contact_email: str | None = None,
) -> tuple[str, str]:
    title = "계정 삭제"
    intro = "안녕하세요. 계정 삭제를 요청하셨어요. 아래 인증번호를 입력해주세요."
    return (
        _plain_email(title, intro, code, expiry_minutes, contact_email),
        _html_email(
            title,
            intro,
            code,
            expiry_minutes,
            compact_code=True,
            contact_email=contact_email,
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
                <div style="font-size:13px;font-weight:800;color:#D5E0FE;">AI·SW CAMPUS</div>
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
