import type { MediaReference } from "./mediaAccess";

export type ProfileAvatarPresentation =
  | { kind: "image"; media: MediaReference }
  | { kind: "default" };

export function profileAvatarPresentation(
  mediaId?: number | null,
  mediaUrl?: string | null,
): ProfileAvatarPresentation {
  const normalizedId = Number.isInteger(mediaId) && Number(mediaId) > 0 ? mediaId : null;
  const normalizedUrl = typeof mediaUrl === "string" && mediaUrl.trim() ? mediaUrl.trim() : null;
  return normalizedId || normalizedUrl
    ? { kind: "image", media: { id: normalizedId, url: normalizedUrl } }
    : { kind: "default" };
}
