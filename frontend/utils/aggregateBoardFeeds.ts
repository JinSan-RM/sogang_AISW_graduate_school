export type BoardFeedMode = "pending" | "board" | "resources" | "council_activity";

type BoardFeedModeInput = {
  activeBoardId: number;
  resolvedBoard?: {
    id: number;
    boardType?: string | null;
    boardSlug?: string | null;
  } | null;
  filterOwnerBoardId?: number | null;
  selectedFilter: string;
};

export function boardFeedMode({
  activeBoardId,
  resolvedBoard,
  filterOwnerBoardId,
  selectedFilter,
}: BoardFeedModeInput): BoardFeedMode {
  if (
    !resolvedBoard
    || resolvedBoard.id !== activeBoardId
    || filterOwnerBoardId !== activeBoardId
  ) {
    return "pending";
  }
  if (resolvedBoard.boardSlug === "council-activity" || resolvedBoard.boardSlug === "gsa-activity") {
    return "council_activity";
  }
  if (resolvedBoard.boardType === "resource" && selectedFilter === "전체") {
    return "resources";
  }
  return "board";
}

export function boardFeedQueryEnabled(mode: BoardFeedMode) {
  return {
    board: mode === "board",
    resources: mode === "resources",
    councilActivity: mode === "council_activity",
  };
}

type BoardFeeds<T> = {
  board: T;
  resources: T;
  councilActivity: T;
};

export function selectActiveBoardFeed<T>(mode: BoardFeedMode, feeds: BoardFeeds<T>): T | null {
  if (mode === "pending") return null;
  if (mode === "resources") return feeds.resources;
  if (mode === "council_activity") return feeds.councilActivity;
  return feeds.board;
}

export function canLoadNextBoardFeedPage(query: {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isRefreshingFirstPage: boolean;
}): boolean {
  return query.hasNextPage && !query.isFetchingNextPage && !query.isRefreshingFirstPage;
}

type BoardFeedControl = {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isRefreshingFirstPage: boolean;
  refreshFirstPage: () => unknown;
  loadNextPage: () => unknown;
  refetch: () => unknown;
};

export function createBoardFeedController<T extends BoardFeedControl>(
  mode: BoardFeedMode,
  feeds: BoardFeeds<T>,
) {
  const query = selectActiveBoardFeed(mode, feeds);

  return {
    query,
    refreshFirstPage: () => query?.refreshFirstPage(),
    loadMore: () => {
      if (query && canLoadNextBoardFeedPage(query)) {
        return query.loadNextPage();
      }
      return undefined;
    },
    retry: () => query?.refetch(),
  };
}

export function boardFeedFooterState(query: {
  isFetchingNextPage: boolean;
  isFetchNextPageError: boolean;
}): "loading" | "retry" | "idle" {
  if (query.isFetchingNextPage) return "loading";
  if (query.isFetchNextPageError) return "retry";
  return "idle";
}
