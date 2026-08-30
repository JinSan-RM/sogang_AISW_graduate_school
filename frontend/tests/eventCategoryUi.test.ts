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
