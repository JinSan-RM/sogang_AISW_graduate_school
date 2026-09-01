export const HOME_TAB_ROUTE = "/(tabs)/home" as const;
export const NOTICES_TAB_ROUTE = "/(tabs)/notices" as const;
export const COMMUNITY_TAB_ROUTE = "/(tabs)/community" as const;
export const PARTICIPATION_TAB_ROUTE = "/(tabs)/participation" as const;
export const COUNCIL_TAB_ROUTE = "/(tabs)/council" as const;
export const MY_PAGE_ROUTE = "/(tabs)/settings" as const;

type BoardRouteInfo = {
  slug: string;
  category: string;
  board_type: string;
};

type PostDetailFallbackRoute =
  | ReturnType<typeof boardParentRoute>
  | ReturnType<typeof boardRoute>;

export type PostDetailReturnRoute =
  | PostDetailFallbackRoute
  | "/(tabs)/notifications"
  | "/(tabs)/search"
  | `/(tabs)/search?scope=${string}`
  | "/(tabs)/settings/activity";

export type PostDetailBackDecision =
  | { action: "back" }
  | { action: "navigate"; route: PostDetailReturnRoute }
  | { action: "replace"; route: PostDetailFallbackRoute };

export type PostCreateBackDecision =
  | { action: "back" }
  | { action: "navigate"; route: PostDetailReturnRoute }
  | { action: "replace"; route: ReturnType<typeof boardRoute> };

export type EventDayBackDecision =
  | { action: "back" }
  | { action: "navigate"; route: typeof HOME_TAB_ROUTE }
  | { action: "replace"; route: typeof HOME_TAB_ROUTE };

export type EventDetailBackDecision =
  | { action: "back" }
  | { action: "navigate"; route: "/(tabs)/notifications" }
  | { action: "replace"; route: "/events/calendar" };

export type PostEditCompletionDecision =
  | { action: "back" }
  | { action: "replace"; route: ReturnType<typeof postDetailRoute> };

type PostDetailNavigator = {
  canGoBack: () => boolean;
  back: () => void;
  navigate: (route: PostDetailReturnRoute) => void;
  replace: (route: PostDetailFallbackRoute) => void;
};

export function routeBoardId(value: unknown): number | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (typeof candidate !== "string" && typeof candidate !== "number") return null;
  const parsed = Number(candidate);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function boardRoute(boardId: number) {
  return `/board/${boardId}` as const;
}

function eventDayReturnRoute(value: unknown): typeof HOME_TAB_ROUTE | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate === HOME_TAB_ROUTE ? HOME_TAB_ROUTE : null;
}

export function eventDayRoute(dateKey: string, returnTo?: unknown) {
  const path = `/events/day/${dateKey}`;
  const safeReturnTo = eventDayReturnRoute(returnTo);
  return safeReturnTo ? `${path}?returnTo=${encodeURIComponent(safeReturnTo)}` : path;
}

export function eventDayBackDecision(returnTo: unknown, canGoBack: boolean): EventDayBackDecision {
  if (eventDayReturnRoute(returnTo)) return { action: "navigate", route: HOME_TAB_ROUTE };
  if (canGoBack) return { action: "back" };
  return { action: "replace", route: HOME_TAB_ROUTE };
}

function eventDetailReturnRoute(value: unknown): "/(tabs)/notifications" | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate === "/(tabs)/notifications" ? candidate : null;
}

export function eventDetailRoute(eventId: number, returnTo?: unknown) {
  const path = `/events/${eventId}`;
  const safeReturnTo = eventDetailReturnRoute(returnTo);
  return safeReturnTo ? `${path}?returnTo=${encodeURIComponent(safeReturnTo)}` : path;
}

export function eventDetailBackDecision(returnTo: unknown, canGoBack: boolean): EventDetailBackDecision {
  const safeReturnTo = eventDetailReturnRoute(returnTo);
  if (safeReturnTo) return { action: "navigate", route: safeReturnTo };
  if (canGoBack) return { action: "back" };
  return { action: "replace", route: "/events/calendar" };
}

export function postDetailReturnRoute(value: unknown): PostDetailReturnRoute | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (typeof candidate !== "string") return null;
  if (
    candidate === HOME_TAB_ROUTE ||
    candidate === NOTICES_TAB_ROUTE ||
    candidate === COMMUNITY_TAB_ROUTE ||
    candidate === PARTICIPATION_TAB_ROUTE ||
    candidate === COUNCIL_TAB_ROUTE ||
    candidate === "/(tabs)/notifications" ||
    candidate === "/(tabs)/search" ||
    candidate === "/(tabs)/settings/activity"
  ) {
    return candidate;
  }
  if (/^\/board\/[1-9]\d*$/.test(candidate)) return candidate as ReturnType<typeof boardRoute>;
  if (/^\/\(tabs\)\/search\?scope=[a-z-]+$/.test(candidate)) {
    return candidate as `/(tabs)/search?scope=${string}`;
  }
  return null;
}

