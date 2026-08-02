# Backend API Reference

Status: historical snapshot - superseded by `docs/phase2/API_CONTRACT.md`
Last reviewed: 2026-07-27
Base URL: `/api`

> Do not use this April snapshot for launch implementation or smoke tests. Its guest-content, development auth-code, optional-auth, and public `/uploads` examples are intentionally retained only as history and are no longer valid. The current app is member-only, all errors use the normalized envelope, mutual-aid objects are owner/admin scoped, and media uses authorized short-lived signed URLs. Regenerate this reference from the current OpenAPI schema after the Phase 5 contract freeze.

## Response Envelope

Success:

```json
{
  "status": "success",
  "data": {}
}
```

Error:

```json
{
  "status": "error",
  "message": "Message",
  "code": "ERROR_CODE"
}
```

Authenticated endpoints require:

```http
Authorization: Bearer <access_token>
```

## Health

### GET `/health`

Auth: guest
Returns service health.

Response:

```json
{
  "status": "success",
  "data": {
    "ok": true
  }
}
```

## Auth

### POST `/auth/login`

Auth: guest

Request:

```json
{
  "email": "test@sogang.ac.kr",
  "password": "password123"
}
```

Response data:

```json
{
  "access_token": "jwt",
  "refresh_token": "opaque",
  "token_type": "bearer",
  "expires_in": 900,
  "user": {
    "id": 1,
    "email": "test@sogang.ac.kr",
    "nickname": "72gi_KimJinsan",
    "cohort": "72",
    "role": "admin"
  }
}
```

### POST `/auth/register/request-verification`

Auth: guest

Request:

```json
{
  "email": "student@sogang.ac.kr"
}
```

Response data:

```json
{
  "email": "student@sogang.ac.kr",
  "expires_in": 600,
  "dev_code": "123456",
  "email_sent": false
}
```

### POST `/auth/register/verify-email`

Auth: guest

Request:

```json
{
  "email": "student@sogang.ac.kr",
  "code": "123456"
}
```

Response data:

```json
{
  "verification_token": "token",
  "expires_in": 600
}
```

### POST `/auth/register`

Auth: guest

Request:

```json
{
  "verification_token": "token",
  "password": "strong-password",
  "nickname": "Kim",
  "cohort": "72",
  "major": "AI-SW",
  "phone": "010-0000-0000"
}
```

Response data: same shape as login session.

### POST `/auth/refresh`

Auth: guest

Request:

```json
{
  "refresh_token": "opaque"
}
```

Response data:

```json
{
  "access_token": "jwt",
  "refresh_token": "opaque",
  "token_type": "bearer",
  "expires_in": 900
}
```

### POST `/auth/logout`

Auth: guest

Request:

```json
{
  "refresh_token": "opaque"
}
```

Response data:

```json
{
  "logged_out": true
}
```

### POST `/auth/password-reset/request`

Auth: guest

Request:

```json
{
  "email": "student@sogang.ac.kr"
}
```

Response data:

```json
{
  "accepted": true,
  "dev_token": "reset-token",
  "email_sent": false
}
```

### POST `/auth/password-reset/confirm`

Auth: guest

Request:

```json
{
  "token": "reset-token",
  "new_password": "new-password"
}
```

Response data:

```json
{
  "changed": true
}
```

## Users

### GET `/users/me`

Auth: user

Response data:

```json
{
  "id": 1,
  "nickname": "Kim",
  "cohort": "72",
  "major": "AI-SW",
  "phone": "010-0000-0000",
  "company": "Company",
  "job_title": "Engineer",
  "position": "Lead",
  "email": "student@sogang.ac.kr",
  "role": "user"
}
```

### PUT `/users/me`

Auth: user

Request fields are optional:

```json
{
  "nickname": "Kim",
  "cohort": "72",
  "major": "AI-SW",
  "phone": "010-0000-0000",
  "company": "Company",
  "job_title": "Engineer",
  "position": "Lead",
  "profile_image_url": "https://example.com/profile.png"
}
```

Response data:

```json
{
  "id": 1
}
```

### PUT `/users/me/password`

Auth: user

Request:

```json
{
  "current_password": "old-password",
  "new_password": "new-password"
}
```

Response data:

```json
{
  "changed": true
}
```

### DELETE `/users/me`

Auth: user

Request:

