import type { DuesPayerImportResult, DuesPayerItem } from "../types";

export const DUES_DELETE_CONFIRMATION = "진짜 삭제";

export function formatDuesPayer(item: DuesPayerItem) {
  return `${item.name} ${item.major} ${item.student_number}`;
}

export function formatDuesImportSummary(result: DuesPayerImportResult) {
  return `총 ${result.total_rows}명 · 신규 ${result.created}명 · 수정 ${result.updated}명 · 유지 ${result.unchanged}명`;
}

export function isExactDuesDeleteConfirmation(value: string) {
  return value === DUES_DELETE_CONFIRMATION;
}
