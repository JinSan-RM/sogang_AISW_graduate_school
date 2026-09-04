export type PostAttachmentPicker = "images" | "documents";

type AttachmentHandlers = Record<PostAttachmentPicker, () => void>;

export type PostAttachmentAction = {
  picker: PostAttachmentPicker;
  label: string;
  onPress: () => void;
};

export const PHOTO_ALBUM_IMAGE_SELECTION_LIMIT = 20;

export type AttachmentUploadBatchResult<T> = {
  uploaded: T[];
  failedCount: number;
  skippedCount: number;
  firstError?: unknown;
};

type AttachmentWithContentType = {
  content_type: string;
};

export function participationGuideImageSections<T extends AttachmentWithContentType>(
  attachments: readonly T[],
) {
  const imageAttachments = attachments.filter((attachment) =>
    attachment.content_type.startsWith("image/"),
  );
  return {
    representativeImage: imageAttachments[0],
    detailImages: imageAttachments.slice(1),
    otherAttachments: attachments.filter(
      (attachment) => !attachment.content_type.startsWith("image/"),
    ),
  };
}

export function participationGuideDetailAttachments<T extends AttachmentWithContentType>(
  attachments: readonly T[],
) {
  const { detailImages, otherAttachments } = participationGuideImageSections(attachments);
  return [...detailImages, ...otherAttachments];
}

export function replaceParticipationGuideRepresentative<T extends AttachmentWithContentType>(
  attachments: readonly T[],
  replacement: T,
) {
  let replaced = false;
  const next = attachments.map((attachment) => {
    if (!replaced && attachment.content_type.startsWith("image/")) {
      replaced = true;
      return replacement;
    }
    return attachment;
  });
  return replaced ? next : [replacement, ...next];
}

export function postImageSelectionLimit(
  boardType?: string | null,
  currentAttachmentCount = 0,
) {
  if (boardType !== "album") return undefined;
  const normalizedCount = Number.isFinite(currentAttachmentCount)
    ? Math.max(0, Math.trunc(currentAttachmentCount))
    : 0;
  return Math.max(0, PHOTO_ALBUM_IMAGE_SELECTION_LIMIT - normalizedCount);
}

export function nativeMultiImagePickerOptions(maxSelection?: number) {
  return {
    orderedSelection: true as const,
    selectionLimit: maxSelection ?? 0,
  };
}

export async function uploadAttachmentBatch<TInput, TOutput>(
  items: readonly TInput[],
  upload: (item: TInput) => Promise<TOutput>,
  maxCount?: number,
): Promise<AttachmentUploadBatchResult<TOutput>> {
  const count = maxCount === undefined ? items.length : Math.max(0, Math.trunc(maxCount));
  const selectedItems = items.slice(0, count);
  const settled = await Promise.allSettled(selectedItems.map((item) => upload(item)));
  const uploaded: TOutput[] = [];
  let failedCount = 0;
  let firstError: unknown;

  settled.forEach((result) => {
    if (result.status === "fulfilled") {
      uploaded.push(result.value);
      return;
    }
    failedCount += 1;
    firstError ??= result.reason;
  });

  return {
    uploaded,
    failedCount,
    skippedCount: Math.max(0, items.length - selectedItems.length),
    firstError,
  };
}

// 일반 게시판 글쓰기 공통: 이미지·파일 첨부를 함께 제공한다.
export function writeAttachmentActions(handlers: AttachmentHandlers): PostAttachmentAction[] {
  return [
    { picker: "images", label: "이미지 첨부", onPress: handlers.images },
    { picker: "documents", label: "파일 첨부", onPress: handlers.documents },
  ];
}
