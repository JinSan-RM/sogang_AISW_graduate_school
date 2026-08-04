# Phase 2 API Contract

2026-07-05 override: `정책_정의서_260705.pdf` supersedes Phase 2 guest-read assumptions for launch. Auth endpoints remain guest-capable, but content APIs now require a Bearer access token: boards, posts, comments, search, media, events, FAQs, banners, notifications, settings, reports, and admin APIs.

Status: implemented baseline, checked against the current code on 2026-07-27
Applies to: FastAPI backend and Expo frontend

## 1. Shared Rules

### Base URL

- Local: `http://localhost:8000/api`
- All endpoints below are relative to `/api`.

### Response Envelope

Success:

```json
{
  "status": "success",
  "data": {}
}
```

Paginated success:

```json
{
  "status": "success",
  "data": [],
  "pagination": {
    "page": 1,
    "size": 20,
    "total": 120,
    "total_pages": 6
  }
}
```

Error:

```json
{
  "status": "error",
  "message": "Human-readable message.",
  "code": "MACHINE_READABLE_CODE"
}
```

### Common Error Codes

| HTTP | Code | Meaning |
| --- | --- | --- |
| 400 | `BAD_REQUEST` | Invalid input or invalid state transition |
| 401 | `UNAUTHORIZED` | Missing, expired, or invalid token |
| 403 | `FORBIDDEN` | Authenticated but not allowed |
| 404 | `NOT_FOUND` | Resource does not exist |
| 409 | `CONFLICT` | Duplicate email, duplicate like, invalid uniqueness |
| 422 | `VALIDATION_ERROR` | Schema validation failed |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Unexpected server failure |

### Auth Header

```http
Authorization: Bearer <access_token>
```

### Pagination

List endpoints use:

- `page`: integer, default `1`, min `1`
- `size`: integer, default `20`, min `1`, max `100`

### Date Format

- Datetime fields use ISO 8601 UTC strings.
- Date-only fields use `YYYY-MM-DD`.

## 2. Auth

### POST `/auth/login`

Auth: guest

Request:

```json
{
  "email": "user@sogang.ac.kr",
  "password": "password123"
}
```

Response:

```json
{
  "access_token": "jwt",
  "refresh_token": "opaque-token",
  "token_type": "bearer",
  "expires_in": 900,
  "user": {
    "id": 1,
    "email": "user@sogang.ac.kr",
    "nickname": "Jinsan",
    "cohort": "72",
    "role": "admin"
  }
}
```

Errors:

- `UNAUTHORIZED`: wrong email or password
- `FORBIDDEN`: inactive account

### POST `/auth/register/request-verification`

Auth: guest

Request:

```json
{
  "email": "user@sogang.ac.kr"
}
```

Response:

```json
{
  "email": "user@sogang.ac.kr",
  "expires_in": 300,
  "resend_in": 300,
  "email_sent": true
}
```

Rules:

- Only approved school domains are accepted.
- Initial allowed domain: `sogang.ac.kr`.
- Verification codes are delivered only by email and are never included in the API response.
- Verification codes expire after five minutes, and the same email cannot request another code during that five-minute cooldown.
- Rate limit by email and IP.

Errors:

- `VALIDATION_ERROR`: invalid domain
- `CONFLICT`: already registered email
- `VERIFICATION_RESEND_COOLDOWN`: a code was already issued less than five minutes ago
- `RATE_LIMITED`: too many requests

### POST `/auth/register/verify-email`

Auth: guest

Request:

```json
{
  "email": "user@sogang.ac.kr",
  "code": "123456"
}
```

Response:

```json
{
  "verification_token": "short-lived-token",
  "expires_in": 900
}
```

Errors:

- `VERIFICATION_CODE_INVALID`: invalid code
- `VERIFICATION_EXPIRED`: expired code
- `VERIFICATION_ATTEMPTS_EXCEEDED`: five failed attempts

### POST `/auth/register`

Auth: guest

Request:

