import pytest

from app.email_templates import (
    account_deletion_email,
    password_reset_email,
    verification_email,
)


@pytest.mark.parametrize(
    ("builder", "requested_context", "safe_outcome"),
    [
        (
            verification_email,
            "회원가입 과정에서 요청하신 이메일 확인 코드입니다.",
            "확인 코드를 입력하지 않으면 계정은 생성되지 않습니다.",
        ),
        (
            password_reset_email,
            "비밀번호 재설정 과정에서 요청하신 확인 코드입니다.",
            "확인 코드를 입력하지 않으면 비밀번호는 변경되지 않습니다.",
        ),
        (
            account_deletion_email,
            "계정 삭제 과정에서 요청하신 확인 코드입니다.",
            "확인 코드를 입력하지 않으면 계정은 삭제되지 않습니다.",
        ),
    ],
)
def test_auth_code_email_explains_the_requested_action_and_safe_outcome(
    builder,
    requested_context: str,
    safe_outcome: str,
) -> None:
    plain_body, html_body = builder("123456", 5)

    for body in (plain_body, html_body):
        assert requested_context in body
        assert "직접 요청한 경우에만 앱에 입력해 주세요." in body
        assert "요청하지 않았다면 이 메일을 삭제해 주세요." in body
        assert safe_outcome in body


@pytest.mark.parametrize(
    "builder",
    [verification_email, password_reset_email, account_deletion_email],
)
def test_auth_code_email_has_no_hidden_or_linked_content(builder) -> None:
    _plain_body, html_body = builder("123456", 5)
    normalized_html = html_body.lower().replace(" ", "")

    assert "display:none" not in normalized_html
    assert "opacity:0" not in normalized_html
    assert "color:transparent" not in normalized_html
    assert "max-height:0" not in normalized_html
    assert "<a" not in normalized_html
    assert "http://" not in normalized_html
    assert "https://" not in normalized_html
