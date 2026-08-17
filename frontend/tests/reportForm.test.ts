import assert from "node:assert/strict";
import test from "node:test";

import { REPORT_REASONS, getReportEntryState, getReportSubmission } from "../utils/reportForm";

test("신고 사유는 승인된 순서와 문구를 사용한다", () => {
  assert.deepEqual(REPORT_REASONS, [
    { value: "spam", label: "스팸/광고입니다" },
    { value: "harassment", label: "욕설 및 비방이 포함되어 있어요" },
    { value: "misinformation", label: "허위 정보예요" },
    { value: "other", label: "기타" },
  ]);
});

test("기타 신고는 공백이 아닌 상세 사유가 필요하다", () => {
  assert.equal(getReportSubmission("other", " \n "), null);
  assert.deepEqual(getReportSubmission("other", "  구체적인 사유  "), {
    reason: "other",
    detail: "구체적인 사유",
  });
});

test("선택형 사유는 상세 입력을 전송하지 않는다", () => {
  assert.deepEqual(getReportSubmission("spam", "무시할 상세"), { reason: "spam" });
});

test("본인 게시글은 신고 메뉴를 표시하되 API 대신 로컬 안내를 사용한다", () => {
  assert.deepEqual(
    getReportEntryState({ isMine: true, isReported: false, isAllowedTarget: true }),
    { visible: false, label: "신고", action: "none" },
  );
});

test("다른 작성자 게시글은 신고 시트를 열고 신고 완료 후에는 재전송을 막는다", () => {
  assert.deepEqual(
    getReportEntryState({ isMine: false, isReported: false, isAllowedTarget: true }),
    { visible: true, label: "신고", action: "open" },
  );
  assert.deepEqual(
    getReportEntryState({ isMine: false, isReported: true, isAllowedTarget: true }),
    { visible: true, label: "신고됨", action: "none" },
  );
});

test("신고 대상이 아닌 관리자 전용 게시판에는 신고 메뉴가 없다", () => {
  assert.deepEqual(
    getReportEntryState({ isMine: false, isReported: false, isAllowedTarget: false }),
    { visible: false, label: "신고", action: "none" },
  );
});
