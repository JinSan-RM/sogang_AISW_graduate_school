export type BoardFeedMode = "board" | "resources" | "council_activity";

type BoardFeedModeInput = {
  boardType?: string | null;
  boardSlug?: string | null;
  selectedFilter: string;
};

export function boardFeedMode({
  boardType,
  boardSlug,
  selectedFilter,
}: BoardFeedModeInput): BoardFeedMode {
  if (boardSlug === "council-activity" || boardSlug === "gsa-activity") {
    return "council_activity";
  }
  if (boardType === "resource" && selectedFilter === "전체") {
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

export function selectActiveBoardFeed<T>(mode: BoardFeedMode, feeds: BoardFeeds<T>): T {
  if (mode === "resources") return feeds.resources;
  if (mode === "council_activity") return feeds.councilActivity;
  return feeds.board;
}

export function canLoadNextBoardFeedPage(query: {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
}): boolean {
  return query.hasNextPage && !query.isFetchingNextPage;
}

export function boardFeedFooterState(query: {
  isFetchingNextPage: boolean;
  isFetchNextPageError: boolean;
}): "loading" | "retry" | "idle" {
  if (query.isFetchingNextPage) return "loading";
  if (query.isFetchNextPageError) return "retry";
  return "idle";
}
