import { formatBoardDate } from "./dateFormat";
import { normalizeNoticeCategory } from "./noticeFeed";
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
  // 공지 게시판 글은 리스트 화면과 동일하게 원문(other 등)이 아닌 한글 라벨로 표기한다.
  // resourceCategoryLabel은 자료 게시판이 아니어도 카테고리 원문을 돌려주므로 공지 판별이 먼저다.
  if (item.board_name?.includes("공지")) {
    const noticeLabel = normalizeNoticeCategory(item.category) ?? normalizeNoticeCategory(item.board_name);
    if (noticeLabel) return noticeLabel;
  }
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
