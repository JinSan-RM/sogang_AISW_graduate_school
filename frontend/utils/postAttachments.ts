export type PostAttachmentPicker = "images" | "documents";

type AttachmentHandlers = Record<PostAttachmentPicker, () => void>;

export type PostAttachmentAction = {
  picker: PostAttachmentPicker;
  label: string;
  onPress: () => void;
};

export function examArchiveAttachmentActions(
  boardSlug: string | undefined,
  handlers: AttachmentHandlers
): PostAttachmentAction[] {
  if (boardSlug !== "exam-archive") return [];
  return [
    { picker: "images", label: "이미지 첨부", onPress: handlers.images },
    { picker: "documents", label: "파일 첨부", onPress: handlers.documents },
  ];
}
