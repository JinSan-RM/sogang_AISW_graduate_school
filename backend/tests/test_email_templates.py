import pytest

from app.email_templates import (
    account_deletion_email,
    password_reset_email,
    verification_email,
)


@pytest.mark.parametrize(
    ("builder", "title", "intro"),
    [
        (
            verification_email,
            "인증번호 안내",
            "안녕하세요. 아래 인증번호를 입력해주세요.",
        ),
        (
            password_reset_email,
            "비밀번호 재설정",
            "안녕하세요. 비밀번호 재설정을 요청하셨어요. 아래 인증번호를 입력해주세요.",
        ),
        (
            account_deletion_email,
            "계정 삭제",
            "안녕하세요. 계정 삭제를 요청하셨어요. 아래 인증번호를 입력해주세요.",
        ),
    ],
)
def test_auth_code_email_uses_concise_copy_and_a_monitored_contact(
    builder,
    title: str,
    intro: str,
) -> None:
    plain_body, html_body = builder(
        "123456",
        5,
        contact_email="A72040@sogang.ac.kr",
    )

    for body in (plain_body, html_body):
        assert "AI·SW CAMPUS" in body
        assert title in body
        assert intro in body
        assert "123456" in body
        assert "본인이 요청하지 않으셨다면 이 이메일을 무시해주세요." in body
        assert "AI·SW대학원 원우회 · 문의: A72040@sogang.ac.kr" in body

    assert "인증번호는 5분간 유효해요." in plain_body
    assert "인증번호는 <strong>5분</strong>간 유효해요." in html_body
    assert ">확인 코드<" not in html_body


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


@pytest.mark.parametrize(
    "builder",
    [verification_email, password_reset_email, account_deletion_email],
)
def test_auth_code_email_uses_the_shared_simple_card_design(builder) -> None:
    _plain_body, html_body = builder("123456", 5)
    normalized_html = html_body.lower().replace(" ", "")

    assert "max-width:600px" in normalized_html
    assert "border-radius:12px" in normalized_html
    assert "background-color:#2761ff" not in normalized_html
    assert "color:#2761ff" in normalized_html
    assert "background-color:#e6f1fb" in normalized_html
    assert "color:#0c447c" in normalized_html
    assert "linear-gradient" not in normalized_html
