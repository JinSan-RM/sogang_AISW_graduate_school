export const COMMENT_DELETE_COPY = {
  title: "댓글 삭제",
  body: "댓글을 삭제하시겠어요?\n삭제한 댓글은 복구할 수 없어요.",
} as const;

export type CommentReportAction = "open" | "own-unavailable" | "none";

export type CommentActionState = {
  showReply: boolean;
  showEdit: boolean;
  showDelete: boolean;
  showSave: boolean;
  showCancel: boolean;
  reportLabel: "신고" | "신고됨";
  reportAction: CommentReportAction;
};

export function getCommentActionState({
  depth,
  isMine,
  isEditing,
  isReported,
}: {
  depth: number;
  isMine: boolean;
  isEditing: boolean;
  isReported: boolean;
}): CommentActionState {
  return {
    showReply: depth === 0 && !isEditing,
    showEdit: isMine && !isEditing,
    showDelete: isMine && !isEditing,
    showSave: isMine && isEditing,
    showCancel: isMine && isEditing,
    reportLabel: isReported ? "신고됨" : "신고",
    reportAction: isReported ? "none" : isMine ? "own-unavailable" : "open",
  };
}

export function commentEditSubmissionValue(draft: string, isSaving: boolean): string | null {
  if (isSaving) return null;
  const trimmed = draft.trim();
  return trimmed || null;
}