```json
{
  "verification_token": "short-lived-token",
  "password": "Password123!",
  "nickname": "Jinsan",
  "cohort": "72",
  "major": "인공지능",
  "phone": "01012345678",
  "privacy_policy_version": "2026-07-12",
  "privacy_consent": true,
  "company": "WithWe",
  "job_title": "Developer",
  "position": "Lead"
}
```

Response: same as login response.

Rules:

- `password`: min 8 characters including a letter, number, and special character.
- `nickname`: required, max 50, normalized for surrounding/repeated whitespace. Duplicate real names are allowed.
- `cohort`: required, one to three numeric characters.
- `major`: required and must match a currently active administrator-managed major option.
- `phone`: required, Korean mobile number without separators.
- `privacy_policy_version`: required and must match the current active policy version.
- `privacy_consent`: must be `true`; the server records the accepted version and consent timestamp.
- `company`, `job_title`, `position`: optional profile fields collected at signup or later profile edit.

Errors:

- `PRIVACY_CONSENT_REQUIRED`: consent was not provided
- `PRIVACY_POLICY_VERSION_MISMATCH`: the policy changed during signup and must be accepted again
- `VALIDATION_ERROR`: the selected major is no longer active

### GET `/registration/options`

Auth: guest

Returns active major options and the current privacy-policy version required for signup.

### Registration admin endpoints

Auth: admin

- `GET /registration/admin/majors`: list active and inactive options
- `POST /registration/admin/majors`: create an active option
- `PUT /registration/admin/majors/{major_id}`: rename, reorder, activate, or deactivate
- `GET /registration/admin/privacy-policy`: get the active version
- `PUT /registration/admin/privacy-policy`: activate a version and effective timestamp

At least one major option must remain active. All changes are recorded in operational audit logs.

### POST `/auth/refresh`

Auth: guest with refresh token

Request:

```json
{
  "refresh_token": "opaque-token"
}
```

Response:

```json
{
  "access_token": "jwt",
  "refresh_token": "rotated-opaque-token",
  "token_type": "bearer",
  "expires_in": 900
}
```

### POST `/auth/logout`

Auth: user

Request:

```json
{
  "refresh_token": "opaque-token"
}
```

Response:

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
  "email": "user@sogang.ac.kr"
}
```

Response:

```json
{
  "accepted": true,
  "expires_in": 300,
  "resend_in": 300,
  "email_sent": true
}
```

Rule:

- Always return `accepted: true` to avoid account enumeration.
- The six-digit code is delivered only by email and never included in the response.
- The code expires after five minutes, and another code is not issued for the same address during that period.

### POST `/auth/password-reset/verify-code`

Auth: guest

Request:

```json
{
  "email": "user@sogang.ac.kr",
  "code": "123456"
}
```

Response:

```json
{
  "verification_token": "short-lived-token",
  "expires_in": 900
}
```

Errors:

- `VERIFICATION_CODE_INVALID`: invalid code
- `VERIFICATION_EXPIRED`: expired code
- `VERIFICATION_ATTEMPTS_EXCEEDED`: five failed attempts

### POST `/auth/password-reset/confirm`

Auth: guest

Request:

```json
{
  "token": "reset-token",
  "new_password": "NewPassword123!"
}
```

Response:

```json
{
  "changed": true
}
```

Rule:

- A successful password reset revokes every active refresh token for the account.

## 3. Users

### GET `/users/me`

Auth: user

Response:

```json
{
  "id": 1,
  "email": "user@sogang.ac.kr",
  "nickname": "Jinsan",
  "cohort": "72",
  "major": "AI-SW",
  "phone": "010-0000-0000",
  "company": "WithWe",
  "job_title": "Dev Lead",
  "position": null,
  "profile_image_url": null,
  "profile_image_media_id": null,
  "role": "admin"
}
```

### PUT `/users/me`

Auth: user

Request:

```json
{
  "major": "AI-SW",
  "phone": "010-0000-0000",
  "company": "WithWe",
  "job_title": "Dev Lead",
  "position": null,
  "profile_image_url": null
}
```

Rules:

- A member cannot change their name/nickname or cohort through profile update.
- `major` must match a currently active administrator-managed major option.
- `profile_image_url` accepts only a ready, non-private image uploaded by the current member. The server stores its canonical `/api/media/{id}/access-url` reference; `null` or a blank value removes the profile image.
- `GET /users/me` returns the resolved `profile_image_media_id` so clients can request a fresh signed display URL.

Response:

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
  "current_password": "oldPassword123",
  "new_password": "newPassword123"
}
```

