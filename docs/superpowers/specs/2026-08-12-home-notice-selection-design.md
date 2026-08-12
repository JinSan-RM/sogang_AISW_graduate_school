# Home Notice Selection Design

## Goal

The Home screen shows two notices selected across every active board whose `board_type` is `notice`. This includes the all/general, academic, event, webinar, and other notice categories. The behavior is limited to the Home screen.

## Selection Rules

1. Load posts from every active notice board.
2. Combine the results and remove duplicate post IDs.
3. Put pinned posts before unpinned posts.
4. Within each pinned or unpinned group, order posts by `created_at` descending, using the post ID descending as a deterministic tie-breaker.
5. Display the first two posts.

The resulting behavior is:

- No pinned posts: show the two newest notices.
- One pinned post: show that pinned post and the newest unpinned notice.
- Two or more pinned posts: show the two newest pinned notices.

## Architecture and Data Flow

The Home screen will reuse the existing notice-feed building blocks instead of selecting one preferred notice-board slug. It will derive all active notice boards with `isNoticeContentBoard`, load their posts with the existing multi-board query, and pass the combined results to a small Home selection helper in `frontend/utils/noticeFeed.ts`.

The helper owns de-duplication, pinned-first ordering, latest-first ordering, and the two-item limit. The Notices tab keeps its existing category filtering and list behavior. The backend post-list API and its default ordering remain unchanged.

## Error and Empty States

The current Home loading, retry, and empty states remain. A board-list failure or multi-board post-query failure shows the existing Home notice error state. If there are no active notice boards or no returned posts, Home shows the existing empty state.

## Testing

Frontend regression tests will cover:

- notices from multiple active notice categories are eligible;
- duplicate post IDs are removed;
- no pinned posts produce the two newest notices;
- one pinned post is followed by the newest unpinned notice;
- multiple pinned posts produce the two newest pinned notices;
- inactive and non-notice boards are excluded from the Home source set.

The focused notice-feed tests, full frontend test suite, and frontend typecheck will be run before completion.
