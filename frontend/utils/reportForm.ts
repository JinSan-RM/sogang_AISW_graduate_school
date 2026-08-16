export const REPORT_REASONS = [
  { value: "spam", label: "스팸/광고입니다" },
  { value: "harassment", label: "욕설 및 비방이 포함되어 있어요" },
  { value: "misinformation", label: "허위 정보예요" },
  { value: "other", label: "기타" },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]["value"];

export type ReportSubmission = {
  reason: ReportReason;
  detail?: string;
};

export type ReportEntryState = {
  visible: boolean;
  label: "신고" | "신고됨";
  action: "open" | "own-unavailable" | "none";
};

export function getReportEntryState({
  isMine,
  isReported,
  isAllowedTarget,
}: {
  isMine: boolean;
  isReported: boolean;
  isAllowedTarget: boolean;
}): ReportEntryState {
  if (!isAllowedTarget) return { visible: false, label: "신고", action: "none" };
  if (isReported) return { visible: true, label: "신고됨", action: "none" };
  return {
    visible: true,
    label: "신고",
    action: isMine ? "own-unavailable" : "open",
  };
}

export function getReportSubmission(reason: ReportReason, detail: string): ReportSubmission | null {
  if (reason !== "other") return { reason };
  const normalizedDetail = detail.trim();
  return normalizedDetail ? { reason, detail: normalizedDetail } : null;
}
