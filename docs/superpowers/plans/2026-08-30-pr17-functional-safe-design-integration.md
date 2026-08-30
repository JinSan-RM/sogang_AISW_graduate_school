# PR #17 Functional-Safe Design Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** PR #17의 일정·알림·공지·참여활동 디자인을 최신 main에 이식하면서 DB·기존 데이터·API 6종 호환성과 현재 사용자 기능을 보존한다.

**Architecture:** 백엔드와 DB는 변경하지 않고 프런트엔드 presentation 계층에서 레거시 일정 category를 3개 표시 그룹으로 정규화한다. 화면별 PR 스타일은 작은 커밋으로 이식하되 일정 편집 원본값, 검색, 자연 비율 이미지, 전체보기와 알림 의미를 순수 함수와 소스 회귀 테스트로 고정한다.

**Tech Stack:** React Native 0.81, Expo Router 6, TypeScript 5.9, React Hook Form, TanStack Query, Node test/tsx, FastAPI, SQLAlchemy 2.0, pytest, Expo Doctor

**Spec:** docs/superpowers/specs/2026-08-30-pr17-functional-safe-design-integration.md

## Global Constraints

- 기능과 데이터 기준은 main의 9f151de30286d346c5f6a70ab4a64375c9ac2f7b다.
- 일정 디자인 기준은 067e4d989470a05756ad5897481794cdb07d9187이다.
- 알림·공지·참여활동 디자인 기준은 07da71a5559cf59fb91248d7cbf3c9ac6a41ef80이다.
- backend/alembic/versions, backend/app/models/event.py, backend/app/schemas/event.py, backend/seed_test_data.sql은 수정하지 않는다.
- docker-compose.override.yml에 NOTIFY_SELF를 추가하지 않는다.
- DB의 academic, event, exam, council, external, other 값을 수정하거나 일괄 치환하지 않는다.
- 화면에는 학사일정, 행사일정, 기타일정만 표시하며 raw category를 fallback 문구로 사용하지 않는다.
- 새 일정은 academic, event, other만 만들고 레거시 일정은 category 칩을 누르지 않은 수정에서 원본 값을 보존한다.
- 공지 분류인 학사공지, 행사공지, 기타공지는 일정 분류와 섞지 않는다.
- 참여활동 검색, 이름·학번 참가자 검색, 이미지 전체보기, 자연 비율, 갤러리, 댓글, 첨부, 관리자 CRUD와 내비게이션을 유지한다.
- 공지 알림만 PR 공지 토스트를 사용하며 다른 알림은 기존 의미와 목적지를 유지한다.
- 공통 이미지 preview의 현재 600px 값과 공지 첨부의 현재 펼치기 동작은 이번 작업에서 변경하지 않는다.
- 기존 미추적 사용자 파일은 stage, 수정, 삭제하지 않는다.

---

## File structure

This remains one integration plan because all work is reviewed against the same two-commit PR and ends in one protected-file/visual gate. Tasks 1-6 are nevertheless independent review slices: event compatibility, notification, participation list/form, post detail, and fonts/notices each end in their own tests and commit before the full verification task.

### New focused files

- frontend/utils/eventCategoryPresentation.ts: 저장 category를 3개 표시 그룹·한글 라벨·화면별 PR tone으로 변환하고 편집 submit 값을 결정한다.
- frontend/tests/eventCategoryPresentation.test.ts: 여섯 값, unknown, 화면별 tone과 편집 원본값 보존을 단위 테스트한다.
- frontend/tests/eventCategoryUi.test.ts: 일정 4개 사용자 화면과 관리자 화면이 공통 presentation API를 쓰고 raw fallback을 제거했는지 확인한다.
- backend/tests/test_event_category_compatibility.py: 백엔드 6종 생성·수정·조회 호환성을 잠근다.
- frontend/utils/notificationToastPresentation.ts: 공지 토스트와 일반 토스트를 종류별로 선택하고 safe-area top 값을 계산한다.
- frontend/tests/notificationToastPresentation.test.ts: 토스트 종류와 top inset 순수 함수를 테스트한다.
- frontend/tests/pr17VisualContract.test.ts: PR의 시각 속성과 승인된 기능 예외가 함께 남아 있는지 소스 계약으로 확인한다.
- docs/qa/PR17_FUNCTIONAL_SAFE_INTEGRATION.md: 최종 자동 검증과 화면별 비교 결과를 기록한다.

### Existing files to modify

- frontend/app/(tabs)/events/index.tsx: 일정 목록 라벨.
- frontend/app/(tabs)/events/calendar.tsx: 캘린더 선택 일정 라벨.
- frontend/app/(tabs)/events/day/[date].tsx: 날짜별 라벨과 PR tone.
- frontend/app/(tabs)/events/[eventId].tsx: 상세 라벨과 PR tone.
- frontend/app/admin/index.tsx: 3개 칩, 레거시 원본 category 추적, 관리자 카드 라벨.
- frontend/components/NotificationBootstrap.tsx: 종류별 카드, 닫기, safe area, PR 공지 스타일.
- frontend/components/icons.tsx: NoticeToastIcon, ImagePlaceholderIcon, CouncilReplyIcon.
- frontend/app/(tabs)/board/[boardId].tsx: 마지막 활동 카드 divider를 제거하되 검색을 유지.
- frontend/app/(tabs)/board/post/create.tsx: 활동 인증 폼 시각 변경과 이름·학번 검색 문구 보존.
- frontend/app/(tabs)/board/post/[postId].tsx: visualHeroSection 순서와 PR 스타일을 기능 보존 방식으로 혼합 해소.
- frontend/app/(tabs)/notices.tsx: 렌더 결과를 바꾸지 않는 PR 앱바 정리.
- frontend/utils/fonts.ts: PR 웹 smoothing과 faux-bold 방지.
- frontend/tests/designBugVerification.test.ts: 기존 이미지·검색 계약과 새 글꼴 계약을 함께 검증.
- CODEX.md: 안전 통합 완료 및 승인된 PR 예외 기록.

