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
