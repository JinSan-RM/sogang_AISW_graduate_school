import assert from "node:assert/strict";
import test from "node:test";

import { examArchiveAttachmentActions } from "../utils/postAttachments";

test("시험 족보 글쓰기는 이미지와 문서 첨부 동작을 구분해 제공한다", () => {
  const calls: string[] = [];
  const actions = examArchiveAttachmentActions("exam-archive", {
    images: () => calls.push("images"),
    documents: () => calls.push("documents"),
  });

  assert.deepEqual(
    actions.map(({ picker, label }) => ({ picker, label })),
    [
      { picker: "images", label: "이미지 첨부" },
      { picker: "documents", label: "파일 첨부" },
    ]
  );

  actions[0]?.onPress();
  actions[1]?.onPress();
  assert.deepEqual(calls, ["images", "documents"]);
});

test("다른 게시판 글쓰기는 시험 족보 전용 첨부 동작을 노출하지 않는다", () => {
  const actions = examArchiveAttachmentActions("study-recruit", {
    images: () => undefined,
    documents: () => undefined,
  });

  assert.deepEqual(actions, []);
});
