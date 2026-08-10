# Club and Study Activity Form Date Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep activity photo/reflection fields identifiable and prevent future activity dates on club and study certification forms.

**Architecture:** Pure KST date helpers define the allowed maximum and reusable range/month decisions. The shared inline calendar accepts an optional maximum date, while the create/edit screen opts in only for `club-activity` and `study-activity` and repeats validation immediately before mutation.

**Tech Stack:** React Native, Expo Router, TypeScript, React Hook Form, Node test runner.

## Global Constraints

- Apply the label and date policy only to `club-activity` and `study-activity`.
- Allow every valid past date and the current `Asia/Seoul` date; reject tomorrow and later.
- Disable future date cells and next-month navigation, and revalidate on submit.
- Keep networking activity certification and mutual-aid minimum-date behavior unchanged.
- Preserve existing attachment, reflection, source selection, account, and participant values on edit.
- Preserve unrelated worktree changes and stage only task-owned hunks.

---

### Task 1: Define timezone-safe activity date policy

**Files:**
- Modify: `frontend/tests/dateSelection.test.ts`
- Modify: `frontend/utils/dateSelection.ts`
- Modify: `frontend/tests/activityCertification.test.ts`
- Modify: `frontend/utils/activityCertification.ts`

**Interfaces:**
- Produces: `maximumActivityCertificationDate(now?: Date): string`.
- Produces: `isActivityCertificationDateAllowed(value?: string, now?: Date): boolean`.
- Produces: `isDotDateWithinRange(value, { minimumDate?, maximumDate? }): boolean`.
- Produces: `isCalendarMonthAfterMaximum(year, monthIndex, maximumDate?): boolean`.
- Produces: `usesPastActivityDatePolicy(boardSlug?: string): boolean`.

- [ ] **Step 1: Write failing KST boundary and range tests**

```typescript
const beforeKstMidnight = new Date("2026-08-01T14:59:59Z");
const afterKstMidnight = new Date("2026-08-01T15:00:00Z");
assert.equal(maximumActivityCertificationDate(beforeKstMidnight), "2026.08.01");
assert.equal(maximumActivityCertificationDate(afterKstMidnight), "2026.08.02");
assert.equal(isActivityCertificationDateAllowed("2026.08.02", afterKstMidnight), true);
assert.equal(isActivityCertificationDateAllowed("2026.08.03", afterKstMidnight), false);
assert.equal(isDotDateWithinRange("2026.08.03", { maximumDate: "2026.08.02" }), false);
assert.equal(isCalendarMonthAfterMaximum(2026, 8, "2026.08.02"), true);
```

Also assert `usesPastActivityDatePolicy` is true for club/study and false for networking.

- [ ] **Step 2: Run focused tests and verify RED**

Run in `frontend`:

```powershell
npx tsx --test tests/dateSelection.test.ts tests/activityCertification.test.ts
```

Expected: FAIL because the new helpers are not exported.

- [ ] **Step 3: Implement the minimal pure helpers**

Reuse the existing validated dot-date parser and `koreaCalendarDateParts`. Compare normalized `YYYY.MM.DD` values only after validation. Treat an invalid value or invalid boundary as disallowed.

```typescript
export function maximumActivityCertificationDate(now = new Date()): string {
  return formatCalendarDateParts(koreaCalendarDateParts(now));
}

export function isActivityCertificationDateAllowed(value?: string, now = new Date()): boolean {
  return isDotDateWithinRange(value, { maximumDate: maximumActivityCertificationDate(now) });
}
```

- [ ] **Step 4: Run focused tests and verify GREEN**

Run the same command from Step 2.

Expected: PASS.

- [ ] **Step 5: Commit the pure-policy slice with reviewed hunks only**

```powershell
git add frontend/utils/dateSelection.ts frontend/tests/dateSelection.test.ts
git add -p -- frontend/utils/activityCertification.ts frontend/tests/activityCertification.test.ts
git diff --cached --check
git commit -m "feat(frontend): define activity date limits"
```