---

### Task 1: Lock event data compatibility and build the presentation boundary

**Files:**

- Create: frontend/utils/eventCategoryPresentation.ts
- Create: frontend/tests/eventCategoryPresentation.test.ts
- Create: backend/tests/test_event_category_compatibility.py

**Interfaces:**

- Produces: EventDisplayCategory = "academic" | "event" | "other"
- Produces: EVENT_CATEGORY_OPTIONS readonly option list
- Produces: eventDisplayCategory(raw: string | null | undefined): EventDisplayCategory
- Produces: eventCategoryLabel(raw: string | null | undefined): string
- Produces: eventCategoryTone(raw, surface): EventCategoryTone
- Produces: eventCategoryValueForSubmit(input): string
- Consumes: no application changes; this task establishes the boundary used by Task 2.

- [ ] **Step 1: Write the failing frontend presentation tests**

Create frontend/tests/eventCategoryPresentation.test.ts with exact grouping, labels, tones and edit semantics:

~~~ts
import assert from "node:assert/strict";
import test from "node:test";

import {
  EVENT_CATEGORY_OPTIONS,
  eventCategoryLabel,
  eventCategoryTone,
  eventCategoryValueForSubmit,
  eventDisplayCategory,
} from "../utils/eventCategoryPresentation";

test("기존 6종 일정은 화면의 3종으로만 표시된다", () => {
  assert.equal(eventDisplayCategory("academic"), "academic");
  assert.equal(eventDisplayCategory("exam"), "academic");
  assert.equal(eventDisplayCategory("event"), "event");
  assert.equal(eventDisplayCategory("council"), "event");
  assert.equal(eventDisplayCategory("external"), "event");
  assert.equal(eventDisplayCategory("other"), "other");
  assert.equal(eventDisplayCategory("legacy-unknown"), "other");
  assert.equal(eventDisplayCategory(undefined), "other");
  assert.deepEqual(EVENT_CATEGORY_OPTIONS, [
    { value: "academic", label: "학사일정" },
    { value: "event", label: "행사일정" },
    { value: "other", label: "기타일정" },
  ]);
  assert.equal(eventCategoryLabel("exam"), "학사일정");
  assert.equal(eventCategoryLabel("external"), "행사일정");
  assert.equal(eventCategoryLabel("legacy-unknown"), "기타일정");
});

test("날짜별과 상세 화면은 PR 커밋의 canonical tone을 사용한다", () => {
  assert.deepEqual(eventCategoryTone("exam", "day"), {
    backgroundColor: "#E6F1FB",
    color: "#0C447C",
  });
  assert.deepEqual(eventCategoryTone("council", "day"), {
    backgroundColor: "#FBEAF0",
    color: "#993556",
  });
  assert.deepEqual(eventCategoryTone("event", "detail"), {
    backgroundColor: "#FFF0F4",
    color: "#D65B7C",
  });
  assert.deepEqual(eventCategoryTone("anything", "detail"), {
    backgroundColor: "#EDE8F6",
    color: "#4A2B7A",
  });
});

test("레거시 일정은 칩을 누르기 전 원본값, 누른 뒤 canonical 값을 저장한다", () => {
  assert.equal(eventCategoryValueForSubmit({
    originalCategory: "exam",
    selectedCategory: "academic",
    explicitlySelected: false,
  }), "exam");
  assert.equal(eventCategoryValueForSubmit({
    originalCategory: "exam",
    selectedCategory: "academic",
    explicitlySelected: true,
  }), "academic");
  assert.equal(eventCategoryValueForSubmit({
    originalCategory: null,
    selectedCategory: "event",
    explicitlySelected: false,
  }), "event");
});
~~~

- [ ] **Step 2: Run the frontend test and confirm the missing-module failure**

Run from frontend:

~~~powershell
npx tsx --test tests/eventCategoryPresentation.test.ts
~~~

Expected: FAIL because utils/eventCategoryPresentation.ts does not exist.

- [ ] **Step 3: Implement the event presentation utility**

Create frontend/utils/eventCategoryPresentation.ts:

~~~ts
export type EventDisplayCategory = "academic" | "event" | "other";
export type EventToneSurface = "day" | "detail";
export type EventCategoryTone = { backgroundColor: string; color: string };

export const EVENT_CATEGORY_OPTIONS = [
  { value: "academic", label: "학사일정" },
  { value: "event", label: "행사일정" },
  { value: "other", label: "기타일정" },
] as const;

const LABELS: Record<EventDisplayCategory, string> = {
  academic: "학사일정",
  event: "행사일정",
  other: "기타일정",
};

const TONES: Record<EventToneSurface, Record<EventDisplayCategory, EventCategoryTone>> = {
  day: {
    academic: { backgroundColor: "#E6F1FB", color: "#0C447C" },
    event: { backgroundColor: "#FBEAF0", color: "#993556" },
    other: { backgroundColor: "#EDE8F6", color: "#4A2B7A" },
  },
  detail: {
    academic: { backgroundColor: "#E6F1FB", color: "#0C447C" },
    event: { backgroundColor: "#FFF0F4", color: "#D65B7C" },
    other: { backgroundColor: "#EDE8F6", color: "#4A2B7A" },
  },
};

export function eventDisplayCategory(raw: string | null | undefined): EventDisplayCategory {
  if (raw === "academic" || raw === "exam") return "academic";
  if (raw === "event" || raw === "council" || raw === "external") return "event";
  return "other";
}

export function eventCategoryLabel(raw: string | null | undefined): string {
  return LABELS[eventDisplayCategory(raw)];
}

export function eventCategoryTone(
  raw: string | null | undefined,
  surface: EventToneSurface,
): EventCategoryTone {
  return TONES[surface][eventDisplayCategory(raw)];
}

export function eventCategoryValueForSubmit(input: {
  originalCategory: string | null;
  selectedCategory: EventDisplayCategory;
  explicitlySelected: boolean;
}): string {
  if (!input.explicitlySelected && input.originalCategory) return input.originalCategory;
  return input.selectedCategory;
}
~~~

