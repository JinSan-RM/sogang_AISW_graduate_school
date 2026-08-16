import assert from "node:assert/strict";
import test from "node:test";

import { postDetailImagePresentation } from "../utils/postDetailImagePresentation";

test("공지 첨부와 일반 첨부는 원본 비율을 사용한다", () => {
  assert.equal(postDetailImagePresentation({ placement: "attachment", boardType: "notice" }), "natural");
  assert.equal(postDetailImagePresentation({ placement: "attachment", boardType: "post" }), "natural");
});

test("참여활동 대표 이미지는 원본 비율을 사용한다", () => {
  assert.equal(postDetailImagePresentation({ placement: "hero", boardType: "activity_certification" }), "natural");
  assert.equal(
    postDetailImagePresentation({ placement: "hero", boardType: "post", boardSlug: "club-promo" }),
    "natural",
  );
  assert.equal(
    postDetailImagePresentation({ placement: "hero", boardType: "post", boardSlug: "networking-programs" }),
    "natural",
  );
});

test("원우회 활동내역 대표 이미지는 기존 자연 비율을 유지한다", () => {
  assert.equal(
    postDetailImagePresentation({ placement: "hero", boardType: "notice", isCouncilActivityEntry: true }),
    "natural",
  );
});

test("사진첩의 승인된 고정 contain 프레임은 유지한다", () => {
  assert.equal(postDetailImagePresentation({ placement: "hero", boardType: "album" }), "fixed-contain");
});
