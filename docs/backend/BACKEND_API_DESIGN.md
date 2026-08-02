# Backend API Design

Status: historical design snapshot - current decisions live in `PLAN.md` and `docs/phase2/`
Last reviewed: 2026-07-27
Service: FastAPI backend for Sogang AI-SW Graduate Community

> The launch implementation has moved to member-only content, normalized framework errors, owner-scoped mutual-aid workflows, and authorized signed media delivery. Statements below about guest viewers, client-visible development codes, optional search auth, or a public `/uploads` mount are obsolete and must not be copied into new code.

## Purpose

This backend supports a graduate community app with authenticated posting, board-based content, comments and replies, likes, bookmarks, attachments, reports, notifications, push tokens, student council events, FAQ, and suggestion handling.

The current implementation prioritizes:

- Clear board abstraction for notices, resources, participation, community, and council features.
- Mobile-first API contracts for Expo React Native.
- Safe authenticated actions with owner/admin permission checks.
- Runtime-friendly local development with Docker, PostgreSQL, Alembic migrations, and seeded baseline boards.

## Runtime

- API server: FastAPI
- DB: PostgreSQL
- ORM: SQLAlchemy
- Migration: Alembic, executed on backend container startup through `python -m app.migrate`
- Local API base:
  - Web: `http://localhost:8000/api`
  - Physical phone on same Wi-Fi: `http://<PC_LAN_IP>:8000/api`
- API docs:
  - Swagger: `http://localhost:8000/docs`
  - OpenAPI JSON: `http://localhost:8000/openapi.json`

## Shared Contract

All normal success responses use:

```json
{
  "status": "success",
  "data": {}
}
```

Paginated responses add:

```json
{
  "pagination": {
    "page": 1,
    "size": 20,
    "total": 100,
    "total_pages": 5
  }
}
```

Application errors use:

```json
{
  "status": "error",
  "message": "Human readable message.",
  "code": "MACHINE_CODE"
}
```

## Authentication

Auth uses access and refresh tokens.

- Access token is sent through:

```http
Authorization: Bearer <access_token>
```

- Refresh token is sent to `/api/auth/refresh`.
- Logout invalidates a refresh token.
- Password reset and registration verification codes are delivered only by email and are never returned in API payloads.

## Permissions

Roles:

- `guest`: unauthenticated user limited to auth/recovery/registration options and legal/health documentation
- `user`: authenticated student/member
- `admin`: student council/admin operator

Board write permissions:

- `user`: any authenticated user can write.
- `admin`: only admin can write.

Content permissions:

- Post edit/delete: author or admin.
- Comment edit/delete: author or admin.
- Pin post: admin only.
- Event/FAQ mutation: admin only.
- Suggestion official reply/status: admin only.
- Mutual-aid read/search/comments/evidence: requester or admin; non-owner object reads use `404`.
- Report own content: blocked.

## Board Model

Boards are seeded by slug and grouped by category.

Important board types:

- `notice`: official notices, admin write.
- `resource`: lecture reviews, exam archive, comprehensive exam.
- `activity_certification`: club/study/networking activity proof.
- `activity_history`: student council activity history.
- `external_link`: external council/accounting link posts.
- `suggestion`: suggestion posts with official reply/status extension.
- `mutual_aid`: mutual aid notices.

## Content Flow

1. User opens board list.
2. User enters a board and loads paginated posts.
3. User creates or edits a post, optionally attaching uploaded media IDs.
4. Post detail increments view count.
5. User can like, unlike, bookmark, unbookmark, comment, reply, edit/delete own comments, and report content.

## Attachments

Upload flow:

1. Authenticated user uploads file through `POST /api/media/uploads`.
2. Backend stores file metadata and returns a `MediaAsset`.
3. Frontend passes `attachment_ids` when creating/updating a post.
4. Post detail returns attachments with URLs.

Current storage remains local for this phase, but neither upload directory is mounted publicly. An authenticated caller requests a short-lived access URL; post attachments inherit post read permission and private mutual-aid evidence remains requester/admin only.

## Notifications

Notification sources currently implemented:

- Comment on a user's post.
- Like on a user's post.
- Report submitted to admins.
- Student council reply to a suggestion.

Notification settings:

- `notify_comment`
- `notify_like`
- `notify_notice`
- `notify_event`

Push flow:

1. Mobile app registers Expo push token through `POST /api/notifications/push-token`.
2. Backend stores active token in `push_tokens`.
3. When a notification is created, backend attempts Expo Push API delivery.
4. Push delivery failure does not block the original action.

In-app notification banner is handled by the frontend polling `/api/notifications`.

## Suggestions

Suggestion posts use the base `posts` table plus `post_suggestions`.

Statuses:

- `received`
- `reviewing`
- `answered`
- `closed`

Admin can update status and official reply through:

```http
PUT /api/posts/{post_id}/suggestion
```

When a new official reply is saved, the post author receives a notification.

## Reports

Users can report posts or comments.

Report targets:

- `POST /api/posts/{post_id}/report`
- `POST /api/comments/{comment_id}/report`

Duplicate reports from the same user against the same target are treated idempotently and return `duplicate: true`.

Admins are notified when a report is created.

## Search

Search supports post title/content/author lookup.

- Query: `q`
- Optional scope and board filter
- Recent searches are stored per authenticated user. Global search excludes other members' mutual-aid requests.

## Operational Notes

Local Docker:

```bash
docker compose -p aisw_p0qa -f docker-compose.yml -f docker-compose.qa.yml up -d --build
```

Backend restart after code/migration changes:

```bash
docker compose -p aisw_p0qa -f docker-compose.yml -f docker-compose.qa.yml restart backend
```

Check migration version:

```bash
docker compose -p aisw_p0qa -f docker-compose.yml -f docker-compose.qa.yml exec -T db psql -U postgres -d sogang_app_qa -c "SELECT version_num FROM alembic_version;"
```

Recommended smoke checks:

- Login and refresh.
- Board list and board post list.
- Post create/edit/detail/delete.
- Comment/reply create/edit/delete.
- Like/unlike.
- Bookmark/unbookmark.
- Attachment upload and detail preview.
- Report submit and duplicate state.
- Notification list/settings.
- Suggestion admin reply.
- Push token registration on mobile.
