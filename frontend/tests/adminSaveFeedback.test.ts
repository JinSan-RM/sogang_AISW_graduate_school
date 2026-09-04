import assert from "node:assert/strict";
import test from "node:test";

type SaveFeedbackKind = "notice" | "event" | "suggestion";
type SaveFeedbackOperation = "create" | "update";
type SaveFeedbackPresentation = { title: string; message: string } | null;

async function saveFeedbackResolver() {
  const module = await import("../utils/adminSaveFeedback").catch(() => ({}));
  const resolver = (module as {
    adminSaveFeedback?: (
      kind: SaveFeedbackKind,
      operation: SaveFeedbackOperation,
    ) => SaveFeedbackPresentation;
  }).adminSaveFeedback;
  if (!resolver) assert.fail("adminSaveFeedback must be exported");
  return resolver;
}

test("공지 신규 등록만 디자인 성공 모달 데이터를 만든다", async () => {
  const resolveFeedback = await saveFeedbackResolver();

  assert.deepEqual(resolveFeedback("notice", "create"), {
    title: "등록 완료",
    message: "공지사항이 등록되었습니다.",
  });
  assert.equal(resolveFeedback("notice", "update"), null);
  assert.equal(resolveFeedback("event", "create"), null);
  assert.equal(resolveFeedback("event", "update"), null);
  assert.equal(resolveFeedback("suggestion", "update"), null);
});