- [ ] **Step 4: Run the frontend unit test and confirm it passes**

Run from frontend:

~~~powershell
npx tsx --test tests/eventCategoryPresentation.test.ts
~~~

Expected: 3 tests pass.

- [ ] **Step 5: Add the backend six-category compatibility test**

Create backend/tests/test_event_category_compatibility.py:

~~~py
import pytest


CATEGORIES = ("academic", "event", "exam", "council", "external", "other")


def _payload(category: str, title: str) -> dict:
    return {
        "title": title,
        "description": "기존 일정 설명",
        "location": "다산관",
        "category": category,
        "color": None,
        "start_at": "2026-09-01T09:00:00Z",
        "end_at": "2026-09-01T10:00:00Z",
    }


@pytest.mark.parametrize("category", CATEGORIES)
def test_existing_event_categories_create_update_and_read_without_422(api, category: str) -> None:
    created = api.client.post(
        "/api/events",
        headers=api.headers["admin"],
        json=_payload(category, "원본 제목"),
    )
    assert created.status_code == 200
    event_id = created.json()["data"]["id"]
    assert created.json()["data"]["category"] == category

    updated = api.client.put(
        f"/api/events/{event_id}",
        headers=api.headers["admin"],
        json=_payload(category, "제목만 수정"),
    )
    assert updated.status_code == 200
    assert updated.json()["data"]["category"] == category

    detail = api.client.get(f"/api/events/{event_id}", headers=api.headers["owner"])
    assert detail.status_code == 200
    assert detail.json()["data"]["category"] == category
~~~

- [ ] **Step 6: Run the backend compatibility test as a baseline guard**

Run from backend:

~~~powershell
.\.venv\Scripts\python.exe -m pytest tests/test_event_category_compatibility.py -q
~~~

Expected: 6 tests pass without changing backend schema, model, router or migration files.

- [ ] **Step 7: Commit the compatibility boundary**

~~~powershell
git add -- frontend/utils/eventCategoryPresentation.ts frontend/tests/eventCategoryPresentation.test.ts backend/tests/test_event_category_compatibility.py
git commit -m "test: preserve legacy event categories"
~~~

---

### Task 2: Wire the three-category design into every event surface

**Files:**

- Create: frontend/tests/eventCategoryUi.test.ts
- Modify: frontend/app/(tabs)/events/index.tsx:23-38
- Modify: frontend/app/(tabs)/events/calendar.tsx:34-66
- Modify: frontend/app/(tabs)/events/day/[date].tsx:23-60
- Modify: frontend/app/(tabs)/events/[eventId].tsx:23-90
- Modify: frontend/app/admin/index.tsx:210-217, 347-354, 1510-1517, 1785-1788, 1941-1966, 3175-3209, 3774-3778

**Interfaces:**

- Consumes: Task 1 eventDisplayCategory, eventCategoryLabel, eventCategoryTone, EVENT_CATEGORY_OPTIONS and eventCategoryValueForSubmit.
- Produces: all user-visible event labels are Korean 3-category labels; admin saves original legacy values until explicit chip selection.

- [ ] **Step 1: Write failing source-wiring tests**

Create frontend/tests/eventCategoryUi.test.ts. Read the five source files and assert:

~~~ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(path, "utf8");
const index = source("app/(tabs)/events/index.tsx");
const calendar = source("app/(tabs)/events/calendar.tsx");
const day = source("app/(tabs)/events/day/[date].tsx");
const detail = source("app/(tabs)/events/[eventId].tsx");
const admin = source("app/admin/index.tsx");

