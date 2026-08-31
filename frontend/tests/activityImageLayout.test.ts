import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_ACTIVITY_IMAGE_LAYOUT,
  activityImageFrame,
  activityImageLayoutFromMetadata,
  activityImageOrientation,
  isValidActivityImageLayout,
  resolveActivityImageRule,
} from "../utils/activityImageLayout";

test("활동 이미지 metadata 누락과 잘못된 값은 안전한 기본 레이아웃으로 정규화한다", () => {
  assert.deepEqual(activityImageLayoutFromMetadata(undefined), DEFAULT_ACTIVITY_IMAGE_LAYOUT);
  assert.deepEqual(activityImageLayoutFromMetadata({ version: 9, default: {} }), DEFAULT_ACTIVITY_IMAGE_LAYOUT);
});

test("설정 없는 활동인증 세로 이미지는 400px contain 프레임과 전체보기를 사용한다", () => {
  const frame = activityImageFrame(
    activityImageLayoutFromMetadata(undefined),
    "portrait",
    320,
    640,
    320,
  );

  assert.deepEqual(frame, {
    width: 320,
    height: 400,
    naturalHeight: 640,
    fit: "contain",
    showViewer: true,
  });
});

test("설정 없는 활동인증 가로 이미지는 240px contain 프레임과 전체보기를 사용한다", () => {
  const frame = activityImageFrame(
    activityImageLayoutFromMetadata(undefined),
    "landscape",
    640,
    320,
    320,
  );

  assert.deepEqual(frame, {
    width: 320,
    height: 240,
    naturalHeight: 160,
    fit: "contain",
    showViewer: true,
  });
});

test("방향별 override는 가로·세로에만 적용되고 없으면 기본 규칙을 사용한다", () => {
  const layout = activityImageLayoutFromMetadata({
    version: 1,
    default: { max_width: null, height: null, max_height: 600, fit: "contain", expandable: true },
    landscape: { max_width: 800, height: null, max_height: 400, fit: "cover", expandable: false },
    portrait: null,
  });
  assert.deepEqual(resolveActivityImageRule(layout, "landscape"), layout.landscape);
  assert.deepEqual(resolveActivityImageRule(layout, "portrait"), layout.default);
  assert.deepEqual(resolveActivityImageRule(layout, "square"), layout.default);
});

test("frame은 max width와 fixed height를 우선하고 auto height만 max height로 clamp한다", () => {
  const layout = activityImageLayoutFromMetadata({
    version: 1,
    default: { max_width: 600, height: null, max_height: 500, fit: "contain", expandable: true },
    landscape: null,
    portrait: { max_width: 600, height: 320, max_height: null, fit: "cover", expandable: false },
  });
  assert.deepEqual(activityImageFrame(layout, "default", 900, 1000, 900), {
    width: 600,
    height: 500,
    naturalHeight: 666.6666666666666,
    fit: "contain",
    showViewer: true,
  });
  assert.deepEqual(activityImageFrame(layout, "portrait", 900, 1600, 500), {
    width: 500,
    height: 320,
    naturalHeight: 888.8888888888889,
    fit: "cover",
    showViewer: false,
  });
});

test("정사각형과 유효하지 않은 크기는 default 규칙을 사용한다", () => {
  const layout = activityImageLayoutFromMetadata(undefined);
  assert.equal(activityImageFrame(layout, "landscape", 0, 100, 390), undefined);
  const square = activityImageFrame(layout, "square", 100, 100, 390);
  assert.ok(square);
  assert.equal(square.height, 400);
});

test("원본 크기로 가로·세로·정사각형 방향을 판정한다", () => {
  assert.equal(activityImageOrientation(1600, 900), "landscape");
  assert.equal(activityImageOrientation(900, 1600), "portrait");
  assert.equal(activityImageOrientation(1000, 1000), "square");
  assert.equal(activityImageOrientation(0, 1000), "default");
});

test("프론트 저장 검증은 서버 계약처럼 두 방향 키와 정확한 규칙 형태를 요구한다", () => {
  const valid = {
    version: 1,
    default: { max_width: null, height: null, max_height: 600, fit: "contain", expandable: true },
    landscape: null,
    portrait: null,
  };
  assert.equal(isValidActivityImageLayout(valid), true);
  assert.equal(isValidActivityImageLayout({ ...valid, portrait: undefined }), false);
  assert.equal(isValidActivityImageLayout({ ...valid, extra: true }), false);
  assert.equal(isValidActivityImageLayout({ ...valid, default: { ...valid.default, extra: true } }), false);
});

test("전체보기는 고정 높이 또는 최대 높이로 실제 제한된 preview에서만 표시한다", () => {
  const maxHeightLayout = {
    ...DEFAULT_ACTIVITY_IMAGE_LAYOUT,
    default: { ...DEFAULT_ACTIVITY_IMAGE_LAYOUT.default, height: null, max_height: 600 },
    portrait: null,
  };
  const exactLimit = activityImageFrame(maxHeightLayout, "portrait", 390, 600, 390);
  const clipped = activityImageFrame(maxHeightLayout, "portrait", 390, 601, 390);
  const disabledLayout = {
    ...maxHeightLayout,
    default: { ...maxHeightLayout.default, expandable: false },
  };
  const disabled = activityImageFrame(disabledLayout, "portrait", 390, 601, 390);

  assert.equal(exactLimit?.height, 600);
  assert.equal(exactLimit?.showViewer, false);
  assert.equal(clipped?.height, 600);
  assert.equal(clipped?.showViewer, true);
  assert.equal(disabled?.showViewer, false);
});
