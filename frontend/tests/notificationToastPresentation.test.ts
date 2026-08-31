import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const notification = readFileSync("components/NotificationBootstrap.tsx", "utf8");

test("토스트는 PR 원본처럼 화면 상단 8px에 고정된다", () => {
  assert.match(notification, /position: "absolute",\s*top: 8,/);
  assert.doesNotMatch(notification, /useSafeAreaInsets|notificationToastTop/);
});
