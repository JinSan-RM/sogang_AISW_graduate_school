import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const postCardSource = readFileSync("components/PostCard.tsx", "utf8");
const postDetailSource = readFileSync("app/board/post/[postId].tsx", "utf8");
const postCreateSource = readFileSync("app/board/post/create.tsx", "utf8");
const homeSource = readFileSync("app/(tabs)/home.tsx", "utf8");
const communitySource = readFileSync("app/(tabs)/community.tsx", "utf8");

test("#14·15 행사 사진첩 더보기는 커뮤니티 탭 루트를 사용한다", () => {
  assert.match(homeSource, /router\.push\(COMMUNITY_TAB_ROUTE as never\)/);
  assert.match(communitySource, /<BoardPostsScreen initialBoardId=\{initialBoard\.id\} isTabRoot \/>/);
});

test("#19 진행중 태그는 초록색 표현을 사용한다", () => {
  assert.match(postCardSource, /label\.includes\("진행"\).*#EAF3DE.*#3B6D11/);
});

test("#22 활동인증 날짜는 공통 YY.MM.DD 형식기를 사용한다", () => {
  assert.match(postCreateSource, /field\.value \? formatBoardDate\(field\.value\) : "활동일을 선택하세요"/);
  assert.match(postDetailSource, /formatBoardDate\(metadata\.activity_date\)/);
});

test("#27 상조회 목록은 처리중·완료·반려 상태를 표시한다", () => {
  assert.match(postCardSource, /processing: "처리중"/);
  assert.match(postCardSource, /completed: "완료"/);
  assert.match(postCardSource, /rejected: "반려"/);
});

test("#32 회원 화면은 반려 사유를 분홍색 박스로 표시한다", () => {
  assert.match(postDetailSource, /post\.mutual_aid\?\.rejection_reason && !isAdmin/);
  assert.match(postDetailSource, /mutualAidRejectionBox:[\s\S]*backgroundColor: COLORS\.pink50/);
});