### Task 2: Add an optional maximum to the shared inline calendar

**Files:**
- Modify: `frontend/app/board/post/create.tsx`

**Interfaces:**
- Consumes: `maximumDate?: string`, `isDotDateWithinRange`, and `isCalendarMonthAfterMaximum`.
- Produces: disabled future day cells and disabled next-month navigation without changing minimum-only callers.

- [ ] **Step 1: Extend `InlineCalendar` with `maximumDate`**

Initialize the visible month from the selected/minimum date but clamp a future stored value to the maximum month. Disable a day when it is outside either boundary.

```tsx
const isDisabled = !isDotDateWithinRange(dateStr, { minimumDate, maximumDate });
const nextView = view.m === 11 ? { y: view.y + 1, m: 0 } : { y: view.y, m: view.m + 1 };
const isNextDisabled = isCalendarMonthAfterMaximum(nextView.y, nextView.m, maximumDate);
```

- [ ] **Step 2: Apply disabled navigation semantics**

Set `disabled`, `accessibilityState={{ disabled: isNextDisabled }}`, muted icon color, and a guarded `onPress` on the next button. The previous button remains active because no minimum exists for activity certifications; mutual aid keeps its existing day-cell minimum behavior.

- [ ] **Step 3: Run focused date tests and typecheck**

Run in `frontend`:

```powershell
npx tsx --test tests/dateSelection.test.ts tests/activityCertification.test.ts
npm run typecheck
```

Expected: tests and typecheck pass.

- [ ] **Step 4: Commit the calendar slice without the pre-existing participant-guidance hunk**

```powershell
git add -p -- frontend/app/board/post/create.tsx
git diff --cached --check
git commit -m "feat(frontend): disable future activity dates"
```

### Task 3: Apply board scope, submit validation, and persistent section labels

**Files:**
- Modify: `frontend/app/board/post/create.tsx`
- Modify: `docs/phase2/FRONTEND_ROUTE_SPEC.md`
- Modify: `CODEX.md`

**Interfaces:**
- Consumes: `usesPastActivityDatePolicy(board?.slug)`, `maximumActivityCertificationDate()`, and `isActivityCertificationDateAllowed(values.activityDate)`.
- Produces: club/study-only maximum date and validation notice `오늘 이후 날짜는 선택할 수 없어요.`.

- [ ] **Step 1: Scope the maximum date and submission guard**

Pass `maximumDate` only when the board slug is club/study. Before constructing the mutation payload, reject a non-empty future activity date, set the `activityDate` field error, and show the form notice. Recompute today at submission time.

```tsx
if (usesPastDatePolicy && !isActivityCertificationDateAllowed(values.activityDate)) {
  const message = "오늘 이후 날짜는 선택할 수 없어요.";
  setError("activityDate", { message });
  setFormNotice(createFormNotice("활동일", message));
  return;
}
```

- [ ] **Step 2: Render persistent photo and reflection labels**

For club/study activity forms, wrap the existing photo picker and reflection input in the current `activityFieldGroup` pattern with `activityFieldTitle` labels `활동 사진` and `활동 소감`. Do not alter attachment values, removal behavior, or the reflection controller.

- [ ] **Step 3: Update product route/backlog documentation**

Document that club/study activity create/edit forms show persistent section labels and permit only dates through KST today. Leave the networking and mutual-aid rules intact. Stage only these new documentation hunks.

- [ ] **Step 4: Run the complete frontend verification gate**

Run in `frontend`:

```powershell
npm test
npm run typecheck
npm run lint
npm run export:web
```

Expected: all tests pass, typecheck/lint exit zero, and web export succeeds.

- [ ] **Step 5: Commit the form/docs slice**

```powershell
git add -p -- frontend/app/board/post/create.tsx docs/phase2/FRONTEND_ROUTE_SPEC.md CODEX.md
git diff --cached --check
git commit -m "fix(frontend): clarify activity certification forms"
```
