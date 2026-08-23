export type PostDetailImagePresentation = "natural" | "fixed-contain" | "fixed-cover";

type PostDetailImagePresentationInput = {
  placement: "hero" | "attachment";
  boardType?: string | null;
  boardSlug?: string | null;
  isCouncilActivityEntry?: boolean;
};

export function postDetailImagePresentation({
  placement,
  boardType,
  boardSlug,
  isCouncilActivityEntry = false,
}: PostDetailImagePresentationInput): PostDetailImagePresentation {
  if (placement === "attachment") return "natural";
  if (boardType === "album") return "fixed-contain";
  if (boardType === "activity_certification") return "fixed-cover";
  if (
    boardSlug === "club-promo"
    || boardSlug === "networking-programs"
    || isCouncilActivityEntry
  ) {
    return "natural";
  }
  return "fixed-cover";
}
