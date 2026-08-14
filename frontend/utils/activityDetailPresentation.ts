export type ActivityCertificationDetailHeading = {
  tagText: string | null;
  titleText: string | null;
};

export function activityCertificationDetailHeading(
  boardSlug: string | undefined,
  postTitle: string,
  fallbackLabel: string,
): ActivityCertificationDetailHeading {
  if (boardSlug === "study-activity") {
    return {
      tagText: null,
      titleText: postTitle.trim() || fallbackLabel,
    };
  }

  return {
    tagText: fallbackLabel,
    titleText: null,
  };
}
