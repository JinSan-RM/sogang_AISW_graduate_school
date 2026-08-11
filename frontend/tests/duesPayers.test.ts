import assert from "node:assert/strict";
import test from "node:test";

import {
  DUES_DELETE_CONFIRMATION,
  formatDuesImportSummary,
  formatDuesPayer,
  isExactDuesDeleteConfirmation,
} from "../utils/duesPayers";

test("원우회비 납부자는 이름 전공 학번을 띄어쓰기로 표시한다", () => {
  assert.equal(
    formatDuesPayer({ id: 1, name: "홍길동", major: "AI", student_number: "A74001" }),
    "홍길동 AI A74001",
  );
});

test("엑셀 upsert 결과를 신규 수정 유지 건수로 안내한다", () => {
  assert.equal(
    formatDuesImportSummary({ created: 2, updated: 3, unchanged: 4, total_rows: 9 }),
    "총 9명 · 신규 2명 · 수정 3명 · 유지 4명",
  );
});

test("전체 삭제는 정확히 진짜 삭제를 입력해야 확정된다", () => {
  assert.equal(DUES_DELETE_CONFIRMATION, "진짜 삭제");
  assert.equal(isExactDuesDeleteConfirmation("진짜 삭제"), true);
  assert.equal(isExactDuesDeleteConfirmation(" 진짜 삭제 "), false);
  assert.equal(isExactDuesDeleteConfirmation("삭제"), false);
});
