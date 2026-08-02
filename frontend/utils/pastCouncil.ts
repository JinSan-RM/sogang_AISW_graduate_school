export type PastCouncilActivity = {
  date?: string;
  title: string;
};

export type PastCouncilActivityStorage = string | PastCouncilActivity;

const DATE_PREFIX = /^((?:\d{2}|\d{4})[.-]\d{1,2}[.-]\d{1,2}(?:\([^)]*\))?)\s+(.+)$/;

function activityFromLine(value: string): PastCouncilActivity | null {
  const line = value.trim();
  if (!line) return null;
  const match = DATE_PREFIX.exec(line);
  return match ? { date: match[1], title: match[2].trim() } : { title: line };
}

export function pastCouncilActivitiesFromMetadata(value: unknown): PastCouncilActivity[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry): PastCouncilActivity[] => {
    if (typeof entry === "string") {
      const activity = activityFromLine(entry);
      return activity ? [activity] : [];
    }
    if (!entry || typeof entry !== "object") return [];

    const record = entry as Record<string, unknown>;
    const title = typeof record.title === "string" ? record.title.trim() : "";
    if (!title) return [];
    const date = typeof record.date === "string" ? record.date.trim() : "";
    return [{ title, date: date || undefined }];
  });
}

export function formatPastCouncilActivitiesForEditing(value: unknown): string {
  return pastCouncilActivitiesFromMetadata(value)
    .map((activity) => [activity.date, activity.title].filter(Boolean).join(" "))
    .join("\n");
}

export function parsePastCouncilActivitiesForStorage(value: string): PastCouncilActivityStorage[] {
  return value.split(/\r?\n/).flatMap((line): PastCouncilActivityStorage[] => {
    const activity = activityFromLine(line);
    if (!activity) return [];
    return activity.date ? [activity] : [activity.title];
  });
}
