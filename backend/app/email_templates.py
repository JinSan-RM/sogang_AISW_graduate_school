from __future__ import annotations

from html import escape


BRAND_NAME = "서강 AI-SW 대학원 커뮤니티"


def _code_box(value: str, compact: bool = False) -> str:
    escaped = escape(value)
    letter_spacing = "8px" if compact else "0"
    font_size = "32px" if compact else "18px"
    return f"""
      <div style="margin:24px 0 20px;padding:18px 16px;border-radius:14px;background:#F3F6FF;border:1px solid #D5E0FE;text-align:center;">
        <div style="font-size:12px;font-weight:700;color:#6B7280;margin-bottom:8px;">확인 코드</div>
        <div style="font-size:{font_size};font-weight:900;letter-spacing:{letter_spacing};color:#0B1F56;line-height:1.3;word-break:break-all;">{escaped}</div>
      </div>
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
    escaped_title = escape(title)
    escaped_intro = escape(intro)
    escaped_safe_outcome = escape(safe_outcome)
    return f"""<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{escaped_title}</title>
  </head>
  <body style="margin:0;padding:0;background:#F4F6FB;font-family:Arial,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F4F6FB;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#FFFFFF;border:1px solid #E1E4E9;border-radius:18px;overflow:hidden;">
            <tr>
              <td style="background:linear-gradient(135deg,#07144A 0%,#1437AE 52%,#2761FF 100%);padding:28px 28px 26px;">
                <div style="font-size:13px;font-weight:800;letter-spacing:.02em;color:#D5E0FE;">SOGANG AI-SW</div>
                <div style="font-size:24px;font-weight:900;line-height:1.35;color:#FFFFFF;margin-top:10px;">{escaped_title}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:30px 28px 28px;">
                <p style="margin:0;font-size:16px;line-height:1.75;color:#111827;">{escaped_intro}</p>
                {_code_box(code, compact=compact_code)}
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-radius:12px;background:#F8FAFC;border:1px solid #E6EAF0;">
                  <tr>
                    <td style="padding:15px 16px;font-size:14px;line-height:1.6;color:#4B5563;">
                      <strong style="color:#0B1F56;">유효 시간</strong><br>
                      확인 코드는 발급 후 <strong>{expiry_minutes}분</strong>간 유효합니다.
                    </td>
                  </tr>
                </table>
                <p style="margin:20px 0 0;font-size:13px;line-height:1.7;color:#6B7280;">
                  직접 요청한 경우에만 앱에 입력해 주세요.<br>
                  요청하지 않았다면 이 메일을 삭제해 주세요. {escaped_safe_outcome}
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px;background:#F8FAFC;border-top:1px solid #E1E4E9;">
                <div style="font-size:12px;line-height:1.6;color:#8A919C;">
                  이 메일은 {BRAND_NAME} 계정 보안을 위해 발송되었습니다.
                </div>
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
