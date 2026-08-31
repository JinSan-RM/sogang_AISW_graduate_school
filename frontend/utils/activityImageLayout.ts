export type ActivityImageFit = "contain" | "cover";
export type ActivityImageRule = {
  max_width: number | null;
  height: number | null;
  max_height: number | null;
  fit: ActivityImageFit;
  expandable: boolean;
};
export type ActivityImageLayout = {
  version: 1;
  default: ActivityImageRule;
  landscape: ActivityImageRule | null;
  portrait: ActivityImageRule | null;
};
export type ActivityImageOrientation = "default" | "landscape" | "portrait" | "square";
export type ActivityImageFrame = {
  width: number;
  height: number;
  naturalHeight: number;
  fit: ActivityImageFit;
  showViewer: boolean;
};

export const DEFAULT_ACTIVITY_IMAGE_LAYOUT: ActivityImageLayout = {
  version: 1,
  default: { max_width: null, height: 400, max_height: null, fit: "contain", expandable: true },
  landscape: { max_width: null, height: 240, max_height: null, fit: "contain", expandable: true },
  portrait: { max_width: null, height: 400, max_height: null, fit: "contain", expandable: true },
};

const inRange = (value: unknown, min: number, max: number): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;

function hasExactKeys(input: Record<string, unknown>, keys: readonly string[]) {
  const actualKeys = Object.keys(input);
  return (
    actualKeys.length === keys.length
    && keys.every((key) => Object.prototype.hasOwnProperty.call(input, key))
  );
}

function parseRule(value: unknown): ActivityImageRule | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  if (!hasExactKeys(input, ["max_width", "height", "max_height", "fit", "expandable"])) {
    return null;
  }
  const maxWidth = input.max_width === null
    ? null
    : inRange(input.max_width, 120, 1600)
      ? input.max_width
      : undefined;
  const height = input.height === null
    ? null
    : inRange(input.height, 120, 1600)
      ? input.height
      : undefined;
  const maxHeight = input.max_height === null
    ? null
    : inRange(input.max_height, 120, 2000)
      ? input.max_height
      : undefined;
  if (
    maxWidth === undefined
    || height === undefined
    || maxHeight === undefined
    || (height !== null && maxHeight !== null)
  ) {
    return null;
  }
  if (input.fit !== "contain" && input.fit !== "cover") return null;
  if (typeof input.expandable !== "boolean") return null;
  return {
    max_width: maxWidth,
    height,
    max_height: maxHeight,
    fit: input.fit,
    expandable: input.expandable,
  };
}

export function activityImageLayoutFromMetadata(value: unknown): ActivityImageLayout {
  if (!value || typeof value !== "object") return DEFAULT_ACTIVITY_IMAGE_LAYOUT;
  const input = value as Record<string, unknown>;
  if (
    !hasExactKeys(input, ["version", "default", "landscape", "portrait"])
    || input.version !== 1
  ) {
    return DEFAULT_ACTIVITY_IMAGE_LAYOUT;
  }
  const defaultRule = parseRule(input.default);
  if (!defaultRule) return DEFAULT_ACTIVITY_IMAGE_LAYOUT;
  const parseOverride = (item: unknown) => (item === null ? null : parseRule(item));
  const landscape = parseOverride(input.landscape);
  const portrait = parseOverride(input.portrait);
  if ((input.landscape !== null && !landscape) || (input.portrait !== null && !portrait)) {
    return DEFAULT_ACTIVITY_IMAGE_LAYOUT;
  }
  return { version: 1, default: defaultRule, landscape, portrait };
}

export function isValidActivityImageLayout(value: unknown): value is ActivityImageLayout {
  if (!value || typeof value !== "object") return false;
  const input = value as Record<string, unknown>;
  if (
    !hasExactKeys(input, ["version", "default", "landscape", "portrait"])
    || input.version !== 1
  ) {
    return false;
  }
  const validOverride = (item: unknown) => item === null || Boolean(parseRule(item));
  return Boolean(parseRule(input.default)) && validOverride(input.landscape) && validOverride(input.portrait);
}

export function activityImageOrientation(imageWidth: number, imageHeight: number): ActivityImageOrientation {
  if (![imageWidth, imageHeight].every((value) => Number.isFinite(value) && value > 0)) {
    return "default";
  }
  if (imageWidth === imageHeight) return "square";
  return imageWidth > imageHeight ? "landscape" : "portrait";
}

export function resolveActivityImageRule(
  layout: ActivityImageLayout,
  orientation: ActivityImageOrientation,
): ActivityImageRule {
  if (orientation === "landscape") return layout.landscape ?? layout.default;
  if (orientation === "portrait") return layout.portrait ?? layout.default;
  return layout.default;
}

export function activityImageFrame(
  layout: ActivityImageLayout,
  orientation: ActivityImageOrientation,
  imageWidth: number,
  imageHeight: number,
  containerWidth: number,
): ActivityImageFrame | undefined {
  if (
    ![imageWidth, imageHeight, containerWidth]
      .every((value) => Number.isFinite(value) && value > 0)
  ) {
    return undefined;
  }
  const rule = resolveActivityImageRule(layout, orientation);
  const width = Math.min(containerWidth, rule.max_width ?? containerWidth);
  const naturalHeight = width * imageHeight / imageWidth;
  const clamped = rule.height === null
    && rule.max_height !== null
    && naturalHeight > rule.max_height;
  const height = rule.height
    ?? (rule.max_height === null ? naturalHeight : Math.min(naturalHeight, rule.max_height));
  return {
    width,
    height,
    naturalHeight,
    fit: rule.fit,
    showViewer: rule.expandable && (rule.height !== null || clamped),
  };
}
