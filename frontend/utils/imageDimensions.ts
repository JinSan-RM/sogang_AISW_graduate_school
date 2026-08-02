export type ImageDimensions = {
  width: number;
  height: number;
};

type UnknownRecord = Record<string, unknown>;

function recordOf(value: unknown): UnknownRecord | undefined {
  return typeof value === "object" && value !== null ? value as UnknownRecord : undefined;
}

function positiveNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}

function dimensionsFromCandidate(value: unknown): ImageDimensions | undefined {
  const candidate = recordOf(value);
  if (!candidate) return undefined;

  const width = positiveNumber(candidate.width) ?? positiveNumber(candidate.naturalWidth);
  const height = positiveNumber(candidate.height) ?? positiveNumber(candidate.naturalHeight);
  return width && height ? { width, height } : undefined;
}

export function imageDimensionsFromLoadEvent(event: unknown): ImageDimensions | undefined {
  const nativeEvent = recordOf(recordOf(event)?.nativeEvent);
  if (!nativeEvent) return undefined;

  return (
    dimensionsFromCandidate(nativeEvent.source)
    ?? dimensionsFromCandidate(nativeEvent.target)
    ?? dimensionsFromCandidate(nativeEvent.currentTarget)
  );
}
