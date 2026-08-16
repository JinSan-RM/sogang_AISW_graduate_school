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

export function getReportSubmission(reason: ReportReason, detail: string): ReportSubmission | null {
  if (reason !== "other") return { reason };
  const normalizedDetail = detail.trim();
  return normalizedDetail ? { reason, detail: normalizedDetail } : null;
}
