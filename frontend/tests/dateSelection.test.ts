import assert from "node:assert/strict";
import test from "node:test";

import {
  calendarMonthFromDotDate,
  formatDotDate,
  isMutualAidEventDateAllowed,
  minimumMutualAidEventDate,
} from "../utils/dateSelection";

test("달력에서 선택한 활동일을 점 구분 날짜로 저장한다", () => {
  assert.equal(formatDotDate(new Date(2026, 6, 30, 12)), "2026.07.30");
});

test("선택한 활동일의 월을 열고 잘못된 날짜는 현재 월로 대체한다", () => {
  const fallback = new Date(2026, 7, 2, 12);

  assert.deepEqual(calendarMonthFromDotDate("2026.07.30", fallback), { year: 2026, monthIndex: 6 });
  assert.deepEqual(calendarMonthFromDotDate("2026.02.30", fallback), { year: 2026, monthIndex: 7 });
  assert.deepEqual(calendarMonthFromDotDate(undefined, fallback), { year: 2026, monthIndex: 7 });
});

test("상조회 최소 신청일은 한국시간 기준 오늘의 이틀 뒤다", () => {
  assert.equal(minimumMutualAidEventDate(new Date("2026-08-01T14:59:59Z")), "2026.08.03");
  assert.equal(minimumMutualAidEventDate(new Date("2026-08-01T15:00:00Z")), "2026.08.04");
});

test("상조회 신청일은 D+1까지 거부하고 D+2부터 허용한다", () => {
  const now = new Date("2026-08-01T15:00:00Z");

  assert.equal(isMutualAidEventDateAllowed("2026.08.03", now), false);
  assert.equal(isMutualAidEventDateAllowed("2026.08.04", now), true);
  assert.equal(isMutualAidEventDateAllowed("2026.08.05", now), true);
});

test("상조회 최소 신청일 계산은 월말·연말·윤년을 넘겨도 정확하다", () => {
  assert.equal(minimumMutualAidEventDate(new Date("2026-08-30T15:00:00Z")), "2026.09.02");
  assert.equal(minimumMutualAidEventDate(new Date("2026-12-30T15:00:00Z")), "2027.01.02");
  assert.equal(minimumMutualAidEventDate(new Date("2028-02-27T15:00:00Z")), "2028.03.01");
});

test("상조회 신청일의 잘못된 형식과 존재하지 않는 날짜를 거부한다", () => {
  const now = new Date("2026-08-01T15:00:00Z");

  assert.equal(isMutualAidEventDateAllowed("2026-08-04", now), false);
  assert.equal(isMutualAidEventDateAllowed("2026.02.30", now), false);
  assert.equal(isMutualAidEventDateAllowed(undefined, now), false);
});
