import assert from "node:assert/strict";
import test from "node:test";

import * as postAttachments from "../utils/postAttachments";

type UploadBatchResult<T> = {
  uploaded: T[];
  failedCount: number;
  skippedCount: number;
};

type UploadAttachmentBatch = <TInput, TOutput>(
  items: readonly TInput[],
  upload: (item: TInput) => Promise<TOutput>,
  maxCount?: number,
) => Promise<UploadBatchResult<TOutput>>;

type PostImageSelectionLimit = (
  boardType?: string | null,
  currentAttachmentCount?: number,
) => number | undefined;
type NativeMultiImagePickerOptions = (maxSelection?: number) => {
  orderedSelection: true;
  selectionLimit: number;
};
type AttachmentFixture = {
  id: number;
  content_type: string;
};
type ParticipationGuideImageSections = <T extends AttachmentFixture>(
  attachments: readonly T[],
) => {
  representativeImage?: T;
  detailImages: T[];
  otherAttachments: T[];
};
type ParticipationGuideDetailAttachments = <T extends AttachmentFixture>(
  attachments: readonly T[],
) => T[];
type ReplaceParticipationGuideRepresentative = <T extends AttachmentFixture>(
  attachments: readonly T[],
  replacement: T,
) => T[];

const uploadAttachmentBatch = (postAttachments as Record<string, unknown>)
  .uploadAttachmentBatch as UploadAttachmentBatch | undefined;
const postImageSelectionLimit = (postAttachments as Record<string, unknown>)
  .postImageSelectionLimit as PostImageSelectionLimit | undefined;
const nativeMultiImagePickerOptions = (postAttachments as Record<string, unknown>)
  .nativeMultiImagePickerOptions as NativeMultiImagePickerOptions | undefined;
const participationGuideImageSections = (postAttachments as Record<string, unknown>)
  .participationGuideImageSections as ParticipationGuideImageSections | undefined;
const participationGuideDetailAttachments = (postAttachments as Record<string, unknown>)
  .participationGuideDetailAttachments as ParticipationGuideDetailAttachments | undefined;
const replaceParticipationGuideRepresentative = (postAttachments as Record<string, unknown>)
  .replaceParticipationGuideRepresentative as ReplaceParticipationGuideRepresentative | undefined;

test("사진첩은 기존 첨부를 포함해 게시글당 20장까지만 업로드한다", async () => {
  assert.equal(typeof uploadAttachmentBatch, "function");
  assert.equal(typeof postImageSelectionLimit, "function");
  if (!uploadAttachmentBatch || !postImageSelectionLimit) return;

  const selected = ["20", "21"];
  const started: string[] = [];
  const result = await uploadAttachmentBatch(
    selected,
    async (item) => {
      started.push(item);
      return `uploaded-${item}`;
    },
    postImageSelectionLimit("album", 19),
  );

  assert.deepEqual(started, ["20"]);
  assert.deepEqual(result.uploaded, ["uploaded-20"]);
  assert.equal(result.failedCount, 0);
  assert.equal(result.skippedCount, 1);
});

test("사진 여러 장 중 한 장이 실패해도 성공한 사진은 선택 순서대로 유지한다", async () => {
  assert.equal(typeof uploadAttachmentBatch, "function");
  if (!uploadAttachmentBatch) return;

  const result = await uploadAttachmentBatch(
    ["first", "broken", "third"],
    async (item) => {
      if (item === "broken") throw new Error("upload failed");
      return `uploaded-${item}`;
    },
    20,
  );

  assert.deepEqual(result.uploaded, ["uploaded-first", "uploaded-third"]);
  assert.equal(result.failedCount, 1);
  assert.equal(result.skippedCount, 0);
});

test("게시글당 20장 제한은 사진첩의 남은 첨부 슬롯에만 적용한다", () => {
  assert.equal(typeof postImageSelectionLimit, "function");
  if (!postImageSelectionLimit) return;

  assert.equal(postImageSelectionLimit("album", 0), 20);
  assert.equal(postImageSelectionLimit("album", 19), 1);
  assert.equal(postImageSelectionLimit("album", 20), 0);
  assert.equal(postImageSelectionLimit("album", 21), 0);
  assert.equal(postImageSelectionLimit("activity_certification", 19), undefined);
  assert.equal(postImageSelectionLimit("post", 19), undefined);
});

test("네이티브 다중 선택은 사진첩의 남은 슬롯과 사용자가 고른 순서를 함께 보장한다", () => {
  assert.equal(typeof nativeMultiImagePickerOptions, "function");
  assert.equal(typeof postImageSelectionLimit, "function");
  if (!nativeMultiImagePickerOptions || !postImageSelectionLimit) return;

  assert.deepEqual(nativeMultiImagePickerOptions(postImageSelectionLimit("album", 19)), {
    orderedSelection: true,
    selectionLimit: 1,
  });
});

test("동아리 안내는 첫 이미지를 목록 대표 이미지로 분리하고 나머지를 상세 이미지로 유지한다", () => {
  assert.equal(typeof participationGuideImageSections, "function");
  if (!participationGuideImageSections) return;

  const document = { id: 10, content_type: "application/pdf" };
  const representative = { id: 11, content_type: "image/png" };
  const detailOne = { id: 12, content_type: "image/jpeg" };
  const detailTwo = { id: 13, content_type: "image/webp" };

  assert.deepEqual(
    participationGuideImageSections([document, representative, detailOne, detailTwo]),
    {
      representativeImage: representative,
      detailImages: [detailOne, detailTwo],
      otherAttachments: [document],
    },
  );
});

test("동아리 상세 글은 대표 이미지를 제외하고 상세 이미지와 일반 첨부만 표시한다", () => {
  assert.equal(typeof participationGuideDetailAttachments, "function");
  if (!participationGuideDetailAttachments) return;

  const representative = { id: 21, content_type: "image/png" };
  const detailOne = { id: 22, content_type: "image/jpeg" };
  const document = { id: 23, content_type: "application/pdf" };
  const detailTwo = { id: 24, content_type: "image/webp" };

  assert.deepEqual(
    participationGuideDetailAttachments([representative, detailOne, document, detailTwo]),
    [detailOne, detailTwo, document],
  );
});

test("동아리 대표 이미지 변경은 상세 이미지와 일반 첨부의 순서를 보존한다", () => {
  assert.equal(typeof replaceParticipationGuideRepresentative, "function");
  if (!replaceParticipationGuideRepresentative) return;

  const document = { id: 31, content_type: "application/pdf" };
  const oldRepresentative = { id: 32, content_type: "image/png" };
  const detail = { id: 33, content_type: "image/jpeg" };
  const replacement = { id: 34, content_type: "image/webp" };

  assert.deepEqual(
    replaceParticipationGuideRepresentative(
      [document, oldRepresentative, detail],
      replacement,
    ),
    [document, replacement, detail],
  );
  assert.deepEqual(
    replaceParticipationGuideRepresentative([document], replacement),
    [replacement, document],
  );
});
