export type EventDisplayCategory = "academic" | "event" | "other";
export type EventToneSurface = "day" | "detail";
export type EventCategoryTone = { backgroundColor: string; color: string };

export const EVENT_CATEGORY_OPTIONS = [
  { value: "academic", label: "학사일정" },
  { value: "event", label: "행사일정" },
  { value: "other", label: "기타일정" },
] as const;

const LABELS: Record<EventDisplayCategory, string> = {
  academic: "학사일정",
  event: "행사일정",
  other: "기타일정",
};

const TONES: Record<EventToneSurface, Record<EventDisplayCategory, EventCategoryTone>> = {
  day: {
    academic: { backgroundColor: "#E6F1FB", color: "#0C447C" },
    event: { backgroundColor: "#FBEAF0", color: "#993556" },
    other: { backgroundColor: "#EDE8F6", color: "#4A2B7A" },
  },
  detail: {
    academic: { backgroundColor: "#E6F1FB", color: "#0C447C" },
    event: { backgroundColor: "#FFF0F4", color: "#D65B7C" },
    other: { backgroundColor: "#EDE8F6", color: "#4A2B7A" },
  },
};

export function eventDisplayCategory(raw: string | null | undefined): EventDisplayCategory {
  if (raw === "academic") return "academic";
  if (raw === "event") return "event";
  return "other";
}

export function eventCategoryLabel(raw: string | null | undefined): string {
  return LABELS[eventDisplayCategory(raw)];
}

export function eventCategoryTone(
  raw: string | null | undefined,
  surface: EventToneSurface,
): EventCategoryTone {
  return TONES[surface][eventDisplayCategory(raw)];
}

export function eventCategoryValueForSubmit(selectedCategory: EventDisplayCategory): string {
  return selectedCategory;
}
