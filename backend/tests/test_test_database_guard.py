import pytest

import conftest


@pytest.mark.parametrize(
    ("database_name", "app_environment", "allow_reset"),
    [
        ("sogang_app", "test", "1"),
        ("contest", "test", "1"),
        ("sogang_app_test", "development", "1"),
        ("sogang_app_test", "test", "0"),
    ],
)
def test_external_test_database_reset_requires_all_safety_signals(
    monkeypatch: pytest.MonkeyPatch,
    database_name: str,
    app_environment: str,
    allow_reset: str,
) -> None:
    monkeypatch.setenv(
        "TEST_DATABASE_URL",
        f"postgresql+psycopg://postgres:postgres@localhost:5432/{database_name}",
    )
    monkeypatch.setenv("APP_ENVIRONMENT", app_environment)
    monkeypatch.setenv("ALLOW_TEST_DB_RESET", allow_reset)

    with pytest.raises(RuntimeError, match="Refusing to reset TEST_DATABASE_URL"):
        conftest._database_url()


@pytest.mark.parametrize("database_name", ["test", "test_backend", "sogang_app_test"])
def test_explicit_test_database_name_is_accepted_with_opt_in(
    monkeypatch: pytest.MonkeyPatch,
    database_name: str,
) -> None:
    expected = f"postgresql+psycopg://postgres:postgres@localhost:5432/{database_name}"
    monkeypatch.setenv("TEST_DATABASE_URL", expected)
    monkeypatch.setenv("APP_ENVIRONMENT", "test")
    monkeypatch.setenv("ALLOW_TEST_DB_RESET", "1")

    assert conftest._database_url() == expected
