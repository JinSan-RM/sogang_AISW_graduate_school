import type { MutualAidStatus } from "../types";

const EVENT_TYPE_LABELS: Record<string, string> = {
  marriage: "결혼",
  wedding: "결혼",
  bereavement: "부고",
  funeral: "부고",
};

const RELATION_LABELS: Record<string, string> = {
  self: "본인",
  spouse: "배우자",
  parent: "부모",
  child: "자녀",
  sibling: "형제/자매",
};

export function canEditMutualAidRequest(status?: MutualAidStatus | null): boolean {
  return status === "processing";
}

export function canDeleteMutualAidRequest(status?: MutualAidStatus | null): boolean {
  return status === "processing" || status === "rejected";
}

export function normalizeMutualAidEventDate(value?: string | null): string {
  return value?.trim().replaceAll("-", ".") ?? "";
}

export function isUnchangedMutualAidEventDate(nextValue?: string | null, storedValue?: string | null): boolean {
  return normalizeMutualAidEventDate(nextValue) === normalizeMutualAidEventDate(storedValue);
}

export function mutualAidEventTypeLabel(value?: string | null): string {
  const normalized = value?.trim() ?? "";
  return EVENT_TYPE_LABELS[normalized.toLowerCase()] ?? normalized;
}

export function mutualAidRelationLabel(value?: string | null): string {
  const normalized = value?.trim() ?? "";
  return RELATION_LABELS[normalized.toLowerCase()] ?? normalized;
}
