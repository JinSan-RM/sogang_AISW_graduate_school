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
  assert.match(notification, /<Pressable\s+accessibilityRole="button"\s+onPress=\{openVisibleNotification\}/);
  assert.match(notification, /accessibilityLabel="알림 닫기"/);
  const closeHandler = notification.match(/accessibilityLabel="알림 닫기"[\s\S]*?onPress=\{\(event\) => \{([\s\S]*?)\n        \}\}/)?.[1] ?? "";
  assert.match(closeHandler, /^\s*event\.stopPropagation\(\);\s*setVisibleNotification\(null\);\s*$/);
  assert.match(notification, /onPress=\{openVisibleNotification\}/);
});

test("공지 토스트만 2px 텍스트 간격과 muted 한 줄 메시지를 사용하고 일반 토스트는 기존 레이아웃을 보존한다", () => {
  assert.match(notification, /<View style=\{\{ flex: 1, gap: isNotice \? 2 : 0 \}\}>/);
  assert.match(notification, /isNotice \? \(\s*<Text numberOfLines=\{1\} style=\{\{ color: "#6B7280", fontSize: 13, lineHeight: 16, fontWeight: "400" \}\}>/);
  assert.match(notification, /:\s*\(\s*<Text style=\{\{ color: "#111827", marginTop: 4, fontSize: 13, lineHeight: 16, fontWeight: "700" \}\}>/);
  assert.doesNotMatch(notification, /:\s*\(\s*<Text numberOfLines=/);
});

test("활동 카드 디자인을 적용해도 참여활동 검색은 남는다", () => {
  assert.match(board, /function ActivityTile[\s\S]*?<Pressable onPress=\{\(\) => onPress\(post\.id\)\} style=\{\[styles\.activityCard, isLast \? styles\.activityCardLast : null\]\}>/);
  assert.match(board, /<ActivityTile post=\{item\} boardSlug=\{itemBoard\?\.slug \?\? board\?\.slug\} index=\{index\} isLast=\{index === posts\.length - 1\} onPress=/);
  assert.match(board, /activityCardLast:[\s\S]*borderBottomWidth: 0/);
  assert.match(board, /accessibilityLabel="검색"[\s\S]*setShowSearch\(true\)/);
  assert.doesNotMatch(board, /isActivityCards \|\| isParticipationGuideCards \|\| isStudyRecruit[\s\S]*?<View style=\{styles\.iconButton\}/);
});

test("활동 인증 폼은 PR 스타일과 이름·학번 검색 기능을 함께 표시한다", () => {
  assert.match(create, /isActivity \? styles\.appBarNoDivider : null/);
  assert.match(create, /appBarNoDivider:[\s\S]*borderBottomWidth: 0/);
  assert.match(create, /appBarTitle:[\s\S]*fontSize: 18,[\s\S]*fontWeight: "500",[\s\S]*lineHeight: 22/);
  assert.match(create, /placeholder="이름 또는 학번으로 검색"/);
  assert.match(create, /accessibilityLabel="이름 또는 학번으로 검색"/);
  assert.match(create, /attachExtensionHint:[\s\S]*fontSize: 12[\s\S]*lineHeight: 15/);
  assert.match(create, /<Text style=\{styles\.activityPhotoText\}>\s*\{isUploading \? "업로드 중" : "활동 사진을 추가해주세요"\}\s*<\/Text>/);
  assert.match(create, /activityPhotoText:[\s\S]*color: "#A6ACB7",[\s\S]*fontSize: 13,[\s\S]*fontWeight: "400",[\s\S]*lineHeight: 16/);
  assert.match(create, /!isAdminParticipationPost \? \(\s*<>\s*<View style=\{styles\.compactAttachActions\}>[\s\S]*?<\/View>\s*<Text style=\{styles\.attachExtensionHint\}>이미지: JPG, PNG \| 파일: PDF, DOCX<\/Text>/);
  assert.match(create, /input:[\s\S]*fontSize: 14[\s\S]*lineHeight: 17/);
});

const detail = readFileSync("app/(tabs)/board/post/[postId].tsx", "utf8");

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