A successful password change revokes active refresh sessions and deactivates all registered push tokens. Account deletion removes the user's refresh and push records as part of the irreversible transaction.

### DELETE `/users/me`

Auth: user

Request:

```json
{
  "current_password": "currentPassword123!"
}
```

Response:

```json
{
  "deleted": true,
  "receipt_id": "c2467e45-494d-4e9a-b0cc-39a920a80d85",
  "completed_at": "2026-07-27T08:15:00"
}
```

Rules:

- The server verifies the current password; UI-only verification is never trusted.
- The operation is irreversible and rate-limited.
- In these deletion rules, `public` means non-private active published content retained for authenticated community members; it does not reopen guest content access.
- Public, active, published posts/comments may remain only after `author_id` is set to null. Their API display name is `Deleted user`.
- Public attachments required by retained public posts may remain only after `owner_id` is set to null and the original filename is anonymized.
- Private, draft, hidden, deleted, and mutual-aid posts; private/non-public comments; private evidence; and non-retained owned media are deleted.
- Sessions, reset/verification tokens, likes, bookmarks, reports, search history, blocks, notifications/settings, push tokens/deliveries, and account-linked rate-limit subjects are removed.
- Administrator self-deletion returns `409 ADMIN_ACCOUNT_DELETION_FORBIDDEN` until responsibilities are transferred and another administrator demotes the account.
- The receipt is non-identifying and contains no user ID, email, IP address, free-form reason, or deletion counts.

### POST `/auth/account-deletion/request`

Auth: guest

Request:

```json
{
  "email": "member@sogang.ac.kr"
}
```

Response for both known and unknown accounts:

```json
{
  "accepted": true,
  "expires_in": 300,
  "resend_in": 300
}
```

Rules:

- The endpoint is rate-limited by normalized email and request IP.
- It never returns a verification code or reveals whether an account exists.
- A code is retained only when SMTP delivery succeeds.

### POST `/auth/account-deletion/verify`

Auth: guest

Request:

```json
{
  "email": "member@sogang.ac.kr",
  "code": "123456",
  "current_password": "currentPassword123!"
}
```

Success response is the same `deleted`, `receipt_id`, and `completed_at` object as authenticated deletion.

Unknown account, invalid/expired code, and invalid password all return the same normalized error:

```json
{
  "status": "error",
  "message": "Invalid or expired account deletion request.",
  "code": "ACCOUNT_DELETION_INVALID"
}
```

### GET `/users/me/activity`

Auth: user

Query:

- `type`: optional, one of `posts`, `comments`, `bookmarks`
- `page`, `size`

Response item:

```json
{
  "type": "bookmark",
  "id": 45,
  "post_id": 123,
  "title": "Post title",
  "board_id": 1,
  "author_nickname": "Jinsan",
  "author_cohort": "72",
  "created_at": "2026-04-25T00:00:00Z"
}
```

Rules:

- For bookmark items, `created_at` is the bookmarked post's creation time. Bookmark ordering may still use the time at which the bookmark was saved.
- Anonymous or deleted authors return `author_cohort: null`.

### GET `/users/search`

Auth: user

Query:

- `q`: required, min length 1, searches nickname/cohort/major
- `size`: optional, default `8`, max `20`

Response item:

```json
{
  "id": 1,
  "nickname": "Jinsan",
  "cohort": "72",
  "major": "AI-SW"
}
```

Rule:

- Intended for in-app member selection such as activity certification participants.
- Does not return email, phone, company, or account status.

### GET `/users/me/blocks`

Auth: user

Response item:

```json
{
  "id": 1,
  "blocked_user_id": 2,
  "blocked_user_nickname": "Blocked user",
  "reason": "post_detail",
  "created_at": "2026-06-21T00:00:00Z"
}
```

