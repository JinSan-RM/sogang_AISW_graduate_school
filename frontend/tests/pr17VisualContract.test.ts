import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const notification = readFileSync("components/NotificationBootstrap.tsx", "utf8");
const board = readFileSync("app/(tabs)/board/[boardId].tsx", "utf8");
const create = readFileSync("app/(tabs)/board/post/create.tsx", "utf8");

test("공지 토스트 디자인은 공지에만 적용되고 닫기와 safe area를 보존한다", () => {
  assert.match(notification, /notificationToastKind\(visibleNotification\.notification_type\)/);
  assert.match(notification, /notificationToastTop\(insets\.top\)/);
  assert.match(notification, /<NoticeToastIcon size=\{32\}/);
  assert.match(notification, /accessibilityLabel="알림 닫기"/);
  assert.match(notification, /event\.stopPropagation\(\)/);
  assert.match(notification, /onPress=\{openVisibleNotification\}/);
});

test("메시지 한 줄 제한은 공지 토스트에만 적용된다", () => {
  assert.match(notification, /isNotice \? \(\s*<Text numberOfLines=\{1\}/);
  assert.match(notification, /:\s*\(\s*<Text(?![^>]*numberOfLines)/);
});

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
