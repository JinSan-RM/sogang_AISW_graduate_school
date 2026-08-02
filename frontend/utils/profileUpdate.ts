import type { UserMe } from "../types";

export type ProfileUpdateDraft = {
  major: string;
  phone: string;
  profile_image_url: string | null;
};

export type ProfileUpdatePayload = Partial<ProfileUpdateDraft>;

export function buildProfileUpdatePayload(
  current: Pick<UserMe, "major" | "phone" | "profile_image_url">,
  draft: ProfileUpdateDraft
): ProfileUpdatePayload {
  const payload: ProfileUpdatePayload = {};

  if (draft.major !== (current.major ?? "")) payload.major = draft.major;
  if (draft.phone !== (current.phone ?? "")) payload.phone = draft.phone;
  if (draft.profile_image_url !== (current.profile_image_url ?? null)) {
    payload.profile_image_url = draft.profile_image_url;
  }

  return payload;
}
