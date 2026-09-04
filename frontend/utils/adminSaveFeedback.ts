export type AdminSaveFeedbackKind = "notice" | "event" | "suggestion";
export type AdminSaveFeedbackOperation = "create" | "update";
export type AdminSaveFeedbackPresentation = {
  title: string;
  message: string;
};

export function adminSaveFeedback(
  kind: AdminSaveFeedbackKind,
  operation: AdminSaveFeedbackOperation,
): AdminSaveFeedbackPresentation | null {
  if (kind === "notice" && operation === "create") {
    return {
      title: "등록 완료",
      message: "공지사항이 등록되었습니다.",
    };
  }

  return null;
}
