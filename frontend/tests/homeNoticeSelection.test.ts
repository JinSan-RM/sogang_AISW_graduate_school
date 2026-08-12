import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const homeSource = readFileSync("app/(tabs)/home.tsx", "utf8");

test("홈 공지는 단일 슬러그 대신 모든 활성 공지 게시판의 최신 두 개를 사용한다", () => {
  assert.match(homeSource, /useMultiBoardPosts/);
  assert.match(homeSource, /boards\.filter\(isNoticeContentBoard\)/);
  assert.match(homeSource, /useMultiBoardPosts\(noticeBoardIds, \{ sort: "latest" \}\)/);
  assert.match(homeSource, /homeNoticePosts\(noticesQuery\.data \?\? \[\], noticeBoards\)/);
  assert.doesNotMatch(homeSource, /NOTICE_BOARD_SLUGS/);
  assert.doesNotMatch(homeSource, /postApi\.getPosts\(noticeBoardId/);
});
