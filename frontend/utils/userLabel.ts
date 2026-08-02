export function formatCohortName(cohort?: string | null, name?: string | null) {
  const normalizedCohort = cohort?.trim().replace(/기$/, "");
  const normalizedName = name?.trim();
  const cohortPrefix = normalizedCohort ? `${normalizedCohort}기` : "";
  const displayName = normalizedName && cohortPrefix && normalizedName.startsWith(cohortPrefix)
    ? normalizedName.slice(cohortPrefix.length).replace(/^[_\s-]+/, "").trim() || normalizedName
    : normalizedName;
  return [cohortPrefix || null, displayName || null].filter(Boolean).join(" ");
}
