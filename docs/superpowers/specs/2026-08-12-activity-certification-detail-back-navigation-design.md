# Activity Certification Detail Back Navigation Design

## Goal

When a user opens an activity-certification post from its list and presses the header back button or Android hardware back, return to the exact list screen that opened the detail. Preserve the selected participation group (`동아리`, `스터디`, or `네트워킹`), the selected `활동 인증` mode, and the existing list state.

## Root Cause

Board lists already append `fromBoardId` to post-detail routes. The detail screen reads that parameter, but the shared back-navigation decision currently ignores it. Every participation post therefore replaces the current screen with `/(tabs)/participation`, whose default embedded board is the club guide. This resets the screen to `동아리` and `안내`.

## Design

- Pass the detail route's `fromBoardId` into the shared post-detail back-navigation decision.
- For an activity-certification board only, choose the native back action when `fromBoardId` is a valid positive board ID and the router can go back.
- Reusing the existing navigation stack preserves the mounted participation board screen and therefore its group, `활동 인증` selection, list data, and scroll state.
- Keep the existing product-parent replacement behavior when the detail was opened directly, the origin is invalid, or no back stack exists.
- Keep all non-activity-certification board behavior unchanged.
- The existing shared handler remains the single source for both the header button and Android hardware back.

## Testing

- Add a navigation unit test proving that an activity-certification detail with a valid origin and history chooses `back`.
- Add tests proving that a missing or invalid origin keeps the current participation-parent replacement behavior.
- Keep the existing participation-guide test to ensure ordinary participation details still replace to the participation tab.
- Verify the focused navigation tests, the complete frontend suite, and TypeScript type checking.

## Out of Scope

- Changing the participation tab layout or default board.
- Restoring activity-certification state for a direct external link with no prior list screen.
- Changing community, notice, council, or other board back-navigation behavior.
