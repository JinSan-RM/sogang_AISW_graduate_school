import type { UserSearchItem } from "../types";

export function formatActivityParticipant(user: UserSearchItem): string {
  return [user.cohort ? `${user.cohort}기` : null, user.nickname].filter(Boolean).join(" ");
}

function positiveInteger(value: string | undefined): number | undefined {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

export function activityParticipantsFromMetadata(
  metadata?: Record<string, unknown> | null,
): UserSearchItem[] {
  const labels = typeof metadata?.participants === "string"
    ? metadata.participants.split(",").map((label) => label.trim()).filter(Boolean)
    : [];
  const ids = typeof metadata?.participant_user_ids === "string"
    ? metadata.participant_user_ids.split(",").map((value) => positiveInteger(value.trim()))
    : [];

  return labels.map((nickname, index) => ({
    id: ids[index] ?? -(index + 1),
    nickname,
  }));
}

export function activitySourcePostIdFromMetadata(
  metadata?: Record<string, unknown> | null,
): number | null {
  const value = typeof metadata?.activity_source_post_id === "string"
    ? metadata.activity_source_post_id
    : undefined;
  return positiveInteger(value) ?? null;
}

export function buildActivityCertificationMetadata({
  existingMetadata,
  activityDate,
  participants,
  bankAccount,
  selectedParticipants,
  activitySourcePostId,
}: {
  existingMetadata?: Record<string, unknown> | null;
  activityDate?: string;
  participants?: string;
  bankAccount?: string;
  selectedParticipants: UserSearchItem[];
  activitySourcePostId: number | null;
}): Record<string, unknown> {
  const metadata: Record<string, unknown> = { ...(existingMetadata ?? {}) };
  const trimmedDate = activityDate?.trim();
  const trimmedParticipants = participants?.trim();
  const trimmedBankAccount = bankAccount?.trim();

  if (trimmedDate) metadata.activity_date = trimmedDate;
  if (trimmedParticipants) metadata.participants = trimmedParticipants;
  if (trimmedBankAccount) metadata.bank_account = trimmedBankAccount;

  delete metadata.participant_user_ids;
  const participantIds = selectedParticipants.map((participant) =>
    Number.isInteger(participant.id) && participant.id > 0 ? String(participant.id) : "",
  );
  if (participantIds.some(Boolean)) {
    metadata.participant_user_ids = participantIds.join(",");
  }

  if (activitySourcePostId) {
    metadata.activity_source_post_id = String(activitySourcePostId);
  }

  return metadata;
}
