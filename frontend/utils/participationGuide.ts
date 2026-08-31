export function participationApplicationUrl(metadata?: Record<string, unknown> | null) {
  const value = metadata?.application_url;
  if (typeof value !== "string") return undefined;
  return value.trim() || undefined;
}
