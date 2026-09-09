# Android back navigation — WP9

## Report and policy

User sequence: open app, leave from Home with Back, reopen, select Participation, press Back. Back should return Home; a further Back on Home may leave the app. An app-exit record being retained has not been established as the root cause on a physical device.

The installed React Navigation handler falls through to Android when `canGoBack()` is false. Default tab behavior already returns to the first route; missing history is therefore covered explicitly instead of assuming changing the default alone fixes the report.

## Change

- Explicit Home initial tab and initial-route back behavior.
- Android tab-area Back subscription: open drawer first, then non-Home primary tab to Home regardless of history, otherwise preserve existing detail handlers when history is available; no-history non-Home fallback goes Home.
- Focus-scoped cleanup removes the subscription when the authenticated tab area loses focus or unmounts. This subscription is not installed on iOS/web.
- On Android, the visible drawer is hosted in a transparent native Modal so `onRequestClose` handles system Back before underlying screen subscriptions, even if those subscriptions re-register after an API update. The iOS/web overlay tree is unchanged.
- Navigation to Home uses the existing tab, without pushing duplicate Home screens or resetting unrelated detail stacks.

## Verification scope

- Unit tests exercise real TabRouter actions against a deliberately missing-history state and the app's fallback policy.
- Hook tests use mocked native subscriptions/focus to verify consumption, cleanup/reentry, drawer priority, detail delegation, and Android-only registration. They are not physical-device tests.
- Physical-device reproduction and visuals remain Phase 5 QA: no Android device was connected.
- Verification: all 532 frontend tests passed; typecheck and changed-file lint passed. Read-only review identified the drawer listener-priority issue above; the native Modal correction passed re-review with no remaining concrete findings.

## Device check

1. Cold start on Home; press Back to leave; reopen the app.
2. Open Participation; Back must display Home. The next Back on Home may leave the app.
3. Repeat with Notices, Community, and Council, including after repeated app reopen cycles.
4. Open a post list, post detail, edit/create screen, and event detail. Back should first leave the current detail/close its overlay according to existing screen behavior, without exiting the app.
5. Open My Page over Home and Participation. Back closes the drawer, preserving the underlying tab; the next Back follows that tab's policy.
6. Check the same sequence with Android three-button and gesture navigation. Verify existing iOS navigation separately.
