# Home Notice Selection Design

## Goal

The Home screen shows two notices selected across every active board whose `board_type` is `notice`. This includes the all/general, academic, event, webinar, and other notice categories. The behavior is limited to the Home screen.

## Selection Rules

1. Load posts from every active notice board.
2. Combine the results and remove duplicate post IDs.
3. Ignore `is_pinned` and order every eligible post by `created_at` descending, using the post ID descending as a deterministic tie-breaker.
4. Display the first two posts.

An older pinned notice never outranks a newer notice on Home. Pin priority remains available on screens that already use it, but it does not affect Home selection.

## Architecture and Data Flow

The Home screen will reuse the existing notice-feed building blocks instead of selecting one preferred notice-board slug. It will derive all active notice boards with `isNoticeContentBoard`, load every page of their posts with a Home-only multi-board query, and pass the combined results to a small Home selection helper in `frontend/utils/noticeFeed.ts`. Loading every page prevents backend pin-priority pagination from hiding newer unpinned notices from Home.

The helper owns de-duplication, latest-first ordering that ignores `is_pinned`, and the two-item limit. The Notices tab keeps its existing category filtering and pinned-first list behavior. The backend post-list API and its default ordering remain unchanged.

## Error and Empty States

The current Home loading, retry, and empty states remain. A board-list failure or multi-board post-query failure shows the existing Home notice error state. If there are no active notice boards or no returned posts, Home shows the existing empty state.

## Testing

Frontend regression tests will cover:

- notices from multiple active notice categories are eligible;
- duplicate post IDs are removed;
- the two newest notices are selected when no posts are pinned;
- an older pinned notice does not outrank a newer unpinned notice;
- inactive and non-notice boards are excluded from the Home source set.

The focused notice-feed tests, full frontend test suite, and frontend typecheck will be run before completion.
