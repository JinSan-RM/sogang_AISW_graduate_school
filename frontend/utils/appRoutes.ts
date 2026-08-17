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
