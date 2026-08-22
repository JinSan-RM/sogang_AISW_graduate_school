import assert from "node:assert/strict";
import test from "node:test";

import {
  formatBoardDate,
  formatBoardDateTime,
  formatHomeScheduleDate,
  formatKoreanTime,
  formatRelativeTime,
  formatShortDate,
  formatTime24,
  koreaDateTimeInputToUtcISOString,
  utcApiDateTimeToKoreaInput,
} from "../utils/dateFormat";

test("게시판 날짜를 한국 시간 기준 YY.MM.DD(요일)로 표시한다", () => {
  assert.equal(formatBoardDate("2026-06-25T16:00:00Z"), "26.06.26(금)");
  assert.equal(formatBoardDate("2026-06-26T00:00:00"), "26.06.26(금)");
});

test("날짜 전용 API 값과 작성 폼 저장값은 날짜를 이동시키지 않는다", () => {
  assert.equal(formatBoardDate("2026-06-26"), "26.06.26(금)");
  assert.equal(formatBoardDate("2026.06.26"), "26.06.26(금)");
  assert.equal(formatBoardDate("26.06.26"), "26.06.26(금)");
});

test("알림 예외 형식은 요일 없이 YY.MM.DD를 사용한다", () => {
  assert.equal(formatShortDate("2026-06-26"), "26.06.26");
  assert.equal(formatKoreanTime("2026-06-25T16:32:00Z"), "오전 1:32");
});

test("일정 화면은 선택일, 시각, 상세 메타데이터 형식을 구분한다", () => {
  assert.equal(formatBoardDateTime("2026-06-26T09:00:00Z"), "26.06.26(금) · 18:00");
  assert.equal(formatTime24("2026-06-26T09:00:00Z"), "18:00");
  assert.equal(formatHomeScheduleDate("2026-06-26T09:00:00Z"), "06.26(금)");
});

test("관리자 일정 입력은 한국시간으로 해석해 UTC API 값으로 저장한다", () => {
  assert.equal(
    koreaDateTimeInputToUtcISOString("2026-08-19T18:00"),
    "2026-08-19T09:00:00.000Z",
  );
  assert.equal(
    koreaDateTimeInputToUtcISOString("2026-01-01T00:30"),
    "2025-12-31T15:30:00.000Z",
  );
});

test("UTC 일정 값은 관리자 수정 폼의 동일한 한국시간으로 복원한다", () => {
  assert.equal(utcApiDateTimeToKoreaInput("2026-08-19T09:00:00Z"), "2026-08-19T18:00");
  assert.equal(utcApiDateTimeToKoreaInput("2026-08-19T09:00:00"), "2026-08-19T18:00");
  assert.equal(utcApiDateTimeToKoreaInput("2025-12-31T15:30:00Z"), "2026-01-01T00:30");
});

test("관리자 일정 입력은 존재하지 않는 한국 날짜와 시간을 거부한다", () => {
  assert.equal(koreaDateTimeInputToUtcISOString("2026-02-30T09:00"), null);
  assert.equal(koreaDateTimeInputToUtcISOString("2026-08-19T24:00"), null);
  assert.equal(koreaDateTimeInputToUtcISOString(""), null);
});

test("댓글 보조 시간은 1시간 미만만 상대 시간, 이후에는 한국 시간 시각을 사용한다", () => {
  const now = Date.parse("2026-06-26T00:10:00Z");
  assert.equal(formatRelativeTime("2026-06-26T00:00:00Z", now), "10분 전");
  assert.equal(formatRelativeTime("2026-06-25T22:00:00Z", now), "07:00");
  assert.equal(formatRelativeTime("2026-06-10T21:30:00Z", now), "06:30");
});

test("비어 있거나 해석할 수 없는 날짜는 안전하게 처리한다", () => {
  assert.equal(formatBoardDate(undefined), "");
  assert.equal(formatBoardDate("알 수 없음"), "알 수 없음");
});
