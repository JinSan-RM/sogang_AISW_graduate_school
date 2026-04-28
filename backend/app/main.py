from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import SessionLocal
from app.errors import AppException, app_exception_handler
from app import models  # noqa: F401
from app.routers import auth, users, boards, posts, comments, events, faqs, media, notifications, reports, search
from app.seed import seed_initial_data

API_DESCRIPTION = """
Sogang AI-SW Graduate Community backend.

This API covers authentication, profile management, board posts, comments,
attachments, reports, notifications, Expo push tokens, search, events, FAQ,
and student council suggestion replies.
"""

OPENAPI_TAGS = [
    {"name": "auth", "description": "Login, registration verification, refresh, logout, and password reset."},
    {"name": "users", "description": "My profile, password change, and account deactivation."},
    {"name": "boards", "description": "Board groups and board metadata."},
    {"name": "posts", "description": "Board posts, detail, pinning, likes, bookmarks, and suggestion replies."},
    {"name": "comments", "description": "Comments, replies, edit, and delete."},
    {"name": "media", "description": "File upload and media metadata."},
    {"name": "reports", "description": "Post/comment reporting and admin notification creation."},
    {"name": "notifications", "description": "Notification list, read state, preferences, and push tokens."},
    {"name": "search", "description": "Post search and recent search keywords."},
    {"name": "events", "description": "Academic and student council schedule events."},
    {"name": "faqs", "description": "FAQ list and admin FAQ management."},
]


@asynccontextmanager
async def lifespan(_: FastAPI):
    db = SessionLocal()
    try:
        seed_initial_data(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description=API_DESCRIPTION,
    openapi_tags=OPENAPI_TAGS,
    lifespan=lifespan,
)
app.add_exception_handler(AppException, app_exception_handler)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(boards.router, prefix="/api/boards", tags=["boards"])
app.include_router(posts.router, prefix="/api", tags=["posts"])
app.include_router(comments.router, prefix="/api", tags=["comments"])
app.include_router(search.router, prefix="/api/search", tags=["search"])
app.include_router(events.router, prefix="/api/events", tags=["events"])
app.include_router(faqs.router, prefix="/api/faqs", tags=["faqs"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["notifications"])
app.include_router(media.router, prefix="/api/media", tags=["media"])
app.include_router(reports.router, prefix="/api", tags=["reports"])
app.mount("/uploads", StaticFiles(directory="uploads", check_dir=False), name="uploads")


@app.get("/health")
def health_check():
    return {"status": "success", "data": {"ok": True}}


@app.get("/api-docs", include_in_schema=False)
def api_docs_landing() -> HTMLResponse:
    return HTMLResponse(
        """
        <!doctype html>
        <html lang="en">
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>Sogang AI-SW API Docs</title>
            <style>
              body {
                margin: 0;
                background: #f4f7fb;
                color: #111827;
                font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
              }
              main {
                max-width: 920px;
                margin: 0 auto;
                padding: 48px 20px;
              }
              h1 {
                color: #112d4e;
                font-size: 36px;
                margin: 0 0 10px;
              }
              p {
                color: #475569;
                line-height: 1.6;
              }
              .grid {
                display: grid;
                gap: 14px;
                grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                margin-top: 28px;
              }
              a {
                display: block;
                border: 1px solid #dbe3ef;
                border-radius: 8px;
                background: #fff;
                padding: 18px;
                color: #112d4e;
                text-decoration: none;
                font-weight: 800;
                box-shadow: 0 10px 24px rgba(17, 45, 78, 0.06);
              }
              a span {
                display: block;
                color: #64748b;
                font-size: 13px;
                font-weight: 600;
                margin-top: 8px;
              }
              code {
                background: #e8eef7;
                border-radius: 6px;
                padding: 2px 6px;
              }
            </style>
          </head>
          <body>
            <main>
              <h1>Sogang AI-SW API Docs</h1>
              <p>
                Backend documentation hub for the community app. Use Swagger for interactive testing,
                ReDoc for a clean reference view, and OpenAPI JSON for tooling.
              </p>
              <p>Local base URL: <code>http://localhost:8000/api</code></p>
              <section class="grid">
                <a href="/docs">Swagger UI<span>Interactive API tester</span></a>
                <a href="/redoc">ReDoc<span>Readable API reference</span></a>
                <a href="/openapi.json">OpenAPI JSON<span>Machine-readable schema</span></a>
                <a href="/health">Health Check<span>Runtime status endpoint</span></a>
              </section>
            </main>
          </body>
        </html>
        """
    )