export function postDetailRoute(postId: number, fromBoardId?: number, returnTo?: unknown) {
  const path = `/board/post/${postId}`;
  const params: string[] = [];
  if (fromBoardId) params.push(`fromBoardId=${fromBoardId}`);
  const safeReturnTo = postDetailReturnRoute(returnTo);
  if (safeReturnTo) params.push(`returnTo=${encodeURIComponent(safeReturnTo)}`);
  return params.length > 0 ? `${path}?${params.join("&")}` : path;
}

export function postCreateRoute(boardId: number, category = "", returnTo?: unknown) {
  const params = [`boardId=${boardId}`, `category=${encodeURIComponent(category)}`];
  const safeReturnTo = postDetailReturnRoute(returnTo);
  if (safeReturnTo) params.push(`returnTo=${encodeURIComponent(safeReturnTo)}`);
  return `/board/post/create?${params.join("&")}` as const;
}

export function postCreateFormInstanceKey(params: {
  boardId?: unknown;
  postId?: unknown;
  category?: unknown;
}) {
  const categoryCandidate = Array.isArray(params.category) ? params.category[0] : params.category;
  const category = typeof categoryCandidate === "string" ? categoryCandidate : "";
  return JSON.stringify([
    routeBoardId(params.boardId),
    routeBoardId(params.postId),
    category,
  ]);
}

export function activityPostEditRouteFromDetail(boardId: number, postId: number) {
  return `/board/post/create?boardId=${boardId}&postId=${postId}&editOrigin=post-detail` as const;
}

export function postEditCompletionDecision(
  boardType: string | undefined,
  editOrigin: unknown,
  canGoBack: boolean,
  postId: number,
): PostEditCompletionDecision {
  const originCandidate = Array.isArray(editOrigin) ? editOrigin[0] : editOrigin;
  if (boardType === "activity_certification" && originCandidate === "post-detail" && canGoBack) {
    return { action: "back" };
  }
  return { action: "replace", route: postDetailRoute(postId) };
}

export function postCreateRouteFromBoardList(
  boardId: number,
  category: string,
  isTabRoot: boolean,
  isActivityCertification: boolean,
  returnTo: unknown,
) {
  return postCreateRoute(boardId, category, isTabRoot && !isActivityCertification ? returnTo : undefined);
}

export function postCreateBackDecision(
  returnTo: unknown,
  canGoBack: boolean,
  boardId: number,
): PostCreateBackDecision {
  const safeReturnTo = postDetailReturnRoute(returnTo);
  if (safeReturnTo) return { action: "navigate", route: safeReturnTo };
  if (canGoBack) return { action: "back" };
  return { action: "replace", route: boardRoute(boardId) };
}

export function postCreateCompletionRoute(boardType: string | undefined, createdPostId: number, boardId: number) {
  if (boardType === "activity_certification") {
    return postDetailRoute(createdPostId, boardId, PARTICIPATION_TAB_ROUTE);
  }
  return boardRoute(boardId);
}

export function postDetailBackDecision(
  board: BoardRouteInfo | null | undefined,
  canGoBack: boolean,
  fromBoardId?: unknown,
  returnTo?: unknown,
): PostDetailBackDecision {
  const safeReturnTo = postDetailReturnRoute(returnTo);
  if (safeReturnTo) return { action: "navigate", route: safeReturnTo };
  if (canGoBack) return { action: "back" };
  const sourceBoardId = routeBoardId(fromBoardId);
  if (sourceBoardId) return { action: "replace", route: boardRoute(sourceBoardId) };
  return { action: "replace", route: boardParentRoute(board) };
}

export function navigateFromPostDetail(
  board: BoardRouteInfo | null | undefined,
  fromBoardId: unknown,
  returnTo: unknown,
  navigator: PostDetailNavigator
) {
  const decision = postDetailBackDecision(board, navigator.canGoBack(), fromBoardId, returnTo);
  if (decision.action === "back") {
    navigator.back();
    return;
  }
  if (decision.action === "navigate") {
    navigator.navigate(decision.route);
    return;
  }
  navigator.replace(decision.route);
}

export function boardParentRoute(board?: BoardRouteInfo | null) {
  if (!board) return HOME_TAB_ROUTE;
  if (board.board_type === "notice" || board.slug.includes("notice")) return NOTICES_TAB_ROUTE;
  if (board.slug === "event-album" || board.board_type === "resource" || board.category === "resources") {
    return COMMUNITY_TAB_ROUTE;
  }
  if (
    board.slug.includes("club") ||
    board.slug.includes("study") ||
    board.slug.includes("networking") ||
    board.slug.includes("alumni") ||
    board.category === "club" ||
    board.category === "study" ||
    board.category === "alumni" ||
    board.category === "participation"
  ) {
    return PARTICIPATION_TAB_ROUTE;
  }
  if (
    board.slug === "suggestions" ||
    board.slug === "mutual-aid" ||
    board.category === "council" ||
    board.category === "gsa"
  ) {
    return COUNCIL_TAB_ROUTE;
  }

  // Legacy community boards (including community-major) are entered from Home.
  // The hidden all-boards tab is not a user-facing fallback destination.
  return HOME_TAB_ROUTE;
}
