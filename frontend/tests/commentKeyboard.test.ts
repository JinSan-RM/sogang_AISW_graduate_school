import assert from "node:assert/strict";
import test from "node:test";

import { commentKeyAction, commentSubmissionValue } from "../utils/commentKeyboard";

test("일반 Enter는 댓글 제출로 처리한다", () => {
  assert.equal(commentKeyAction({ key: "Enter" }), "submit");
});

test("Shift+Enter는 줄바꿈으로 처리한다", () => {
  assert.equal(commentKeyAction({ key: "Enter", shiftKey: true }), "newline");
});

test("한글 IME 조합 중 Enter는 제출하지 않는다", () => {
  assert.equal(commentKeyAction({ key: "Enter", isComposing: true }), "ignore");
  assert.equal(commentKeyAction({ key: "Enter", keyCode: 229 }), "ignore");
});

test("Enter가 아닌 키는 댓글 제출에 관여하지 않는다", () => {
  assert.equal(commentKeyAction({ key: "a" }), "ignore");
});

test("빈 댓글과 공백만 있는 댓글은 제출하지 않는다", () => {
  assert.equal(commentSubmissionValue({ text: "" }), null);
  assert.equal(commentSubmissionValue({ text: "  \n\t " }), null);
});

test("전송 중이거나 동기식 잠금 중이면 연속 제출하지 않는다", () => {
  assert.equal(commentSubmissionValue({ text: "댓글", isPending: true }), null);
  assert.equal(commentSubmissionValue({ text: "댓글", isLocked: true }), null);
  assert.equal(commentSubmissionValue({ text: "  댓글 내용  " }), "댓글 내용");
});
