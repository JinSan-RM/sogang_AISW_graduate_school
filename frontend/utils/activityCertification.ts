export type ActivityParticipant = {
  id: number;
  name: string;
  major?: string;
  student_number?: string;
  legacy?: boolean;
  persisted?: boolean;
};

export const ACTIVITY_PARTICIPANT_GUIDANCE =
  "원우회비 미납자, 졸업자는 검색되지 않아요. 지원금은 참가자 목록 기준 지급되니 본인도 검색해서 추가해주세요.";

export function formatActivityParticipant(participant: ActivityParticipant): string {
  return [participant.name, participant.major, participant.student_number].filter(Boolean).join(" ");
}

function positiveInteger(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function participantLabels(metadata?: Record<string, unknown> | null) {
  return typeof metadata?.participants === "string"
    ? metadata.participants.split(",").map((label) => label.trim()).filter(Boolean)
    : [];
}

function isUnchangedPersistedSelection(
  selectedParticipants: ActivityParticipant[],
  existingMetadata?: Record<string, unknown> | null,
) {
  const existingParticipants = typeof existingMetadata?.participants === "string"
    ? existingMetadata.participants.trim()
    : "";
  return selectedParticipants.length > 0
    && selectedParticipants.every((participant) => participant.persisted)
    && selectedParticipants.map(formatActivityParticipant).join(", ") === existingParticipants;
}

export function activityParticipantsFromMetadata(
  metadata?: Record<string, unknown> | null,
): ActivityParticipant[] {
  const labels = participantLabels(metadata);
  const duesPayerIds = Array.isArray(metadata?.participant_dues_payer_ids)
    ? metadata.participant_dues_payer_ids.map(positiveInteger)
    : [];
  const hasCompleteDuesIds = labels.length > 0
    && duesPayerIds.length === labels.length
    && duesPayerIds.every((id): id is number => id !== undefined);

  if (hasCompleteDuesIds) {
    return labels.map((name, index) => ({
      id: duesPayerIds[index] as number,
      name,
      persisted: true,
    }));
  }

  return labels.map((name, index) => ({
    id: -(index + 1),
    name,
    legacy: true,
    persisted: true,
  }));
}

export function activityParticipantSelectionError(
  selectedParticipants: ActivityParticipant[],
  existingMetadata?: Record<string, unknown> | null,
): string | null {
  if (
    selectedParticipants.some((participant) => participant.legacy)
    && !isUnchangedPersistedSelection(selectedParticipants, existingMetadata)
  ) {
    return "기존 회원 기반 참가자를 변경하려면 원우회비 납부자 명부에서 참가자 전원을 다시 선택해주세요.";
  }
  return null;
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
  selectedParticipants: ActivityParticipant[];
  activitySourcePostId: number | null;
}): Record<string, unknown> {
  const metadata: Record<string, unknown> = { ...(existingMetadata ?? {}) };
  const trimmedDate = activityDate?.trim();
  const trimmedParticipants = participants?.trim();
  const trimmedBankAccount = bankAccount?.trim();

  if (trimmedDate) metadata.activity_date = trimmedDate;
  if (trimmedParticipants) metadata.participants = trimmedParticipants;
  if (trimmedBankAccount) metadata.bank_account = trimmedBankAccount;

  if (isUnchangedPersistedSelection(selectedParticipants, existingMetadata)) {
    delete metadata.participant_dues_payer_ids;
  } else {
    delete metadata.participant_user_ids;
    metadata.participant_dues_payer_ids = selectedParticipants
      .filter((participant) => !participant.legacy)
      .map((participant) => participant.id);
  }

  if (activitySourcePostId) {
    metadata.activity_source_post_id = String(activitySourcePostId);
  }

  return metadata;
}
