export const POST_DETAIL_IMAGE_PREVIEW_MAX_HEIGHT = 600 // Figma Detail-ImageVertical-Extreme: 대표 이미지 최대 600h;

type NaturalImagePreviewInput = {
  containerWidth: number;
  imageWidth: number;
  imageHeight: number;
  maxPreviewHeight?: number;
};

export type NaturalImagePreviewLayout = {
  aspectRatio: number;
  naturalHeight: number;
  previewHeight: number;
  isExpandable: boolean;
};

function isPositiveFinite(value: number) {
  return Number.isFinite(value) && value > 0;
}

export function naturalImagePreviewLayout({
  containerWidth,
  imageWidth,
  imageHeight,
  maxPreviewHeight = POST_DETAIL_IMAGE_PREVIEW_MAX_HEIGHT,
}: NaturalImagePreviewInput): NaturalImagePreviewLayout | undefined {
  if (
    !isPositiveFinite(containerWidth)
    || !isPositiveFinite(imageWidth)
    || !isPositiveFinite(imageHeight)
    || !isPositiveFinite(maxPreviewHeight)
  ) {
    return undefined;
  }

  const aspectRatio = imageWidth / imageHeight;
  const naturalHeight = containerWidth / aspectRatio;
  const isExpandable = naturalHeight > maxPreviewHeight;

  return {
    aspectRatio,
    naturalHeight,
    previewHeight: isExpandable ? maxPreviewHeight : naturalHeight,
    isExpandable,
  };
}
