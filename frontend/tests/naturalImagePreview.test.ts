import assert from "node:assert/strict";
import test from "node:test";

import { naturalImagePreviewLayout } from "../utils/naturalImagePreview";

test("계산 높이가 500px이면 이미지를 자르지 않는다", () => {
  assert.deepEqual(
    naturalImagePreviewLayout({
      containerWidth: 300,
      imageWidth: 600,
      imageHeight: 1000,
    }),
    {
      aspectRatio: 0.6,
      naturalHeight: 500,
      previewHeight: 500,
      isExpandable: false,
    },
  );
});

test("계산 높이가 500px을 넘으면 500px 미리보기로 제한한다", () => {
  const layout = naturalImagePreviewLayout({
    containerWidth: 390,
    imageWidth: 1500,
    imageHeight: 2121,
  });

  assert.ok(layout);
  assert.equal(layout.aspectRatio, 1500 / 2121);
  assert.ok(Math.abs(layout.naturalHeight - (390 * 2121 / 1500)) < Number.EPSILON * 1000);
  assert.equal(layout.previewHeight, 500);
  assert.equal(layout.isExpandable, true);
});

test("유효하지 않은 크기에는 확장 미리보기 레이아웃을 만들지 않는다", () => {
  assert.equal(
    naturalImagePreviewLayout({
      containerWidth: 390,
      imageWidth: 0,
      imageHeight: 2121,
    }),
    undefined,
  );
});
