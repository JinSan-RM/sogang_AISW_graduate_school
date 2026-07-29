TEST_PASSWORD = "TestPassword1!"


def _login(api, email: str):
    response = api.client.post(
        "/api/auth/login",
        json={"email": email, "password": TEST_PASSWORD},
    )
    assert response.status_code == 200
    return response.json()["data"]


def _assert_unauthorized(response) -> None:
    assert response.status_code == 401
    assert response.json()["status"] == "error"
    assert response.json()["code"] == "UNAUTHORIZED"


def test_refresh_rotation_and_logout_revoke_tokens(api) -> None:
    login_data = _login(api, "owner@sogang.ac.kr")
    first_refresh = login_data["refresh_token"]

    rotate_response = api.client.post(
        "/api/auth/refresh",
        json={"refresh_token": first_refresh},
    )
    assert rotate_response.status_code == 200
    rotated_data = rotate_response.json()["data"]
    assert rotated_data["refresh_token"] != first_refresh

    _assert_unauthorized(
        api.client.post(
            "/api/auth/refresh",
            json={"refresh_token": first_refresh},
        )
    )

    logout_response = api.client.post(
        "/api/auth/logout",
        json={"refresh_token": rotated_data["refresh_token"]},
        headers={"Authorization": f"Bearer {rotated_data['access_token']}"},
    )
    assert logout_response.status_code == 200
    assert logout_response.json()["data"]["logged_out"] is True

    _assert_unauthorized(
        api.client.post(
            "/api/auth/refresh",
            json={"refresh_token": rotated_data["refresh_token"]},
        )
    )


def test_password_change_revokes_active_refresh_sessions(api) -> None:
    login_data = _login(api, "other@sogang.ac.kr")
    refresh_token = login_data["refresh_token"]

    password_response = api.client.put(
        "/api/users/me/password",
        json={
            "current_password": TEST_PASSWORD,
            "new_password": "ChangedPassword2!",
        },
        headers={"Authorization": f"Bearer {login_data['access_token']}"},
    )
    assert password_response.status_code == 200
    assert password_response.json()["data"]["sessions_revoked"] >= 1

    _assert_unauthorized(
        api.client.post(
            "/api/auth/refresh",
            json={"refresh_token": refresh_token},
        )
    )