### POST `/users/me/blocks`

Auth: user

Request:

```json
{
  "blocked_user_id": 2,
  "reason": "post_detail"
}
```

Response:

```json
{
  "id": 1,
  "blocked_user_id": 2,
  "duplicate": false
}
```

Rules:

- Users cannot block themselves.
- Post lists, post search, and comment lists hide content from blocked authors for the authenticated user.

### DELETE `/users/me/blocks/{blocked_user_id}`

Auth: user

Response:

```json
{
  "blocked_user_id": 2,
  "blocked": false
}
```

### GET `/users/admin/users`

Auth: admin

Query:

- `q`: optional email, nickname, or cohort keyword
- `role`: optional `user` or `admin`
- `is_active`: optional boolean
- `page`, `size`

Response item:

```json
{
  "id": 1,
  "email": "user@sogang.ac.kr",
  "nickname": "Jinsan",
  "cohort": "72",
  "role": "admin",
  "is_active": true,
  "last_login_at": "2026-06-21T00:00:00Z",
  "created_at": "2026-04-25T00:00:00Z"
}
```

### PUT `/users/admin/users/{user_id}`

Auth: admin

Request:

```json
{
  "role": "admin",
  "is_active": true
}
```

Rules:

- Admins cannot remove their own admin role or deactivate themselves through this endpoint.

## 4. Boards and IA

### GET `/boards`

Auth: user

Response:

```json
[
  {
    "category": "notices",
    "label": "Notices",
    "boards": [
      {
        "id": 1,
        "name": "Academic Notices",
        "slug": "academic-notices",
        "board_type": "notice",
        "description": "...",
        "sort_order": 1,
        "permissions": {
          "read": "user",
          "write": "admin"
        }
      }
    ]
  }
]
```

### GET `/boards/{board_id}`

Auth: user

Response:

```json
{
  "id": 1,
  "name": "Academic Notices",
  "slug": "academic-notices",
  "category": "notices",
  "board_type": "notice",
  "description": "...",
  "sort_order": 1,
  "allow_anonymous": false,
  "is_active": true
}
```

## 5. Posts

### GET `/boards/{board_id}/posts`

Auth: user

Query:

- `page`, `size`
- `q`: optional search keyword
- `category`: optional type-specific category
- `status`: optional, used by suggestions
- `from_date`, `to_date`: optional date filter
- `sort`: `latest`, `popular`, `views`

Response item:

```json
{
  "id": 10,
  "board_id": 1,
  "title": "Notice title",
  "content_preview": "Preview text",
  "author_id": 1,
  "author_nickname": "Admin",
  "is_anonymous": false,
  "is_pinned": true,
  "is_notice": true,
  "view_count": 10,
  "like_count": 2,
  "comment_count": 1,
  "created_at": "2026-04-25T00:00:00Z",
  "highlights": {
    "title": "Notice <mark>title</mark>",
    "content_preview": "Preview text"
  }
}
```

Rules:

- When authenticated, posts written by blocked authors are excluded from the list.

### GET `/posts/{post_id}`

Auth: user

Response:

```json
{
  "id": 10,
  "board_id": 1,
  "title": "Notice title",
  "content": "Full content",
  "author_id": 1,
  "author_nickname": "Admin",
  "is_anonymous": false,
  "is_pinned": true,
  "is_notice": true,
  "view_count": 11,
  "like_count": 2,
  "comment_count": 1,
  "is_liked": false,
  "is_bookmarked": false,
  "attachments": [],
  "metadata": {},
  "created_at": "2026-04-25T00:00:00Z",
  "updated_at": "2026-04-25T00:00:00Z"
}
```

Rules:

- Content routes are member-only; missing or invalid credentials return normalized `401 UNAUTHORIZED`.
- A mutual-aid post owned by another member is returned as `404 NOT_FOUND`, not `403`, to avoid object-existence disclosure. Administrators can read all requests.
- Draft or hidden posts are readable only by their author and administrators; `deleted` status is administrator-only. The same rule applies to lists, detail, global search, activity history, comments, reactions, reports, and attached media.