```json
{
  "reason": "optional"
}
```

Response data:

```json
{
  "deactivated": true
}
```

## Boards

### GET `/boards`

Auth: guest

Response data:

```json
[
  {
    "category": "resources",
    "boards": [
      {
        "id": 4,
        "name": "Lecture Reviews",
        "slug": "lecture-reviews",
        "category": "resources",
        "board_type": "resource",
        "description": "Lecture reviews and course experience sharing",
        "sort_order": 20,
        "allow_anonymous": true,
        "read_permission": "guest",
        "write_permission": "user"
      }
    ]
  }
]
```

### GET `/boards/{board_id}`

Auth: guest
Response data: single board object.

## Posts

### GET `/boards/{board_id}/posts`

Auth: guest

Query:

- `page`: default `1`
- `size`: default `20`, max `100`
- `q`: optional keyword
- `category`: optional
- `status`: optional
- `sort`: `latest`, `popular`, `views`

Response data item:

```json
{
  "id": 10,
  "board_id": 4,
  "title": "Post title",
  "content_preview": "Preview",
  "author_id": 1,
  "author_nickname": "Kim",
  "is_anonymous": false,
  "is_pinned": false,
  "is_notice": false,
  "status": "published",
  "category": "review",
  "view_count": 12,
  "like_count": 3,
  "comment_count": 2,
  "created_at": "2026-04-26T00:00:00",
  "highlights": null
}
```

### GET `/posts/{post_id}`

Auth: optional

Response data:

```json
{
  "id": 10,
  "board_id": 4,
  "title": "Post title",
  "content": "Full content",
  "author_id": 1,
  "author_nickname": "Kim",
  "is_anonymous": false,
  "is_pinned": false,
  "is_notice": false,
  "status": "published",
  "category": "review",
  "metadata": {},
  "suggestion": null,
  "attachments": [],
  "view_count": 13,
  "like_count": 3,
  "comment_count": 2,
  "is_liked": false,
  "is_bookmarked": false,
  "created_at": "2026-04-26T00:00:00",
  "updated_at": "2026-04-26T00:00:00"
}
```

### POST `/boards/{board_id}/posts`

Auth: user

Request:

```json
{
  "title": "Post title",
  "content": "Full content",
  "is_anonymous": false,
  "category": "review",
  "metadata": {},
  "attachment_ids": [1, 2]
}
```

Response data:

```json
{
  "id": 10
}
```

### PUT `/posts/{post_id}`

Auth: author or admin
Request: same as create, with optional `attachment_ids`.

Response data:

```json
{
  "id": 10
}
```

### DELETE `/posts/{post_id}`

Auth: author or admin

Response data:

```json
{
  "id": 10
}
```

### PUT `/posts/{post_id}/pin`

Auth: admin

Request:

```json
{
  "is_pinned": true
}
```

Response data:

```json
{
  "post_id": 10,
  "is_pinned": true
}
```

### POST `/posts/{post_id}/like`

Auth: user
Toggles like/unlike.

Response data:

```json
{
  "post_id": 10,
  "is_liked": true,
  "like_count": 4
}
```

### POST `/posts/{post_id}/bookmark`

Auth: user
Toggles bookmark/unbookmark.

Response data:

```json
{
  "post_id": 10,
  "is_bookmarked": true
}
```

### PUT `/posts/{post_id}/suggestion`

Auth: admin
Only valid for suggestion-board posts.

Request:

```json
{
  "status": "answered",
  "admin_reply": "Official student council reply."
}
```

Response data:

```json
{
  "post_id": 10,
  "status": "answered",
  "suggestion": {
    "category": "app",
    "status": "answered",
    "admin_reply": "Official student council reply.",
    "replied_by": 1,
    "replied_at": "2026-04-26T00:00:00"
  }
}
```

## Comments

### GET `/posts/{post_id}/comments`

Auth: guest

Response data item:

```json
{
  "id": 1,
  "post_id": 10,
  "author_id": 2,
  "author_nickname": "Kim",
  "author_cohort": "72",
  "parent_id": null,
  "content": "Comment",
  "created_at": "2026-04-26T00:00:00",
  "updated_at": "2026-04-26T00:00:00",
  "children": []
}
```

### POST `/posts/{post_id}/comments`

Auth: user

Request:

```json
{
  "content": "Comment",
  "parent_id": null
}
```

