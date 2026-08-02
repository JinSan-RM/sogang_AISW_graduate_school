import assert from "node:assert/strict";
import test from "node:test";

import { COMMUNITY_TAB_ROUTE } from "../utils/appRoutes";
import { RESOURCE_ALL_SLUGS, RESOURCE_FILTERS, RESOURCE_FILTER_SLUGS } from "../utils/resourceBoards";

test("자료공유 게시판 선택 목록에 졸업논문을 연결한다", () => {
  assert.deepEqual(RESOURCE_FILTERS, ["전체", "강의후기", "시험족보", "종합시험", "졸업논문"]);
  assert.equal(RESOURCE_FILTER_SLUGS.졸업논문, "graduation-thesis");
  assert.equal(RESOURCE_ALL_SLUGS.includes("graduation-thesis"), true);
});

test("행사 사진첩 더보기는 하단 탭이 유지되는 커뮤니티 루트로 이동한다", () => {
  assert.equal(COMMUNITY_TAB_ROUTE, "/(tabs)/community");
});
