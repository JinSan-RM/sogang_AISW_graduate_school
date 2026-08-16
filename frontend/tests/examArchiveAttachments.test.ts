import assert from "node:assert/strict";
import test from "node:test";

import { writeAttachmentActions } from "../utils/postAttachments";

test("게시판 글쓰기는 이미지와 파일 첨부 동작을 구분해 제공한다", () => {
  const calls: string[] = [];
  const actions = writeAttachmentActions({
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
