export function formatCohortName(cohort?: string | null, name?: string | null) {
  const normalizedCohort = cohort?.trim().replace(/기$/, "");
  const normalizedName = name?.trim();
  return [normalizedCohort ? `${normalizedCohort}기` : null, normalizedName || null].filter(Boolean).join(" ");
}
