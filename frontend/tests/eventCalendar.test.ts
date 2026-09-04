import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import type { EventItem } from "../types";
import {
  calendarMonthRange,
  eventDaysForMonth,
  eventIsCurrentOrUpcoming,
  eventOccursOnCalendarDate,
  shiftCalendarMonth,
} from "../utils/eventCalendar";

function event(start_at: string, end_at?: string): EventItem {
  return {
    id: 1,
    title: "일정",
    category: "event",
    start_at,
    end_at,
    created_at: start_at,
    updated_at: start_at,
  };
}

test("홈 달력 월 이동은 표시 월과 API 조회 범위만 변경한다", () => {
  const july = new Date(2026, 6, 1);
  const august = shiftCalendarMonth(july, 1);
  assert.equal(august.getFullYear(), 2026);
  assert.equal(august.getMonth(), 7);
  assert.deepEqual(calendarMonthRange(august), { start: "2026-08-01", end: "2026-08-31" });
});

test("다일 일정은 KST 기준 시작일부터 종료일까지 모든 날짜에 표시한다", () => {
  const multiDay = event("2026-07-30T15:00:00Z", "2026-08-02T14:59:59Z");
  assert.deepEqual([...eventDaysForMonth([multiDay], new Date(2026, 6, 1))], [31]);
  assert.deepEqual([...eventDaysForMonth([multiDay], new Date(2026, 7, 1))], [1, 2]);
});

test("종료일은 포함하고 종료일이 없는 일정은 시작일에만 표시한다", () => {
  const multiDay = event("2026-08-01T00:00:00Z", "2026-08-03T00:00:00Z");
  const singleDay = event("2026-08-04T00:00:00Z");
  assert.equal(eventOccursOnCalendarDate(multiDay, { year: 2026, month: 8, day: 3 }), true);
  assert.equal(eventOccursOnCalendarDate(multiDay, { year: 2026, month: 8, day: 4 }), false);
  assert.deepEqual([...eventDaysForMonth([singleDay], new Date(2026, 7, 1))], [4]);
});

test("오늘 진행 중인 다일 일정도 예정 일정 후보에 포함한다", () => {
  const now = new Date("2026-08-02T00:00:00Z");
  assert.equal(eventIsCurrentOrUpcoming(event("2026-08-01T00:00:00Z", "2026-08-02T14:59:59Z"), now), true);
  assert.equal(eventIsCurrentOrUpcoming(event("2026-07-30T00:00:00Z", "2026-08-01T14:59:59Z"), now), false);
});

test("홈 화살표와 빈 일정 영역은 다른 일정 페이지로 이동하지 않는다", () => {
  const homeSource = readFileSync("app/(tabs)/home.tsx", "utf8");
  assert.doesNotMatch(homeSource, /router\.push\("\/events\/calendar"/);
  assert.match(homeSource, /onPress=\{\(\) => onChangeMonth\(-1\)\}/);
  assert.match(homeSource, /onPress=\{\(\) => onChangeMonth\(1\)\}/);
  assert.match(homeSource, /from_date: monthRange\.start, to_date: monthRange\.end/);
  assert.match(homeSource, /<View accessibilityLabel="예정된 일정이 없습니다" style=\{styles\.nextEvent\}>/);
});
