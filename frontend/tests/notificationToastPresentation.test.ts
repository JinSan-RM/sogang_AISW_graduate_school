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
