import assert from "node:assert/strict";
import test from "node:test";

type Policy = (context: {
  authorId?: number | null;
  isMine: boolean;
  canManagePost: boolean;
  isSuggestionRequest: boolean;
  isAdminOnlyBoard: boolean;
  boardSlug?: string;
}) => boolean;

async function shouldShow(overrides: Partial<Parameters<Policy>[0]> = {}) {
  const moduleUnderTest = await import("../utils/postMenu").catch(() => ({}));
  const policy = (moduleUnderTest as { shouldShowPostAuthorBlock?: Policy }).shouldShowPostAuthorBlock;
  if (!policy) assert.fail("shouldShowPostAuthorBlock must be exported");
  return policy({
    authorId: 12,
    isMine: false,
    canManagePost: false,
    isSuggestionRequest: false,
    isAdminOnlyBoard: false,
    boardSlug: "community-major",
    ...overrides,
  });
}

test("종합시험과 졸업논문 상세에서는 작성자 차단을 제공하지 않는다", async () => {
  assert.equal(await shouldShow({ boardSlug: "comprehensive-exam" }), false);
  assert.equal(await shouldShow({ boardSlug: "graduation-thesis" }), false);
});

test("일반 회원 게시판의 다른 작성자 글에서는 작성자 차단을 유지한다", async () => {
  assert.equal(await shouldShow(), true);
});

test("기존 작성자 및 게시판 권한 제외 조건을 유지한다", async () => {
  assert.equal(await shouldShow({ authorId: null }), false);
  assert.equal(await shouldShow({ isMine: true }), false);
  assert.equal(await shouldShow({ canManagePost: true }), false);
  assert.equal(await shouldShow({ isSuggestionRequest: true }), false);
  assert.equal(await shouldShow({ isAdminOnlyBoard: true }), false);
});
