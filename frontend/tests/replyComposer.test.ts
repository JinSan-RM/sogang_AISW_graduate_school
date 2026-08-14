import assert from "node:assert/strict";
import test from "node:test";

import { createReplyTarget, getReplyComposerState } from "../utils/replyComposer";

test("답글 대상은 화면에 보이는 기수와 이름을 사용한다", () => {
  const target = createReplyTarget({
    id: 248,
    author_cohort: "72",
    author_nickname: "김진산",
  });

  assert.deepEqual(target, { commentId: 248, authorLabel: "72기 김진산" });
});

test("답글 작성 상태는 내부 ID와 작성 중 문구를 노출하지 않는다", () => {
  const state = getReplyComposerState({ commentId: 248, authorLabel: "72기 김진산" });

  assert.equal(state.parentId, 248);
  assert.equal(state.noticeText, "72기 김진산님에게 답글");
  assert.equal(state.placeholder, "답글을 남겨보세요");
  assert.equal(state.noticeText.includes("248"), false);
  assert.equal(state.noticeText.includes("작성 중"), false);
});

test("일반 댓글 상태는 답글 대상 없이 기존 입력 문구를 사용한다", () => {
  assert.deepEqual(getReplyComposerState(null), {
    parentId: null,
    noticeText: null,
    placeholder: "댓글을 남겨보세요",
  });
});