test("일정 사용자 화면은 공통 한글 presentation을 사용하고 raw fallback을 노출하지 않는다", () => {
  for (const screen of [index, calendar, day, detail]) {
    assert.match(screen, /eventCategoryLabel\(/);
    assert.doesNotMatch(screen, /\?\?\s*(?:item|event)\.category/);
  }
  assert.match(day, /eventCategoryTone\(item\.category,\s*"day"\)/);
  assert.match(detail, /eventCategoryTone\(event\.category,\s*"detail"\)/);
});

test("관리자 일정은 3개 옵션과 레거시 원본값 보존 submit을 사용한다", () => {
  assert.match(admin, /EVENT_CATEGORY_OPTIONS\.map/);
  assert.match(admin, /eventOriginalCategoryRef/);
  assert.match(admin, /eventCategoryExplicitlySelectedRef/);
  assert.match(admin, /category:\s*eventDisplayCategory\(event\.category\)/);
  assert.match(admin, /category:\s*eventCategoryValueForSubmit\(/);
  assert.match(admin, /eventCategoryExplicitlySelectedRef\.current = true/);
  assert.doesNotMatch(admin, /EVENT_CATEGORY_LABELS\[event\.category\]\s*\?\?\s*event\.category/);
});
~~~

- [ ] **Step 2: Run the UI wiring test and confirm it fails**

Run from frontend:

~~~powershell
npx tsx --test tests/eventCategoryUi.test.ts
~~~

Expected: FAIL because screens still use local maps and raw fallback.

- [ ] **Step 3: Replace local labels on the four user event screens**

Import eventCategoryLabel in index.tsx and calendar.tsx and render:

~~~tsx
<Text style={styles.categoryText}>{eventCategoryLabel(item.category)}</Text>
~~~

In day/[date].tsx use:

~~~tsx
const categoryTone = eventCategoryTone(item.category, "day");

<View style={[styles.categoryPill, { backgroundColor: categoryTone.backgroundColor }]}>
  <Text style={[styles.categoryText, { color: categoryTone.color }]}>
    {eventCategoryLabel(item.category)}
  </Text>
</View>
~~~

In [eventId].tsx use:

~~~tsx
const categoryTone = eventCategoryTone(event.category, "detail");

<Text style={[styles.categoryText, { color: categoryTone.color }]}>
  {eventCategoryLabel(event.category)}
</Text>
~~~

Remove each screen-local EVENT_CATEGORY_LABELS map and the legacy-key tone maps. Keep the PR commit’s existing static list/calendar pill styles unchanged.

- [ ] **Step 4: Add explicit legacy-category tracking to the admin form**

Import the Task 1 APIs. Add refs next to the form state:

~~~ts
const eventOriginalCategoryRef = useRef<string | null>(null);
const eventCategoryExplicitlySelectedRef = useRef(false);
~~~

When an edit event loads:

~~~ts
eventOriginalCategoryRef.current = event.category;
eventCategoryExplicitlySelectedRef.current = false;
reset({
  title: event.title,
  category: eventDisplayCategory(event.category),
  start_at: utcApiDateTimeToKoreaInput(event.start_at),
  end_at: utcApiDateTimeToKoreaInput(event.end_at),
  location: event.location ?? "",
  description: event.description ?? "",
});
~~~

Build submit category with:

~~~ts
category: eventCategoryValueForSubmit({
  originalCategory: eventOriginalCategoryRef.current,
  selectedCategory: eventDisplayCategory(values.category),
  explicitlySelected: eventCategoryExplicitlySelectedRef.current,
}),
~~~

Before every event-form reset in the missing-event, save-success, current-event-delete and new-event navigation paths, set both refs back to null/false.

- [ ] **Step 5: Render only three admin chips and mark explicit selection**

Replace Object.entries(EVENT_CATEGORY_LABELS) with:

~~~tsx
{EVENT_CATEGORY_OPTIONS.map((option) => (
  <Chip
    key={option.value}
    active={eventDisplayCategory(field.value) === option.value}
    label={option.label}
    onPress={() => {
      eventCategoryExplicitlySelectedRef.current = true;
      field.onChange(option.value);
    }}
  />
))}
~~~

Replace EventCard’s raw fallback with eventCategoryLabel(event.category).

- [ ] **Step 6: Run focused frontend and backend tests**

Run:

~~~powershell
Set-Location frontend
npx tsx --test tests/eventCategoryPresentation.test.ts tests/eventCategoryUi.test.ts tests/eventCalendar.test.ts tests/eventNavigation.test.ts
Set-Location ../backend
.\.venv\Scripts\python.exe -m pytest tests/test_event_category_compatibility.py tests/test_event_ranges.py -q
~~~

Expected: all focused tests pass; no backend application file changes.

- [ ] **Step 7: Verify protected DB and API files are unchanged**

Run from repository root:

~~~powershell
git diff --exit-code 9f151de -- backend/alembic backend/app/models/event.py backend/app/schemas/event.py backend/seed_test_data.sql
~~~

Expected: exit 0 and no output.

- [ ] **Step 8: Commit the event UI integration**

~~~powershell
git add -- frontend/tests/eventCategoryUi.test.ts 'frontend/app/(tabs)/events/index.tsx' 'frontend/app/(tabs)/events/calendar.tsx' 'frontend/app/(tabs)/events/day/[date].tsx' 'frontend/app/(tabs)/events/[eventId].tsx' frontend/app/admin/index.tsx
git commit -m "feat: present events as three compatible categories"
~~~

---

### Task 3: Apply the PR notice toast without changing other notification behavior

**Files:**

- Create: frontend/utils/notificationToastPresentation.ts
- Create: frontend/tests/notificationToastPresentation.test.ts
- Modify: frontend/components/NotificationBootstrap.tsx:1-12, 99-112, 203-244
- Modify: frontend/components/icons.tsx:460-510
- Test: frontend/tests/pr17VisualContract.test.ts

**Interfaces:**

- Produces: notificationToastKind(type: string): "notice" | "generic"
- Produces: notificationToastTop(insetTop: number): number
- Produces: NoticeToastIcon component.
- Preserves: openNotification, markRead, push registration, poll interval, web notification and current destination decisions.

- [ ] **Step 1: Write failing notification presentation tests**

Create frontend/tests/notificationToastPresentation.test.ts:

~~~ts
import assert from "node:assert/strict";
import test from "node:test";

import {
  notificationToastKind,
  notificationToastTop,
} from "../utils/notificationToastPresentation";

test("공지 알림만 공지 카드 presentation을 사용한다", () => {
  assert.equal(notificationToastKind("notice"), "notice");
  for (const type of ["comment", "like", "event", "admin_reply", "report", "council", "unknown"]) {
    assert.equal(notificationToastKind(type), "generic");
  }
});

test("토스트는 safe area 아래 8px에 배치된다", () => {
  assert.equal(notificationToastTop(0), 8);
  assert.equal(notificationToastTop(24), 32);
  assert.equal(notificationToastTop(-10), 8);
});
~~~

- [ ] **Step 2: Run the focused test and confirm missing-module failure**

~~~powershell
Set-Location frontend
npx tsx --test tests/notificationToastPresentation.test.ts
~~~

Expected: FAIL because the utility does not exist.

- [ ] **Step 3: Implement the pure notification presentation helpers**

Create frontend/utils/notificationToastPresentation.ts:

~~~ts
export type NotificationToastKind = "notice" | "generic";

export function notificationToastKind(notificationType: string): NotificationToastKind {
  return notificationType === "notice" ? "notice" : "generic";
}

export function notificationToastTop(insetTop: number): number {
  return Math.max(0, insetTop) + 8;
}
~~~

- [ ] **Step 4: Add the exact PR NoticeToastIcon**

Copy the 32x32 SVG path from commit 07da71a into frontend/components/icons.tsx as NoticeToastIcon. Keep its circle fill #E6F1FB, bell stroke #0C447C and stroke width 1.7.

- [ ] **Step 5: Refactor NotificationBootstrap to branch by type and safe area**

Import useSafeAreaInsets, NoticeToastIcon and the pure helpers. Compute:

~~~ts
const insets = useSafeAreaInsets();
const toastKind = notificationToastKind(visibleNotification.notification_type);
const top = notificationToastTop(insets.top);
~~~

Call useSafeAreaInsets unconditionally at the top of the component, but compute toastKind and top only after the existing visibleNotification null return so the notification dereference is type-safe.

For notice, use the PR card properties exactly:

~~~ts
{
  flexDirection: "row",
  alignItems: "center",
  gap: 10,
  borderRadius: 14,
  borderWidth: 0.5,
  borderColor: "#E1E4E9",
  backgroundColor: "#FFFFFF",
  paddingHorizontal: 14,
  paddingVertical: 12,
  shadowColor: "#000000",
  shadowOpacity: 0.12,
  shadowRadius: 20,
  shadowOffset: { width: 0, height: 6 },
  elevation: 8,
}
~~~

Render AI·SW 캠퍼스 at 13/16 medium, message at 13/16 regular with numberOfLines={1}, and NoticeToastIcon size 32. For generic notifications retain the current 새 알림 title and blue card meaning rather than using the notice icon.

- [ ] **Step 6: Preserve open and add a separate accessible close action**

Make the card body press call openVisibleNotification. Add a nested close Pressable:

~~~tsx
<Pressable
  accessibilityLabel="알림 닫기"
  accessibilityRole="button"
  hitSlop={10}
  onPress={(event) => {
    event.stopPropagation();
    setVisibleNotification(null);
  }}
>
  <Ionicons name="close" size={18} color="#6B7280" />
</Pressable>
~~~

The close handler must not call markRead or router. Keep openVisibleNotification unchanged.

- [ ] **Step 7: Add source assertions for type, close and safe area**

Create frontend/tests/pr17VisualContract.test.ts with notification assertions:

~~~ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const notification = readFileSync("components/NotificationBootstrap.tsx", "utf8");

test("공지 토스트 디자인은 공지에만 적용되고 닫기와 safe area를 보존한다", () => {
  assert.match(notification, /notificationToastKind\(visibleNotification\.notification_type\)/);
  assert.match(notification, /notificationToastTop\(insets\.top\)/);
  assert.match(notification, /<NoticeToastIcon size=\{32\}/);
  assert.match(notification, /accessibilityLabel="알림 닫기"/);
  assert.match(notification, /event\.stopPropagation\(\)/);
  assert.match(notification, /onPress=\{openVisibleNotification\}/);
});
~~~

- [ ] **Step 8: Run notification tests and typecheck**

~~~powershell
Set-Location frontend
npx tsx --test tests/notificationToastPresentation.test.ts tests/pr17VisualContract.test.ts
npm run typecheck
~~~

Expected: tests and typecheck pass.

- [ ] **Step 9: Confirm compose configuration remains untouched**

Run from repository root:

~~~powershell
git diff --exit-code 9f151de -- docker-compose.override.yml
~~~

Expected: exit 0 and no output.

- [ ] **Step 10: Commit the notification slice**

~~~powershell
git add -- frontend/utils/notificationToastPresentation.ts frontend/tests/notificationToastPresentation.test.ts frontend/tests/pr17VisualContract.test.ts frontend/components/NotificationBootstrap.tsx frontend/components/icons.tsx
git commit -m "feat: add safe notice notification card"
~~~

---

### Task 4: Port participation-list and activity-form styling while keeping search

**Files:**

- Modify: frontend/app/(tabs)/board/[boardId].tsx:810-860, 1092-1125, 1204-1230, 1524-1538
- Modify: frontend/app/(tabs)/board/post/create.tsx:812-838, 969-994, 1478-1505, 1713-1735, 2148-2172, 2443-2468, 2596-2630
- Modify: frontend/tests/pr17VisualContract.test.ts
- Test: frontend/tests/designBugVerification.test.ts

**Interfaces:**

- Consumes: existing board query/search and participant API without changing signatures.
- Produces: PR activity divider, app-bar and typography styling plus explicit name/student-number search copy.

- [ ] **Step 1: Add failing visual and functional source contracts**

Append to frontend/tests/pr17VisualContract.test.ts:

~~~ts
const board = readFileSync("app/(tabs)/board/[boardId].tsx", "utf8");
const create = readFileSync("app/(tabs)/board/post/create.tsx", "utf8");

test("활동 카드 디자인을 적용해도 참여활동 검색은 남는다", () => {
  assert.match(board, /isLast=\{index === posts\.length - 1\}/);
  assert.match(board, /activityCardLast:[\s\S]*borderBottomWidth: 0/);
  assert.match(board, /accessibilityLabel="검색"[\s\S]*setShowSearch\(true\)/);
  assert.doesNotMatch(board, /isActivityCards \|\| isParticipationGuideCards \|\| isStudyRecruit[\s\S]*?<View style=\{styles\.iconButton\}/);
});

test("활동 인증 폼은 PR 스타일과 이름·학번 검색 기능을 함께 표시한다", () => {
  assert.match(create, /isActivity \? styles\.appBarNoDivider : null/);
  assert.match(create, /appBarNoDivider:[\s\S]*borderBottomWidth: 0/);
  assert.match(create, /placeholder="이름 또는 학번으로 검색"/);
  assert.match(create, /accessibilityLabel="이름 또는 학번으로 검색"/);
  assert.match(create, /attachExtensionHint:[\s\S]*fontSize: 12[\s\S]*lineHeight: 15/);
  assert.match(create, /input:[\s\S]*fontSize: 14[\s\S]*lineHeight: 17/);
});
~~~

- [ ] **Step 2: Run the visual contract and confirm the new assertions fail**

~~~powershell
Set-Location frontend
npx tsx --test tests/pr17VisualContract.test.ts
~~~

Expected: FAIL on last-card and app-bar/hint assertions while the current search assertions pass.

- [ ] **Step 3: Apply the activity-card last-divider change only**

Add optional isLast to ActivityTile, render:

~~~tsx
<Pressable
  onPress={() => onPress(post.id)}
  style={[styles.activityCard, isLast ? styles.activityCardLast : null]}
>
~~~

Pass isLast={index === posts.length - 1} and add:

~~~ts
activityCardLast: {
  borderBottomWidth: 0,
},
~~~

Do not add the PR condition that replaces the participation/activity/study search icon with a spacer.

- [ ] **Step 4: Apply the activity-form visual properties**

Use the PR properties:

~~~tsx
<View style={[
  styles.appBar,
  isActivity ? styles.appBarNoDivider : null,
  { paddingTop: Math.max(insets.top, 10) },
]}>
~~~

Add appBarNoDivider borderBottomWidth 0, appBarTitle lineHeight 22, input lineHeight 17 and attachExtensionHint at 12/15 #A6ACB7. Keep the attachment choices and representative-image branch structurally identical to main.

- [ ] **Step 5: Preserve and clarify participant search**

Keep placeholder exactly 이름 또는 학번으로 검색 and add the same accessibilityLabel:

~~~tsx
<TextInput
  accessibilityLabel="이름 또는 학번으로 검색"
  placeholder="이름 또는 학번으로 검색"
  onChangeText={setParticipantQuery}
  value={participantQuery}
/>
~~~

Do not modify the participant query API, selectedParticipants or metadata payload.

- [ ] **Step 6: Run activity, visual and design regression tests**

~~~powershell
Set-Location frontend
npx tsx --test tests/activityCertification.test.ts tests/pr17VisualContract.test.ts tests/designBugVerification.test.ts
npm run typecheck
~~~

Expected: all tests and typecheck pass.

- [ ] **Step 7: Commit the participation list/form slice**

~~~powershell
git add -- 'frontend/app/(tabs)/board/[boardId].tsx' 'frontend/app/(tabs)/board/post/create.tsx' frontend/tests/pr17VisualContract.test.ts
git commit -m "fix: preserve participation search in PR styling"
~~~

---

### Task 5: Resolve post-detail media conflicts with the PR layout

**Files:**

- Modify: frontend/app/(tabs)/board/post/[postId].tsx:1-15, 388-390, 564-735, 780-870, 893-905, 1598-1658, 1901-2005
- Modify: frontend/components/icons.tsx
- Modify: frontend/tests/pr17VisualContract.test.ts
- Test: frontend/tests/designBugVerification.test.ts
- Test: frontend/tests/postDetailImagePresentation.test.ts

**Interfaces:**

- Consumes: existing ExpandableNaturalAspectMediaImage, NaturalAspectMediaImage, MediaImage and postDetailImagePresentation.
- Produces: visualHeroSection rendered once in PR order, ImagePlaceholderIcon and CouncilReplyIcon.
- Preserves: main’s 360px notice attachment fold/expand path and 600px common hero preview constant.

- [ ] **Step 1: Add failing hybrid-resolution contracts**

Append:

~~~ts
const detail = readFileSync("app/(tabs)/board/post/[postId].tsx", "utf8");

test("참여활동 상세는 PR 순서와 main 이미지 정책을 혼합한다", () => {
  assert.match(detail, /const visualHeroSection =/);
  assert.match(detail, /\{!isAdminParticipationGuide \? visualHeroSection : null\}/);
  assert.match(detail, /\{isAdminParticipationGuide \? visualHeroSection : null\}/);
  assert.match(detail, /const hasExpandableHero = isAdminParticipationGuide;/);
  assert.match(detail, /isPhotoAlbum \? styles\.visualHeroAlbum : null/);
  assert.doesNotMatch(detail, /function ParticipationHeroImage/);
  assert.doesNotMatch(detail, /isPhotoAlbum \|\| isActivityCertification \? styles\.visualHeroAlbum : null/);
});

test("공지 이미지 전체보기와 PR 첨부 타이포를 함께 유지한다", () => {
  assert.match(detail, /사진 전체보기/);
  assert.match(detail, /noticeImageAttachment:[\s\S]*height: 360/);
  assert.match(detail, /attachmentsList:[\s\S]*gap: 12/);
  assert.match(detail, /fileName:[\s\S]*fontSize: 13[\s\S]*lineHeight: 16/);
});

test("공식 답변과 빈 대표 이미지는 벡터 아이콘을 사용한다", () => {
  assert.match(detail, /<ImagePlaceholderIcon size=\{36\}/);
  assert.match(detail, /<CouncilReplyIcon/);
  assert.doesNotMatch(detail, /council-reply\.png/);
});
~~~

- [ ] **Step 2: Run focused tests and confirm the layout-order assertions fail**

~~~powershell
Set-Location frontend
npx tsx --test tests/pr17VisualContract.test.ts tests/postDetailImagePresentation.test.ts tests/designBugVerification.test.ts
~~~

Expected: the new visualHeroSection ordering and vector-icon assertions fail; existing image-policy tests pass.

- [ ] **Step 3: Add ImagePlaceholderIcon and CouncilReplyIcon**

Copy the PR SVG geometry from commit 07da71a into frontend/components/icons.tsx. Use ImagePlaceholderIcon default 36/#999999 and CouncilReplyIcon default 15/#2761FF. Do not add frontend/assets/images/council-reply.png.

- [ ] **Step 4: Extract the hero into one reusable JSX value**

Immediately before return, create visualHeroSection with this outer structure and media branch:

~~~tsx
const visualHeroSection = hasVisualHero ? (
  <View style={[
    styles.visualHeroBlock,
    isAdminParticipationGuide ? styles.visualHeroBlockInset : null,
  ]}>
    <View style={[
      hasNaturalHero ? styles.visualHeroNatural : styles.visualHero,
      isPhotoAlbum ? styles.visualHeroAlbum : null,
    ]}>
      {heroAttachment ? (
        hasNaturalHero ? (
          hasExpandableHero ? (
            <ExpandableNaturalAspectMediaImage
              key={heroAttachment.id}
              media={heroAttachment}
              style={styles.visualHeroNaturalImage}
            />
          ) : (
            <NaturalAspectMediaImage
              key={heroAttachment.id}
              media={heroAttachment}
              style={styles.visualHeroNaturalImage}
            />
          )
        ) : (
          <MediaImage
            media={heroAttachment}
            resizeMode={heroImagePresentation === "fixed-contain" ? "contain" : "cover"}
            style={styles.visualHeroImage}
          />
        )
      ) : isAdminParticipationGuide ? (
        <View style={styles.participationHeroPlaceholder}>
          <ImagePlaceholderIcon size={36} />
        </View>
      ) : (
        <LinearGradient
          colors={
            board?.board_type === "album"
              ? ALBUM_FALLBACK_GRADIENTS[
                  normalizedGalleryIndex % ALBUM_FALLBACK_GRADIENTS.length
                ]
              : ["#2761FF", "#86C8FF"]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.visualHeroFallback,
            hasNaturalHero ? styles.visualHeroFallbackNatural : null,
          ]}
        />
      )}
    </View>
  </View>
) : null;
~~~

Before closing the inner View, move the current board album/activity/council gallery controls, including both arrow Pressables and the non-photo-album n/N counter, byte-for-byte from the original inline hero. After the inner View, move the current photo-album thumbnail ScrollView, including fallback gradients and setGalleryIndex, byte-for-byte. This is a relocation only: the conditions board?.board_type === "album" || isActivityCertification || isCouncilActivityEntry and board?.board_type === "album" && imageAttachments.length > 1 must not change.

- [ ] **Step 5: Place the extracted hero in PR order without duplication**

At the ScrollView start render {!isAdminParticipationGuide ? visualHeroSection : null}. After participation heading/title and before its body render {isAdminParticipationGuide ? visualHeroSection : null}. Remove the original inline hero block.

Keep:

~~~ts
const hasExpandableHero = isAdminParticipationGuide;
~~~

Do not import Image/useMediaAccessUrl or create ParticipationHeroImage.

- [ ] **Step 6: Apply only safe PR detail styles**

Add visualHeroBlockInset marginTop 14, marginBottom 16, radius 12 and overflow hidden. Add the 4:3 placeholder background #F1F0E8. Change attachmentsList gap from 10 to 12 and fileName lineHeight to 16. Use CouncilReplyIcon in the official reply title row.

Keep noticeImageAttachment height 360, noticeImageFade, noticeImageExpandButton, expandedImages state and NaturalAspectMediaImage. Do not apply the PR 400px cover-only branch.

- [ ] **Step 7: Run the complete image and visual regression set**

~~~powershell
Set-Location frontend
npx tsx --test tests/pr17VisualContract.test.ts tests/postDetailImagePresentation.test.ts tests/designBugVerification.test.ts tests/naturalImagePreview.test.ts tests/imageDimensions.test.ts tests/legacyMediaDisplay.test.ts
npm run typecheck
~~~

Expected: all focused tests and typecheck pass.

- [ ] **Step 8: Commit the post-detail conflict resolution**

~~~powershell
git add -- 'frontend/app/(tabs)/board/post/[postId].tsx' frontend/components/icons.tsx frontend/tests/pr17VisualContract.test.ts
git commit -m "fix: merge PR detail layout without media regressions"
~~~

---

### Task 6: Apply the remaining font and notice-list changes

**Files:**

- Modify: frontend/utils/fonts.ts:19-95
- Modify: frontend/app/(tabs)/notices.tsx:110-145
- Modify: frontend/tests/designBugVerification.test.ts:20-28
- Modify: frontend/tests/pr17VisualContract.test.ts

**Interfaces:**

- Produces: applyWebFontSmoothing(): void internal helper.
- Preserves: notice search, four filters and selectNoticeFilterAndRefresh behavior.

- [ ] **Step 1: Add failing font and notice source assertions**

Append:

~~~ts
const fonts = readFileSync("utils/fonts.ts", "utf8");
const notices = readFileSync("app/(tabs)/notices.tsx", "utf8");

test("웹 폰트는 PR smoothing과 faux-bold 방지를 사용한다", () => {
  assert.match(fonts, /font-smoothing-patch/);
  assert.match(fonts, /-webkit-font-smoothing:antialiased/);
  assert.match(fonts, /fontFamily, fontWeight: "normal"/);
});

test("공지 목록 정리 후에도 검색과 네 필터 새로고침이 남는다", () => {
  assert.match(notices, /router\.push\("\/search\?scope=notices"/);
  assert.match(notices, /NOTICE_FILTERS\.map/);
  assert.match(notices, /selectNoticeFilterAndRefresh/);
});
~~~

- [ ] **Step 2: Run the visual contract and confirm font assertions fail**

~~~powershell
Set-Location frontend
npx tsx --test tests/pr17VisualContract.test.ts
~~~

Expected: font smoothing assertions fail.

- [ ] **Step 3: Apply the PR font patch exactly**

Add applyWebFontSmoothing before patchDefaultFontFamily:

~~~ts
function applyWebFontSmoothing(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById("font-smoothing-patch")) return;
  const style = document.createElement("style");
  style.id = "font-smoothing-patch";
  style.textContent = "*{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;}";
  document.head.appendChild(style);
}
~~~

Call it once in patchDefaultFontFamily. Change cloned host style to:

~~~ts
{ ...hostStyle, fontFamily, fontWeight: "normal" }
~~~

Do not change WEIGHT_TO_FAMILY or explicit-fontFamily bypass.

- [ ] **Step 4: Apply the render-neutral notice app-bar cleanup**

Remove the dead commented back-button JSX from notices.tsx and retain a single left spacer View. Do not alter the search IconButton, NOTICE_FILTERS map, list query or refresh handler.

- [ ] **Step 5: Update the existing font regression assertion**

In designBugVerification.test.ts assert the new host style:

~~~ts
assert.match(fontSource, /style: \{ \.\.\.hostStyle, fontFamily, fontWeight: "normal" \}/);
~~~

Keep the assertions that reject StyleSheet arrays reaching React DOM.

- [ ] **Step 6: Run font, notice and full frontend tests**

~~~powershell
Set-Location frontend
npx tsx --test tests/pr17VisualContract.test.ts tests/designBugVerification.test.ts tests/noticeFeed.test.ts
npm test
npm run typecheck
npm run lint
~~~

Expected: all tests/typecheck pass and lint has zero errors; record any existing warnings separately.

- [ ] **Step 7: Commit the final visual-code slice**

~~~powershell
git add -- frontend/utils/fonts.ts 'frontend/app/(tabs)/notices.tsx' frontend/tests/designBugVerification.test.ts frontend/tests/pr17VisualContract.test.ts
git commit -m "fix: align PR fonts and notice chrome"
~~~

---

### Task 7: Verify the whole repository and record visual fidelity

**Files:**

- Create: docs/qa/PR17_FUNCTIONAL_SAFE_INTEGRATION.md
- Modify: CODEX.md

**Interfaces:**

- Consumes: all prior tasks and the approved spec.
- Produces: reproducible automated evidence, protected-file diff evidence and screen-by-screen PR comparison.

- [ ] **Step 1: Run backend full verification**

From backend:

~~~powershell
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\python.exe -m compileall app
~~~

Expected: the full suite passes with the existing intentional skip/warnings recorded; compileall exits 0.

- [ ] **Step 2: Run frontend full verification**

From frontend:

~~~powershell
npm test
npm run typecheck
npm run lint
npm run doctor
npm run export:web
$pr17ExportDir = Join-Path ([System.IO.Path]::GetTempPath()) ("aisw-pr17-export-" + [guid]::NewGuid())
npx expo export --platform all --output-dir $pr17ExportDir
~~~

Expected: tests/typecheck pass, lint has zero errors, Doctor reports 17/17 and web/all-platform exports succeed.

- [ ] **Step 3: Verify forbidden files and PR-only assets are absent**

From repository root:

~~~powershell
git diff --exit-code 9f151de -- backend/alembic backend/app/models/event.py backend/app/schemas/event.py backend/seed_test_data.sql docker-compose.override.yml
git diff --name-only 9f151de | Select-String '0027_event_category_cleanup|council-reply.png'
git diff --check
~~~

Expected: the first and third commands exit 0; Select-String returns no matching path.

- [ ] **Step 4: Verify the two user-provided screen families**

Use the same seeded data and a 320px content viewport. Compare against the supplied images and PR commit:

1. 공지사항 목록: 전체/학사공지/행사공지/기타공지, search icon and row dividers remain.
2. 홈 공지사항: 학사공지/행사공지/기타공지 labels remain and no 일정 label leaks in.
3. 홈 서강생활 일정: category codes remain hidden and the existing calendar data, selected date and detail navigation behavior do not change.
4. 일정 list/calendar/day/detail: only 학사일정/행사일정/기타일정 labels appear.
5. 관리자 일정 edit: exam shows 학사일정 selected, council/external show 행사일정 selected, title-only save returns 200 and preserves raw category.

Capture the rendered results in the Codex browser panel for final user review.

- [ ] **Step 5: Verify the remaining PR visual surfaces**

Compare exact spacing/radius/divider/icon/font properties for:

1. 공지 notice toast and a non-notice generic toast.
2. 동아리 안내 list/detail.
3. 활동 인증 list/detail/create with name and student-number search.
4. 스터디 모집 list with search.
5. 가로, 일반 세로 and 긴 세로 notice images with 사진 전체보기.
6. 원우회 공식 답변 block.

Approved differences from PR are the preserved search icons, 이름 또는 학번으로 검색 copy, image full-view controls, notification close control and safe-area offset.

- [ ] **Step 6: Write the QA evidence document**

Create docs/qa/PR17_FUNCTIONAL_SAFE_INTEGRATION.md containing:

~~~markdown
# PR #17 Functional-Safe Integration Verification

## Baselines

- Functional/data baseline: 9f151de30286d346c5f6a70ab4a64375c9ac2f7b
- Event visual baseline: 067e4d989470a05756ad5897481794cdb07d9187
- Notice/participation visual baseline: 07da71a5559cf59fb91248d7cbf3c9ac6a41ef80

## Data safety

- Alembic/model/schema/seed diff: PASS, no changes
- Legacy categories create/update/read: PASS for academic/event/exam/council/external/other
- Legacy title-only edit: PASS, raw category retained

## Automated verification

Record the exact backend pass/skip/warning counts, frontend pass count, typecheck, lint error/warning counts, Expo Doctor result and export targets from Steps 1-2.

## Visual verification

Record PASS/FAIL and one sentence of evidence for every screen in Steps 4-5. Mark search, full-view, close and safe-area differences as approved functional exceptions rather than design misses.

## Deferred

- Physical-device checks not executed in this workspace are explicitly listed.
- The pre-existing adaptive-image 500px specification versus 600px runtime difference remains unchanged.
~~~

Do not claim PASS for a command or screen that was not actually verified.

- [ ] **Step 7: Update CODEX.md**

Add one completed Phase 4 integration bullet that states:

~~~markdown
- Integrated PR #17's schedule, notification, notice, and participation visuals onto the latest main without its irreversible event migration or three-value backend schema restriction. Existing six-value event data and title-only edits remain compatible; user-facing schedules normalize to three Korean labels, while search, participant name/student-number lookup, natural/expandable media, galleries, comments, attachments, admin CRUD, and navigation remain available. Verification evidence is recorded in docs/qa/PR17_FUNCTIONAL_SAFE_INTEGRATION.md.
~~~

- [ ] **Step 8: Commit verification evidence**

~~~powershell
git add -- docs/qa/PR17_FUNCTIONAL_SAFE_INTEGRATION.md CODEX.md
git commit -m "docs: verify functional-safe PR 17 integration"
~~~

- [ ] **Step 9: Review the final branch diff**

Run:

~~~powershell
git status --short --branch
git diff --stat 9f151de...HEAD
git log --oneline 9f151de..HEAD
~~~

Expected: only the user’s pre-existing untracked files remain outside the branch commits; implementation commits are separated by event, notification, participation, post detail, fonts/notices and verification.