### POST `/boards/{board_id}/posts`

Auth: user or admin, depending on board permissions

Request:

```json
{
  "title": "Post title",
  "content": "Post content",
  "is_anonymous": false,
  "attachment_ids": [1, 2],
  "metadata": {
    "category": "academic",
    "semester": "2026-1"
  }
}
```

Response:

```json
{
  "id": 10
}
```

Rules:

- `title` is trimmed, required for all boards, and limited to 100 characters.
- `content` is a required request field, is trimmed, and is limited to 10,000 characters. Its trimmed value must be non-empty except for `mutual_aid`, where it stores the optional remarks and an empty string is accepted. Image-only album storage may omit the persisted body only after the request has passed this validation.
- Anonymous writing is allowed only when `boards.allow_anonymous = true`.
- For anonymous or forced-anonymous posts, non-admin readers other than the author receive `author_id: null`, `author_nickname: "Anonymous"`, and no cohort. Author-name search and block-based filtering do not act as identity side channels; anonymous content remains reportable.
- `club-promo` and `networking-programs` posts are admin-only even if a stale board configuration says otherwise.
- These administrator-managed participation guide posts require at least one ready image attachment.
- Their metadata requires an HTTP(S) `application_url`; the mobile detail CTA opens this administrator-managed URL.
- `study-recruit` remains user-writable, so every authenticated member may create and manage their own study recruitment post.
- Club, study, and networking activity certification boards keep `write_permission = user`, so every authenticated member may submit an activity certification.
- Activity certifications require at least one ready image and reject non-image attachments.
- `metadata.bank_account` is returned only to admins; list/detail responses for ordinary users remove it while preserving the stored value.
- Council/GSA boards are admin-managed except `suggestion` and `mutual_aid` board types; the post API applies this rule even if board permission data is stale.
- Suggestion list items expose `suggestion.status` as `received` or `answered`. Only admins can write the official reply; `answered` is rejected unless a non-empty official reply is supplied. A new or changed reply notifies the anonymous author without exposing their identity in the UI.
- Mutual-aid requests are private records: non-admin users only receive their own requests in board lists and global search and may only open their own request details, comments, and attachments. Admins can list and review every request. At least one private evidence attachment is required by the API, while `content` stores optional remarks and accepts an empty string. A guessed ID belonging to another member returns `404 NOT_FOUND`.
- A new mutual-aid `metadata.event_date` must be at least two calendar days after the current `Asia/Seoul` date. Past dates, today, and tomorrow return `422 MUTUAL_AID_DATE_TOO_SOON`; exactly D+2 is accepted. Both `YYYY-MM-DD` and the mobile form's `YYYY.MM.DD` storage value are parsed.
- Admin notice posts may set `metadata.show_in_council_activity = true`. Linked notices require an image in the admin UI and are reused as photo/text entries in the council activity history.
- The `gsa-executives` board stores administrator-managed executive records under `boards.metadata.executives` with `name`, `cohort`, `role`, and optional `image_url`.
- Notice boards are admin-write only.
- Album posts require at least one image attachment, reject non-image attachments, and store no body text.

### PUT `/posts/{post_id}`

Auth: author or admin

Request: same as create.

For mutual-aid requests, changing `metadata.event_date` applies the same KST D+2 rule as creation. An unchanged historical date may be retained while other editable fields are updated, so an existing processing request does not become uneditable merely because time passed.
Members may update their own mutual-aid request only while its workflow status is `processing`. A `completed` or `rejected` request is immutable; administrators change workflow status only through the dedicated mutual-aid endpoint.

For activity certifications, authors can update `metadata.activity_date`, `metadata.participants`, `metadata.participant_user_ids`, and `metadata.activity_source_post_id`. If the member-facing edit payload omits the hidden `metadata.bank_account`, the stored value is preserved; explicitly providing the key updates it.

### PUT `/posts/{post_id}/mutual-aid`

Auth: admin

Request:

```json
{
  "status": "rejected",
  "rejection_reason": "관계를 확인할 수 있는 증빙서류가 필요합니다."
}
```

