import type { Board } from "../types";
import type { AdminContentScope } from "./adminContentManagement";
import { COMMUNITY_BOARD_SECTIONS, COUNCIL_MENU_ITEMS, PARTICIPATION_FILTERS, PARTICIPATION_GROUPS, STUDY_FILTERS } from "./memberBoardNavigation";
import { isNoticeContentBoard, NOTICE_FILTERS, type NoticeFilter } from "./noticeFeed";
import { RESOURCE_FILTERS, RESOURCE_FILTER_SLUGS } from "./resourceBoards";

export const ADMIN_BOARD_GROUPS = [
  {key:"notices", label:"공지사항"},
  {key:"community", label:"커뮤니티"},
  {key:"participation", label:"참여활동"},
  {key:"council", label:"원우회"},
] as const;
export const ADMIN_BOARD_SECTION_DEFINITIONS = [
  { key: "notices", label: "공지사항", scope: "notices", category: "notices", type: "notice" },
  ...COMMUNITY_BOARD_SECTIONS.map(({ key, label, category, type }) => ({ key, label, category, type, scope: "community" as const })),
  ...PARTICIPATION_GROUPS.map(({ key, label, category }) => ({ key, label, category, type: "post" as const, scope: "participation" as const })),
  ...COUNCIL_MENU_ITEMS.map(({ key, title, category, type }) => ({ key, label: title, category, type, scope: "council" as const })),
] as const;
export type AdminBoardSectionKey = typeof ADMIN_BOARD_SECTION_DEFINITIONS[number]["key"];
export type AdminBoardSection = {key: AdminBoardSectionKey; label:string; scope:AdminContentScope; boardIds:number[]};
export type AdminNoticeCategory = Exclude<NoticeFilter, "all">;

const slugs = new Map<string, AdminBoardSectionKey>([
  ["event-album", "album"],
  ...PARTICIPATION_GROUPS.flatMap(({ key, guideSlug, certificationSlug }) =>
    [[guideSlug, key], [certificationSlug, key]] as const),
  ...COUNCIL_MENU_ITEMS.flatMap(({ key, slugs }) => slugs.map(slug => [slug, key] as const)),
]);
export function adminBoardParent(board: Board): number | null {
  const navigation = board.metadata?.admin_navigation as {parent_board_id?:unknown} | undefined;
  const id = navigation?.parent_board_id;
  return typeof id === "number" && Number.isSafeInteger(id) && id > 0 ? id : null;
}
export function adminBoardSection(board: Board): AdminBoardSectionKey | null {
  const navigation = board.metadata?.admin_navigation as {section?:unknown} | undefined;
  const stored = ADMIN_BOARD_SECTION_DEFINITIONS.find(s => s.key === navigation?.section);
  if (stored) return stored.key;
  const memberSection = slugs.get(board.slug);
  if (memberSection) return memberSection;
  if (board.category === "resources" && board.board_type === "resource") return "resources";
  if (board.category === "notices" && board.board_type === "notice") return "notices";
  return null;
}
export function adminBoardSections(boards: Board[]): AdminBoardSection[] {
  const sorted = [...boards].sort((a,b) => a.sort_order-b.sort_order || a.id-b.id);
  return ADMIN_BOARD_SECTION_DEFINITIONS.map(section => ({
    key:section.key, label:section.label, scope:section.scope,
    boardIds:sorted.filter(board => adminBoardSection(board) === section.key).map(board => board.id),
  }));
}

type AdminAppBoardFilter = { label: string; boardId: number | null; noticeCategory?: AdminNoticeCategory };

export function adminAppSectionBoards(section: AdminBoardSectionKey | null, boards: Board[]): Board[] {
  const visible = boards.filter(board => board.is_active !== false && board.read_permission !== "admin");
  if (section === "notices") {
    return visible.filter(isNoticeContentBoard)
      .sort((left, right) => left.sort_order - right.sort_order || left.id - right.id);
  }
  if (section === "resources") {
    return RESOURCE_FILTERS.flatMap(label => visible.filter(board => board.board_type === "resource" && board.slug === RESOURCE_FILTER_SLUGS[label]));
  }
  const group = PARTICIPATION_GROUPS.find(item => item.key === section);
  if (group) {
    return [group.guideSlug, group.certificationSlug].flatMap(slug => visible.filter(board => board.slug === slug));
  }
  const council = COUNCIL_MENU_ITEMS.find(item => item.key === section);
  const candidates: readonly string[] = council?.slugs ?? (section === "album" ? [COMMUNITY_BOARD_SECTIONS[0].slug] : []);
  const board = visible.find(item => candidates.includes(item.slug));
  return board ? [board] : [];
}

export function adminAppBoardFilters(section: AdminBoardSectionKey | null, boards: Board[]): AdminAppBoardFilter[] {
  if (section === "notices") return NOTICE_FILTERS.map(({ key, label }) => ({
    label, boardId: null, noticeCategory: key === "all" ? undefined : key,
  }));
  if (section === "resources") return RESOURCE_FILTERS.flatMap<AdminAppBoardFilter>(label => {
    if (label === "전체") return [{ label, boardId: null }];
    const board = boards.find(item => item.slug === RESOURCE_FILTER_SLUGS[label]);
    return board ? [{ label, boardId: board.id }] : [];
  });
  const group = PARTICIPATION_GROUPS.find(item => item.key === section);
  if (!group) return [];
  const labels = group.key === "study" ? STUDY_FILTERS : PARTICIPATION_FILTERS;
  return boards.map(board => ({ label: labels[board.slug === group.guideSlug ? 0 : 1], boardId: board.id }));
}
export function adminBoardTag(board: Board): string {
  if (board.board_type === "activity_certification") return "활동 인증";
  if (board.slug === "study-recruit") return "모집";
  if (board.slug === "club-promo") return "동아리 목록";
  if (board.slug === "networking-programs") return "행사 목록";
  return board.name;
}
export function adminParticipationBoards(section: AdminBoardSectionKey | null, boards: Board[]) {
  const slugs = section === "club"
    ? {guide: "club-promo", certification: "club-activity", createLabel: "동아리 등록", activityName: "동아리"}
    : section === "networking"
      ? {guide: "networking-programs", certification: "networking-activity", createLabel: "네트워킹 행사 등록", activityName: "네트워킹 행사"}
      : null;
  if (!slugs) return null;
  const active = (slug: string) => boards.find(board => board.slug === slug && board.is_active !== false && adminBoardSection(board) === section);
  return {...slugs, guide: active(slugs.guide), certification: active(slugs.certification)};
}
export function adminBoardCreationType(section: AdminBoardSectionKey, parent?: Board): string {
  const type=parent?.board_type ?? ADMIN_BOARD_SECTION_DEFINITIONS.find(s=>s.key===section)?.type ?? "post";
  return ["organization_intro","faq"].includes(type)?"post":type;
}
export function adminNoticeEditReady(postBoardId:number,managedBoardId:number|null,noticeBoardId:number|null,tab:string):boolean {
  return postBoardId===managedBoardId&&postBoardId===noticeBoardId&&tab==="content";
}
export function adminBoardVisiblePage(page:number,totalPages:number):number {return Math.min(page,Math.max(1,totalPages));}
