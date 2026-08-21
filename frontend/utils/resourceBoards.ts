import type { Board } from "../types";
import { formatBoardDate } from "./dateFormat";
import { formatCohortName } from "./userLabel";

export const RESOURCE_FILTERS = ["전체", "강의후기", "시험족보", "종합시험", "졸업논문"] as const;
export type ResourceFilter = (typeof RESOURCE_FILTERS)[number];

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

type ResourceBoardIdentity = Partial<
  Pick<Board, "slug" | "name" | "board_type" | "category">
>;

export function resourceCategoryLabel(
  board?: ResourceBoardIdentity | null,
  storedCategory?: string | null,
): string | null {
  const slugLabel = board?.slug ? RESOURCE_SLUG_FILTERS[board.slug] : undefined;
  if (slugLabel) {
    return slugLabel;
  }

  const boardName = board?.name?.trim();
  if (boardName && RESOURCE_FILTER_SLUGS[boardName]) {
    return boardName;
  }

  if (board?.category === "resources" && board.board_type === "resource") {
    return boardName || "자료";
  }

  return storedCategory?.trim() || null;
}

export function resourceDetailMeta({
  boardSlug,
  authorCohort,
  authorNickname,
  createdAt,
}: {
  boardSlug?: string | null;
  authorCohort?: string | null;
  authorNickname?: string | null;
  createdAt: string;
}): string {
  const date = formatBoardDate(createdAt);
  if (boardSlug === "lecture-reviews") {
    return date;
  }
  return [formatCohortName(authorCohort, authorNickname), date].filter(Boolean).join(" · ");
}

export function resourceFilterAfterNavigation(
  board: Pick<Board, "slug">,
  requestedFilter?: ResourceFilter,
): ResourceFilter {
  return requestedFilter ?? (RESOURCE_SLUG_FILTERS[board.slug] as ResourceFilter | undefined) ?? "전체";
}

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