Allowed status:

- `processing`
- `completed`
- `rejected`

### DELETE `/posts/{post_id}` mutual-aid policy

For a member deleting their own mutual-aid request, `processing` and `rejected` are allowed. A `completed` request returns `403 FORBIDDEN` and remains stored. The API enforces this independently of whether the mobile UI displays the delete action. Administrator moderation keeps its existing delete authority.

Rules:

- `rejection_reason` is required when status is `rejected`.
- A status change creates a council notification for the applicant.
- Activity-certification bank-account metadata is omitted from member-facing post list/detail responses; it is available only to admin detail reads.

### DELETE `/posts/{post_id}`

Auth: author or admin

Response:

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

### POST `/posts/{post_id}/like`

Auth: user

Response:

```json
{
  "post_id": 10,
  "is_liked": true,
  "like_count": 3
}
```

### POST `/posts/{post_id}/bookmark`

Auth: user

Response:

```json
{
  "post_id": 10,
  "is_bookmarked": true
}
```

## 6. Comments

### GET `/posts/{post_id}/comments`

Auth: user

Response item:

```json
{
  "id": 1,
  "post_id": 10,
  "author_id": 1,
  "author_nickname": "Jinsan",
  "author_cohort": "72",
  "parent_id": null,
  "content": "Comment",
  "created_at": "2026-04-25T00:00:00Z",
  "updated_at": "2026-04-25T00:00:00Z",
  "children": []
}
```

Rules:

- When authenticated, comments written by blocked authors are excluded from the response tree.
- A deleted or otherwise hidden comment author returns `author_cohort: null`.
- `lecture-reviews` is a forced-anonymous, no-comment board. Non-admin users receive an empty comment list and user-facing post responses mask the author as `Anonymous`.
- `exam-archive` exposes the post author under the normal post-author rules and supports comments.

### POST `/posts/{post_id}/comments`

Auth: user

Request:

```json
{
  "content": "Comment",
  "parent_id": null
}
```

Rules:

- Maximum depth is 2.
- `content` is trimmed, required, and limited to 500 characters.
- If `parent_id` points to a reply, return `BAD_REQUEST`.
- Creating a comment on `lecture-reviews` returns `403 COMMENTS_DISABLED`.
- The shared post-read policy is evaluated before all comment reads and mutations. Another member's mutual-aid comment tree is hidden with `404 NOT_FOUND`.

### PUT `/comments/{comment_id}`

Auth: author or admin

Request:

```json
{
  "content": "Updated comment"
}
```

### DELETE `/comments/{comment_id}`

Auth: author or admin

Response:

```json
{
  "id": 1,
  "deleted_count": 2
}
```

## 7. Search

### GET `/search`

Auth: user

Query:

- `q`: required, min length 2
- `scope`: `all`, `board`, `notices`, `community`, `participation`, `council`
- `board_id`: required when `scope = board`
- `notice_category`: optional when `scope = notices`; one of `academic`, `event`, `other`
- `page`, `size`

Response item:

```json
{
  "type": "post",
  "id": 10,
  "board_id": 1,
  "board_name": "Academic Notices",
  "board_slug": "academic-notices",
  "category": "academic",
  "title": "Matched title",
  "content_preview": "Matched preview",
  "author_nickname": "Jinsan",
  "author_cohort": "72",
  "created_at": "2026-04-25T00:00:00Z",
  "highlights": {
    "title": "<mark>Matched</mark> title",
    "content_preview": "Matched preview"
  }
}
```

Rules:

- When authenticated, results written by blocked authors are excluded.
- Anonymous, forced-anonymous, deleted, or otherwise hidden authors return `author_cohort: null`.
- `exam-archive` search results expose author nickname and cohort under the normal post-author rules; `lecture-reviews` remains forced-anonymous for non-admin users.
- Mutual-aid results are owner-scoped for members. Administrators can search every request.

### GET `/search/recent`

Auth: user

Response:

```json
[
  {
    "keyword": "exam",
    "searched_at": "2026-04-25T00:00:00Z"
  }
]
```

