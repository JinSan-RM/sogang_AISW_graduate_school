import assert from "node:assert/strict";
import test from "node:test";

import { COMMUNITY_TAB_ROUTE } from "../utils/appRoutes";
import type { Board } from "../types";
import {
  resourceFilterAfterNavigation,
  resourcePostEditBoards,
  RESOURCE_ALL_SLUGS,
  RESOURCE_FILTERS,
  RESOURCE_FILTER_SLUGS,
} from "../utils/resourceBoards";

const board = (overrides: Partial<Board>): Board => ({
  id: 1,
  name: "강의후기",
  slug: "lecture-reviews",
  category: "resources",
  board_type: "resource",
  sort_order: 20,
  allow_anonymous: true,
  read_permission: "user",
  write_permission: "user",
  is_active: true,
  ...overrides,
});

test("자료공유 게시판 선택 목록에 졸업논문을 연결한다", () => {
  assert.deepEqual(RESOURCE_FILTERS, ["전체", "강의후기", "시험족보", "종합시험", "졸업논문"]);
  assert.equal(RESOURCE_FILTER_SLUGS.졸업논문, "graduation-thesis");
  assert.equal(RESOURCE_ALL_SLUGS.includes("graduation-thesis"), true);
});

test("행사 사진첩 더보기는 하단 탭이 유지되는 커뮤니티 루트로 이동한다", () => {
  assert.equal(COMMUNITY_TAB_ROUTE, "/(tabs)/community");
});

test("자료공유 탭 진입은 대표 강의후기 게시판보다 전체 필터를 우선한다", () => {
  assert.equal(resourceFilterAfterNavigation(board({}), "전체"), "전체");
});

test("자료공유 하위 필터 이동은 요청 필터가 없으면 게시판 필터를 사용한다", () => {
  assert.equal(resourceFilterAfterNavigation(board({ slug: "exam-archive" })), "시험족보");
});

test("자료공유 글 수정은 활성 자료공유 게시판만 이동 대상으로 제공한다", () => {
  const source = board({ id: 10 });
  const candidates = [
    source,
    board({ id: 11, name: "시험족보", slug: "exam-archive", sort_order: 21 }),
    board({ id: 12, name: "비활성 자료실", slug: "inactive-resource", is_active: false }),
    board({ id: 13, name: "행사 사진첩", slug: "event-album", category: "community", board_type: "album" }),
  ];

  assert.deepEqual(
    resourcePostEditBoards(candidates, source).map((item) => item.id),
    [10, 11],
  );
});

test("자료공유가 아닌 글 수정은 게시판 이동 대상을 제공하지 않는다", () => {
  const source = board({ id: 20, category: "community", board_type: "post" });

  assert.deepEqual(resourcePostEditBoards([source, board({ id: 21 })], source), []);
});