Response data:

```json
{
  "id": 1
}
```

### PUT `/comments/{comment_id}`

Auth: author or admin

Request:

```json
{
  "content": "Updated comment"
}
```

Response data:

```json
{
  "id": 1
}
```

### DELETE `/comments/{comment_id}`

Auth: author or admin

Response data:

```json
{
  "id": 1
}
```

## Media

### POST `/media/uploads`

Auth: user
Content-Type: `multipart/form-data`

Form field:

- `file`

Response data:

```json
{
  "id": 1,
  "original_filename": "file.pdf",
  "stored_filename": "uuid.pdf",
  "content_type": "application/pdf",
  "file_size": 12345,
  "url": "/uploads/uuid.pdf",
  "status": "ready",
  "created_at": "2026-04-26T00:00:00"
}
```

### GET `/media/{media_id}`

Auth: user
Returns media metadata.

## Reports

### POST `/posts/{post_id}/report`

Auth: user

Request:

```json
{
  "reason": "spam",
  "detail": "Optional detail"
}
```

Response data:

```json
{
  "id": 1,
  "status": "submitted",
  "duplicate": false
}
```

### POST `/comments/{comment_id}/report`

Auth: user
Request and response are same as post report.

## Notifications

### GET `/notifications`

Auth: user

Response data item:

```json
{
  "id": 1,
  "notification_type": "comment",
  "message": "Kim commented on your post.",
  "post_id": 10,
  "event_id": null,
  "is_read": false,
  "created_at": "2026-04-26T00:00:00"
}
```

### PUT `/notifications/{notification_id}/read`

Auth: user

Response data:

```json
{
  "id": 1,
  "is_read": true
}
```

### GET `/notifications/settings/me`

Auth: user

Response data:

```json
{
  "notify_comment": true,
  "notify_like": true,
  "notify_notice": true,
  "notify_event": true
}
```

### PUT `/notifications/settings/me`

Auth: user

Request:

```json
{
  "notify_comment": true,
  "notify_like": true,
  "notify_notice": true,
  "notify_event": true
}
```

Response data: same as request.

### POST `/notifications/push-token`

Auth: user

Request:

```json
{
  "token": "ExponentPushToken[...]",
  "platform": "ios"
}
```

Response data:

```json
{
  "id": 1,
  "registered": true
}
```

### DELETE `/notifications/push-token`

Auth: user

Request:

```json
{
  "token": "ExponentPushToken[...]",
  "platform": "ios"
}
```

Response data:

```json
{
  "registered": false
}
```

## Search

### GET `/search`

Auth: optional

Query:

- `q`: required keyword
- `scope`: optional
- `board_id`: optional
- `page`: default `1`
- `size`: default `20`

Response data item:

```json
{
  "type": "post",
  "id": 10,
  "board_id": 4,
  "board_name": "Lecture Reviews",
  "title": "Title",
  "content_preview": "Preview",
  "author_nickname": "Kim",
  "author_cohort": "72",
  "created_at": "2026-04-26T00:00:00",
  "highlights": {
    "title": "Title",
    "content_preview": "Preview"
  }
}
```

### GET `/search/recent`

Auth: user

Response data item:

```json
{
  "keyword": "machine learning",
  "searched_at": "2026-04-26T00:00:00"
}
```

## Events

### GET `/events`

Auth: guest

Query:

- `from_date`: optional
- `to_date`: optional
- `category`: optional

### POST `/events`

Auth: admin

Request:

```json
{
  "title": "Orientation",
  "description": "Welcome event",
  "location": "Sogang",
  "category": "academic",
  "color": "#2563eb",
  "start_at": "2026-04-26T10:00:00",
  "end_at": "2026-04-26T12:00:00"
}
```

### PUT `/events/{event_id}`

Auth: admin
Request: same as create.

### DELETE `/events/{event_id}`

Auth: admin

## FAQ

### GET `/faqs`

Auth: guest

Query:

- `category`: optional
- `include_inactive`: optional, admin use

### POST `/faqs`

Auth: admin

Request:

```json
{
  "question": "Question",
  "answer": "Answer",
  "category": "general",
  "sort_order": 0,
  "is_active": true
}
```

### PUT `/faqs/{faq_id}`

Auth: admin
Request: same as create.

### DELETE `/faqs/{faq_id}`

Auth: admin
