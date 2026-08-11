def test_eligible_member_can_find_themselves_in_participant_search(api) -> None:
    response = api.client.get(
        "/api/users/search",
        params={"q": "Owner"},
        headers=api.headers["owner"],
    )

    assert response.status_code == 200
    assert response.json() == {
        "status": "success",
        "data": [
            {
                "id": 1,
                "nickname": "Owner",
                "cohort": None,
                "major": None,
            }
        ],
    }
