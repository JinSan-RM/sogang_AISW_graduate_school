export type PostAttachmentPicker = "images" | "documents";

type AttachmentHandlers = Record<PostAttachmentPicker, () => void>;

export type PostAttachmentAction = {
  picker: PostAttachmentPicker;
  label: string;
  onPress: () => void;
};

// 일반 게시판 글쓰기 공통: 이미지·파일 첨부를 함께 제공한다.
export function writeAttachmentActions(handlers: AttachmentHandlers): PostAttachmentAction[] {
  return [
    { picker: "images", label: "이미지 첨부", onPress: handlers.images },
    { picker: "documents", label: "파일 첨부", onPress: handlers.documents },
  ];
}
