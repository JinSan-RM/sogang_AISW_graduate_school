from fastapi.responses import JSONResponse

from app.response import error_response


class AppException(Exception):
    def __init__(self, status_code: int, message: str, code: str):
        self.status_code = status_code
        self.message = message
        self.code = code


def app_exception_handler(_, exc: AppException) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content=error_response(exc.message, exc.code))
