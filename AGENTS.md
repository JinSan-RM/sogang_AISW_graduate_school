# Agent Guide

This repository is the AI·SW CAMPUS renewal project.

## Project Direction

- Frontend: React Native with Expo Router.
- Backend: FastAPI with SQLAlchemy 2.0 and Alembic.
- Database: PostgreSQL.
- Product source: Notion `App Development (New)` > `Community App Enhancement Schedule`.
- Current planning scope: Phase 1 through Phase 4.

## Operating Rules

- Treat `PLAN.md` as the product and architecture plan.
- Treat `CODEX.md` as the actionable implementation backlog.
- Read the relevant file in `docs/phase2/` before implementing API, DB, auth, permissions, or frontend route changes.
- Before adding features, check whether the feature is P0, P1, or P2 in `PLAN.md`.
- Prefer the existing code style and directory layout.
- Do not replace the current app architecture without a written decision in `PLAN.md`.
- Phase 3/4 work is allowed after checking `PLAN.md` and `CODEX.md`; keep Phase 5/6 release work out of scope unless explicitly requested.

## Phase 2 Contract Files

- API work: `docs/phase2/API_CONTRACT.md`
- DB/migration work: `docs/phase2/DB_SCHEMA_DECISIONS.md`
- Auth/permission work: `docs/phase2/AUTH_PERMISSION_SPEC.md`
- Frontend route and screen work: `docs/phase2/FRONTEND_ROUTE_SPEC.md`
- Execution order: `docs/phase2/IMPLEMENTATION_SEQUENCE.md`
- Review gate: `docs/phase2/PHASE2_REVIEW_CHECKLIST.md`

## Development Guardrails

- Keep backend modules separated by domain: auth, users, boards, posts, comments, media, events, notifications.
- Keep API responses normalized as current README states: success `{status, data}` and error `{status, message, code}`.
- Use Alembic for schema changes.
- Avoid duplicating denormalized fields such as `author_name` unless the behavior requires historical snapshots.
- Preserve existing user work and do not revert unrelated changes.

## Product Rules From Notion

- Main IA: notices, schedule, community, participation, student council, settings.
- Core board abstraction should cover notices, resources, activity certification, activity history, suggestions, mutual aid, and external-link notices.
- Public users can read most content.
- Logged-in users can write community content, comments, likes, bookmarks, and suggestions.
- Admins manage notices, pinned posts, FAQ, guide content, schedules, and official replies.
- Comments support 2-depth replies.

## Phase 2 Gate

Before Phase 3 implementation, confirm:

- API contract is written and implemented or item-level deferred.
- DB schema matches SQLAlchemy models, Alembic migrations, and seed data.
- User identity fields are implemented as decided.
- Auth/session strategy is implemented.
- Upload/media strategy is implemented or explicitly deferred.
- UI tokens and core Figma screens are ready.

## Phase 3/4 Agent Rules

Phase 3 and Phase 4 are development sprints, not discovery-only planning. Agents should turn each Notion task into code, tests, and verification notes.

General rules:

- Keep every change tied to a Phase 3/4 work package in `CODEX.md`.
- Update docs when implementation intentionally differs from the Notion output guide.
- Prefer small vertical slices: backend model/API, frontend screen/client wiring, and smoke test notes together.
- Do not add external providers blindly. Email, push, object storage, and analytics need env variables, fallback behavior, and local-dev instructions.
- Any admin feature must use explicit admin dependencies and must not rely on frontend-only hiding.

Phase 3 ownership boundaries:

- Setup/CI: repository metadata, lint/typecheck scripts, env examples, CI workflow.
- DB/data: Alembic migrations, seed data, runtime migration checks, backup notes.
- Auth/profile: auth APIs, session storage, password reset, account/profile UI, image upload.
- Community: boards, posts, comments, reactions, search, media attachments, pagination, reporting hooks.

Phase 4 ownership boundaries:

- Notifications/notices: notice admin workflows, notification trigger rules, read state, settings, push-token model/provider adapter.
- Events/schedule: event APIs, list/calendar views, admin CRUD, D-day notification hook, recurring-event decision.
- Admin: user management, content moderation, FAQ/event/notice management, basic statistics.
- Integration: env alignment, route audit, API smoke tests, iOS/Android build checks, Phase 5 QA handoff.

Phase 4 exit gate:

- All P0 mobile routes are reachable.
- Guest/user/admin permissions are verified from the API, not only from the UI.
- Backend compile/import checks and frontend typecheck pass.
- Docker runtime smoke test is documented as passed or blocked with the exact reason.
- Known issues are tagged as `Phase 5 QA`, `v1.1`, or `blocked`.
