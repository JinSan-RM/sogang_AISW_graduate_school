import assert from "node:assert/strict";
import test from "node:test";

import { notificationToastTop } from "../utils/notificationToastPresentation";

test("토스트는 safe area 아래 8px에 배치된다", () => {
  assert.equal(notificationToastTop(0), 8);
  assert.equal(notificationToastTop(24), 32);
  assert.equal(notificationToastTop(-10), 8);
});