## 8. Media

### POST `/media/uploads`

Auth: user

Content-Type: `multipart/form-data`

Form fields:

- `file`: binary file

```json
{
  "id": 1,
  "original_filename": "photo.jpg",
  "stored_filename": "generated-token.jpg",
  "content_type": "image/jpeg",
  "file_size": 123456,
  "url": "/api/media/1/access-url",
  "access_url": "/api/media/1/access-url",
  "status": "ready"
}
```

Rules:

- The server streams the upload to a temporary file in chunks and deletes partial files after every failure.
- Default maximum size is 20 MiB and can be changed with `MEDIA_UPLOAD_MAX_BYTES`; streaming chunks default to 1 MiB via `MEDIA_UPLOAD_CHUNK_BYTES`.
- Allowed extensions and MIME pairs are defined by `MEDIA_ALLOWED_EXTENSIONS` and `MEDIA_ALLOWED_MIME_TYPES`. The launch defaults are `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.heic`, `.heif`, `.pdf`, `.doc`, `.xls`, `.ppt`, `.docx`, `.xlsx`, `.pptx`, and `.hwp`, paired with the MIME values in `backend/.env.example`.
- Storage directories are configured with `MEDIA_UPLOAD_DIR` and `MEDIA_PRIVATE_UPLOAD_DIR` and must not be exposed by a web server.
- Images, PDF, and the document formats used by the current UI are accepted; empty, oversized, forbidden, or mismatched files are rejected.
- Stored URLs are never public `/uploads` paths.

### GET `/media/{media_id}`

Auth: user

Returns metadata only after the caller passes media access policy.

### GET `/media/{media_id}/access-url`

Auth: user

Returns a short-lived signed file URL:

```json
{
  "url": "/api/media/files/1?expires=...&signature=...",
  "expires_in": 300
}
```

Rules:

- Unattached ordinary media is available to its owner and administrators; member-facing profile/banner media may be issued to authenticated members.
- A post attachment requires read permission for at least one attached post.
- Mutual-aid evidence requires request ownership or administrator role.
- An unauthorized object-level request returns `404 NOT_FOUND`.

### GET `/media/access-url?path=...`

Auth: user

Compatibility resolver for a server-relative stable reference (`/api/media/{id}/access-url`) or legacy `/uploads/{stored_filename}` value already stored in profile/banner/board metadata. It applies the same object-level policy and rejects absolute, external, traversal, query-bearing, or unknown paths. New code should prefer the media ID endpoint.

### GET `/media/files/{media_id}`

Auth: short-lived signed URL

The signature is scoped to the media object and expiry. Missing, expired, or altered signatures are rejected. `/uploads/*` is not mounted.

## 9. Events

### GET `/events`

Auth: user

Query:

- `from_date`: required or default first day of current month
- `to_date`: required or default last day of current month
- `category`: optional

Date bounds use overlap semantics: an event is returned when it starts before the exclusive end of the requested range and its `end_at` (or `start_at` when no end exists) is on or after the range start. Date-only `to_date` values include that full calendar day, so month and single-day queries include multi-day events that began earlier and are still in progress.

Response item:

```json
{
  "id": 1,
  "title": "Midterm snack event",
  "description": "...",
  "location": "Sogang",
  "category": "event",
  "color": "#2563eb",
  "start_at": "2026-04-20T09:00:00Z",
  "end_at": "2026-04-20T10:00:00Z"
}
```

Admin CRUD:

- `POST /events`
- `PUT /events/{event_id}`
- `DELETE /events/{event_id}`
- `POST /events/admin/dispatch-reminders`: idempotently creates D-day and D-1 notifications for the selected date.

## 10. FAQ and Guide-backed Boards

FAQ:

- `GET /faqs` user
- `POST /faqs` admin
- `PUT /faqs/{faq_id}` admin
- `DELETE /faqs/{faq_id}` admin

Guide content does not have a separate `/guides` domain in v1. Club and networking guides use protected board/post APIs and administrator dependencies; study recruitment uses the member-writable board policy. A dedicated guide CRUD domain is deferred to v1.1.

