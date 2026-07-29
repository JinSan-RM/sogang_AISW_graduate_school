export type MediaReference = {
  id?: number | null;
  url?: string | null;
  is_private?: boolean;
};

const DIRECT_URI_PATTERN = /^(?:https?:|file:|blob:|data:)/i;
const NON_HTTP_URI_PATTERN = /^(?:file:|blob:|data:)/i;

function pathnameFromReference(value: string): string | null {
  if (NON_HTTP_URI_PATTERN.test(value)) return null;
  try {
    return new URL(value, "https://media-reference.invalid").pathname;
  } catch {
    return null;
  }
}

export function toAbsoluteMediaUrl(value: string | null | undefined, apiOrigin: string): string | null {
  const normalized = value?.trim();
  if (!normalized) return null;
  if (DIRECT_URI_PATTERN.test(normalized)) return normalized;
  return `${apiOrigin}${normalized.startsWith("/") ? normalized : `/${normalized}`}`;
}

export function isManagedUploadUrl(value?: string | null): boolean {
  return managedMediaPathFromReference(value) !== null;
}

export function managedMediaPathFromReference(value?: string | null): string | null {
  const normalized = value?.trim();
  if (!normalized) return null;
  const pathname = pathnameFromReference(normalized);
  if (!pathname) return null;
  if (/^\/api\/media\/\d+\/access-url\/?$/.test(pathname)) {
    return pathname.replace(/\/$/, "");
  }
  if (!pathname.startsWith("/uploads/")) return null;
  const segments = pathname.slice(1).split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) return null;
  return pathname;
}

export function mediaIdFromReference(reference?: MediaReference | null): number | null {
  if (Number.isInteger(reference?.id) && Number(reference?.id) > 0) return Number(reference?.id);
  const value = reference?.url;
  if (!value) return null;
  const pathname = pathnameFromReference(value);
  const match = pathname?.match(/^\/api\/media\/(\d+)\/access-url\/?$/);
  return match ? Number(match[1]) : null;
}

export function shouldRequestMediaAccess(reference?: MediaReference | null): boolean {
  if (!reference) return false;
  if (isManagedUploadUrl(reference.url)) return true;
  return Boolean(mediaIdFromReference(reference)) && (reference.is_private === true || !reference.url);
}

export function mediaAccessEndpoint(mediaId: number): string {
  if (!Number.isInteger(mediaId) || mediaId <= 0) {
    throw new Error("A positive media id is required.");
  }
  return `/media/${mediaId}/access-url`;
}
