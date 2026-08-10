import type { Board } from "../types";

export const RESOURCE_FILTERS = ["전체", "강의후기", "시험족보", "종합시험", "졸업논문"] as const;

export const RESOURCE_FILTER_SLUGS: Record<string, string> = {
  강의후기: "lecture-reviews",
  시험족보: "exam-archive",
  종합시험: "comprehensive-exam",
  졸업논문: "graduation-thesis",
};

export const RESOURCE_ALL_SLUGS = Object.values(RESOURCE_FILTER_SLUGS);

export const RESOURCE_SLUG_FILTERS: Record<string, string> = Object.fromEntries(
  Object.entries(RESOURCE_FILTER_SLUGS).map(([label, slug]) => [slug, label]),
);

export function resourcePostEditBoards(boards: Board[], sourceBoard?: Board): Board[] {
  if (sourceBoard?.category !== "resources" || sourceBoard.board_type !== "resource") {
    return [];
  }

  return boards
    .filter(
      (board) =>
        board.category === "resources" &&
        board.board_type === "resource" &&
        board.is_active !== false,
    )
    .sort((left, right) => left.sort_order - right.sort_order);
}
