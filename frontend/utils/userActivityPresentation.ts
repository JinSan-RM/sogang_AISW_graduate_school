import { formatBoardDate } from "./dateFormat";
import { resourceCategoryLabel } from "./resourceBoards";
import { formatCohortName } from "./userLabel";

export type ActivityCategoryInput = {
  type?: "post" | "comment" | "bookmark";
  board_name?: string;
  category?: string | null;
};

export type BookmarkMetaInput = ActivityCategoryInput & {
  author_nickname?: string | null;
  author_cohort?: string | null;
  created_at: string;
};

export function userActivityCategoryLabel(item: ActivityCategoryInput): string {
  const resourceLabel = resourceCategoryLabel({ name: item.board_name }, item.category);
  if (resourceLabel) return resourceLabel;
  const fallback = item.type === "bookmark" ? "스크랩" : item.type === "comment" ? "댓글" : "게시글";
  return item.category?.trim() || item.board_name?.trim() || fallback;
}

export function bookmarkActivityMeta(item: BookmarkMetaInput): string {
  const date = formatBoardDate(item.created_at);
  if (userActivityCategoryLabel(item) === "강의후기") return date;
  return [formatCohortName(item.author_cohort, item.author_nickname), date].filter(Boolean).join(" · ");
}
