type Refetch = () => Promise<unknown>;

export function enabledRefetch(enabled: boolean, refetch: Refetch): Refetch | undefined {
  return enabled ? refetch : undefined;
}

export function noticeRefreshControlRefreshing({
  boardsLoading,
  boardsRefetching,
  postsRefetching,
}: {
  boardsLoading: boolean;
  boardsRefetching: boolean;
  postsRefetching: boolean;
}): boolean {
  return !boardsLoading && (boardsRefetching || postsRefetching);
}

export async function refreshQueries(
  refreshers: readonly (Refetch | null | undefined)[],
): Promise<void> {
  const enabled = refreshers.filter((refetch): refetch is Refetch => Boolean(refetch));
  await Promise.allSettled(enabled.map((refetch) => refetch()));
}
