from typing import Any


def success_response(data: Any, pagination: dict[str, Any] | None = None) -> dict[str, Any]:
    payload: dict[str, Any] = {"status": "success", "data": data}
    if pagination is not None:
        payload["pagination"] = pagination
    return payload


def error_response(message: str, code: str) -> dict[str, Any]:
    return {"status": "error", "message": message, "code": code}
