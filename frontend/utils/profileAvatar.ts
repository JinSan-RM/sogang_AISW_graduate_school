import type { MediaReference } from "./mediaAccess";

export type ProfileAvatarPresentation =
  | { kind: "image"; media: MediaReference }
  | { kind: "default" };

export function profileAvatarPresentation(
  mediaId?: number | null,
  mediaUrl?: string | null,
): ProfileAvatarPresentation {
  return mediaId || mediaUrl
    ? { kind: "image", media: { id: mediaId, url: mediaUrl } }
    : { kind: "default" };
}
