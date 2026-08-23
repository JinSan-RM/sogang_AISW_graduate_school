import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const homeSource = readFileSync("app/(tabs)/home.tsx", "utf8");

test("홈 공지는 단일 슬러그 대신 모든 활성 공지 게시판의 최신 두 개를 사용한다", () => {
  assert.match(homeSource, /useAllMultiBoardPosts/);
  assert.match(homeSource, /boards\.filter\(isNoticeContentBoard\)/);
  assert.match(homeSource, /useAllMultiBoardPosts\(noticeBoardIds, \{ sort: "latest" \}\)/);
  assert.match(homeSource, /homeNoticePosts\(noticesQuery\.data \?\? \[\], noticeBoards\)/);
  assert.match(homeSource, /boards=\{noticeBoards\}/);
  assert.match(homeSource, /homeNoticeCategory\(post, boardById\.get\(post\.board_id\)\)/);
  assert.doesNotMatch(homeSource, /NOTICE_BOARD_SLUGS/);
  assert.doesNotMatch(homeSource, /postApi\.getPosts\(noticeBoardId/);
  assert.doesNotMatch(homeSource, /function noticeCategoryLabel/);
  assert.doesNotMatch(homeSource, /noticeCategoryLabel\(post\.category\)/);
});

test("#186 홈 공지사항 더보기는 이전 필터와 무관하게 전체 공지 루트를 연다", () => {
  assert.match(
    homeSource,
    /<SectionHeader\s+title="공지사항"[\s\S]*?requestTabRootReset\("notices"\)[\s\S]*?router\.navigate\(NOTICES_TAB_ROUTE as never\)[\s\S]*?\/>/,
  );
});
