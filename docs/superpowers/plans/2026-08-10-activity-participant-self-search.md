# Activity Participant Self Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the activity-certification participant picker explicitly support searching and selecting the signed-in member, matching the approved guidance design.

**Architecture:** Preserve the existing `/users/search` eligibility rules and searchable chip picker. Add regression coverage for signed-in-member search and centralize the participant guidance copy so the screen communicates that the author must add themselves.

**Tech Stack:** FastAPI, SQLAlchemy 2.0, pytest, React Native, TypeScript node tests.

## Global Constraints

- Do not auto-select the signed-in member.
- Do not bypass the existing active enrollment and paid/exempt dues rules.
- Keep duplicate participant prevention and participant metadata unchanged.
- Preserve unrelated working-tree changes.

---

### Task 1: Lock the existing self-search API behavior

**Files:**
- Create: `backend/tests/test_user_search.py`

**Interfaces:**
- Consumes: authenticated `GET /api/users/search?q={name}`.
- Produces: regression coverage proving an eligible authenticated user can find themselves.

- [x] **Step 1: Add the API regression test**

Create an eligible owner fixture through the shared `api` context, search for `Owner`, and assert the returned IDs contain user ID `1`.

- [x] **Step 2: Run the focused API test**

Run: `.\.venv\Scripts\python.exe -m pytest tests/test_user_search.py -q`

Expected: PASS because the API already includes the signed-in user when eligibility conditions are satisfied.

### Task 2: Apply the participant guidance design

**Files:**
- Modify: `frontend/utils/activityCertification.ts`
- Modify: `frontend/tests/activityCertification.test.ts`
- Modify: `frontend/app/board/post/create.tsx`
- Modify: `docs/phase2/FRONTEND_ROUTE_SPEC.md`
- Modify: `CODEX.md`

**Interfaces:**
- Produces: `ACTIVITY_PARTICIPANT_GUIDANCE`, consumed by the activity-certification form.

- [x] **Step 1: Add a failing guidance contract test**

Import `ACTIVITY_PARTICIPANT_GUIDANCE` and assert that it tells the author to search for and add themselves.

- [x] **Step 2: Run the focused frontend test and verify RED**

Run: `npx tsx --test tests/activityCertification.test.ts`

Expected: FAIL because `ACTIVITY_PARTICIPANT_GUIDANCE` is not exported yet.

- [x] **Step 3: Implement the minimal screen change**

Export the approved guidance from `utils/activityCertification.ts`, import it in the create screen, and replace the shorter warning text with the shared copy.

- [x] **Step 4: Run focused tests and verify GREEN**

Run the backend focused test and `npx tsx --test tests/activityCertification.test.ts`.

Expected: both pass.

- [x] **Step 5: Run regression verification**

Run `npm test`, `npm run typecheck`, and the relevant backend user tests. Verify the participant picker visually on the study activity-certification form.
