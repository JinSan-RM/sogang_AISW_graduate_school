# Sogang AI-SW Community App (Phase 1)

## Stack
- FE: React Native (Expo Router, Zustand, React Query, React Hook Form + Zod)
- BE: FastAPI + SQLAlchemy 2.0 + Alembic
- DB: PostgreSQL 16

## Structure
- `backend/`: FastAPI server, SQLAlchemy models, Alembic migration
- `frontend/`: Expo app with tabs + board/post/comment screens
- `docker-compose.yml`: local PostgreSQL + backend

## Quick Start
1) Start backend + DB
```bash
docker compose up -d --build
```

2) Run migration (optional if using app startup create_all)
```bash
cd backend
alembic upgrade head
```

3) Start frontend
```bash
cd frontend
npm install
npm run start
```

## Phase 2 Planning Docs

- `PLAN.md`: Phase 2 product and architecture plan
- `AGENTS.md`: agent/coding rules
- `CODEX.md`: implementation backlog
- `docs/phase2/`: API, DB, auth, frontend route, and implementation contracts
- `docs/phase2/RUNTIME_SMOKE_TEST.md`: manual runtime smoke test checklist

## Migration Notes

Phase 2 adds columns and new tables. For an existing database, run Alembic migrations before starting the backend:

```bash
cd backend
alembic upgrade head
```

`Base.metadata.create_all()` can create missing tables for a fresh local database, but it does not alter existing tables.

## Development Auth

The local seed admin account is:

- Email: `test@sogang.ac.kr`
- Password: `password123`

`DEV_AUTH_CODES=true` returns development verification/reset codes in auth API responses until a real email provider is connected.

## Backend API (Phase 1)
- `GET /api/boards`
- `GET /api/boards/{board_id}`
- `GET /api/boards/{board_id}/posts`
- `GET /api/posts/{post_id}`
- `POST /api/boards/{board_id}/posts`
- `PUT /api/posts/{post_id}`
- `DELETE /api/posts/{post_id}`
- `POST /api/posts/{post_id}/like`
- `POST /api/posts/{post_id}/bookmark`
- `GET /api/posts/{post_id}/comments`
- `POST /api/posts/{post_id}/comments`
- `PUT /api/comments/{comment_id}`
- `DELETE /api/comments/{comment_id}`
- `GET /api/users/me`
- `PUT /api/users/me`

## Backend API (Phase 2 foundation)

Auth:
- `POST /api/auth/login`
- `POST /api/auth/register/request-verification`
- `POST /api/auth/register/verify-email`
- `POST /api/auth/register`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `POST /api/auth/password-reset/request`
- `POST /api/auth/password-reset/confirm`

Users:
- `PUT /api/users/me/password`
- `DELETE /api/users/me`

Posts:
- `PUT /api/posts/{post_id}/pin`
- `GET /api/boards/{board_id}/posts?q=&category=&status=&sort=`

Search:
- `GET /api/search?q=`
- `GET /api/search/recent`

Events:
- `GET /api/events`
- `POST /api/events`
- `PUT /api/events/{event_id}`
- `DELETE /api/events/{event_id}`

FAQ:
- `GET /api/faqs`
- `POST /api/faqs`
- `PUT /api/faqs/{faq_id}`
- `DELETE /api/faqs/{faq_id}`

Notifications:
- `GET /api/notifications`
- `PUT /api/notifications/{notification_id}/read`
- `GET /api/notifications/settings/me`
- `PUT /api/notifications/settings/me`

## Notes
- Auth is implemented in the Phase 2 foundation. Protected APIs require a Bearer access token.
- Seed user and boards are inserted on app startup.
- API success/error payloads are normalized to `{status, data}` and `{status, message, code}`.