## 10.1 Home Banners

- `GET /banners` returns only active, currently visible banners that contain at least one registered image. `include_inactive=true` remains available to the administrator screen for repairing legacy placeholders.
- `POST /banners` and `PUT /banners/{banner_id}` are administrator-only and require the resulting banner to retain at least one non-empty `image_url` or responsive `image_urls` entry.
- Missing all images returns `422 BANNER_IMAGE_REQUIRED`.
- Member clients render the selected responsive image as the complete banner artwork. Text, badge, deadline, theme, and gradient overlays are not synthesized by the app.

## 11. Notifications

### GET `/notifications`

Auth: user

Query: `page`, `size`

Response item:

```json
{
  "id": 1,
  "notification_type": "comment",
  "message": "New comment",
  "post_id": 10,
  "is_read": false,
  "created_at": "2026-04-25T00:00:00Z"
}
```

### PUT `/notifications/{notification_id}/read`

Auth: user

Council workflow notifications use `notification_type: "council"` and respect the user's `notify_council` setting.

New notice posts create `notice` notifications immediately. Event reminders use a per-user deduplication key so scheduled work can be retried safely.

### GET `/notifications/settings/me`

Auth: user

Response:

```json
{
  "notify_comment": true,
  "notify_like": true,
  "notify_notice": true,
  "notify_event": true,
  "notify_council": true
}
```

### PUT `/notifications/settings/me`

Auth: user

Request: same as response.

### POST `/notifications/admin/push-receipts/sync`

Native push delivery uses Expo push tokens and the Android `default` channel. Notification preference filtering occurs before both the notification-center record and push delivery are created. Web browser notifications reuse the authenticated notification list and do not register Expo push tokens.

Auth: admin

Synchronizes Expo delivery receipts, records failures, and disables tokens rejected as `DeviceNotRegistered`.

## 11.1 Admin Operations

- `GET /admin/stats`: active users, posts, comments, notices, events, reports, and push-delivery metrics.
- `GET /admin/audit-logs?page=1&size=30`: recent protected administrator actions.
- `GET /admin/legacy-import/summary`: grouped legacy-import counts by entity type, status, and action.
- `GET /admin/legacy-import/records?page=1&size=50`: paginated private reconciliation records.

Both legacy-import endpoints require `admin`. The records endpoint accepts optional `status`,
`entity_type`, and `source_id` filters and returns provenance, target linkage, bounded reason text,
and redacted details only. It does not return the raw spreadsheet row or unredacted legacy content.

### GET `/users/nickname-availability`

Auth: user

Query: `nickname`

This endpoint remains for older clients and reports a nonblank normalized name as available. Names are real-name display fields, so duplicates are valid; email is the unique account identifier.

## 12. Reports and Moderation

### POST `/posts/{post_id}/report`

Auth: user

Request:

```json
{
  "reason": "inappropriate",
  "detail": "optional detail"
}
```

Response:

```json
{
  "id": 1,
  "status": "open",
  "duplicate": false
}
```

### POST `/comments/{comment_id}/report`

Auth: user

Request and response: same as post report.

### GET `/admin/reports`

Auth: admin

Query:

- `status`: `open`, `reviewing`, `resolved`, `dismissed`, or `all`
- `page`, `size`

Response item:

```json
{
  "id": 1,
  "target_type": "post",
  "target_id": 10,
  "reason": "privacy",
  "detail": "optional detail",
  "status": "open",
  "reporter_id": 1,
  "reporter_nickname": "Jinsan",
  "target": {
    "target_exists": true,
    "target_deleted": false,
    "post_id": 10,
    "board_id": 1,
    "title": "Post title",
    "content_preview": "Preview",
    "author_id": 2,
    "author_nickname": "Author"
  }
}
```

### PUT `/admin/reports/{report_id}`

Auth: admin

Request:

```json
{
  "status": "resolved"
}
```

Rules:

- Status values are `open`, `reviewing`, `resolved`, and `dismissed`.
- Target deletion still uses the existing admin-authorized post/comment delete APIs.
