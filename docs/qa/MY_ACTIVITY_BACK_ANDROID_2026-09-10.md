# My Activity single-press Back — 2026-09-10

Scope: WP5/WP9 P0 My Page usability. The user reported that leaving My Posts or Bookmarks with the header `<` could require repeated presses.

## Reproduction and cause

On the installed Android APK, opening My Posts from the drawer and pressing `<` returns to the standalone Settings index, not the original drawer. After closing it, reopening the drawer, opening Bookmarks, and returning, another `<` still leaves an identical My Page screen visible. The activity route used `router.replace("/(tabs)/settings")`; replacing the current entry does not remove an earlier Settings index in the retained stack. Repeated visits therefore accumulate duplicate index screens.

The issue is repeated navigation history, not a missed touch on the first clean visit. In the first clean sequence the standalone index could still be left with one more press.

## Correction

Activity now uses the same `useReturnToMyPageDrawer` hook as Profile, Notifications, and Account. Header and Android system Back restore the full drawer and reactivate its remembered origin under the covering overlay. Closing that drawer reveals the original tab without traversing Settings index duplicates.

Drawer entry recognizes `/settings/activity` after separating the query string for its layout acknowledgment, while pushing the full `?type=posts` or `?type=bookmarks` URL. The already-focused fast path remains limited to exact queryless URLs, so selecting another activity filter does not silently retain the old filter. Activity also disables the separate native stack slide.

The extended Android check found a related existing issue: Bookmarks → post detail → Back reset the list to My Posts (`filter-before-after-detail.png`). Activity now includes its normalized type in the detail return URL. The common return-route validator accepts only the three supported activity types, rejects extra/duplicate parameters, and retains compatibility with the old queryless route. Pagination and refresh behavior are unchanged.

## Actual Android execution

Pixel 7 emulator, Android 16 / API 36, 1080 × 2400. Before: installed package `kr.ac.sogang.aisw.campus`, `AI-SW-CAMPUS-0.1.0-3-comment-cache-fix-test.apk`. After: current source in Expo Go (`host.exp.exponent`, Metro 8083). No new APK was built.

Evidence directory: `outputs/qa/my-activity-back-2026-09-10/`. Original screenshots, UI XML, and 12-second screen recordings are retained. The `dev-*` capture helper verifies the foreground package; return assertions require the drawer-specific `마이페이지 닫기` marker, not merely the shared My Page title.

| Sequence | Result | Evidence |
| --- | --- | --- |
| APK: My Posts → `<` | Standalone index appears | `before-posts.mp4`, `before-posts-end.png` |
| APK: reopen → Bookmarks → `<` → another `<` | Still on an identical standalone My Page | `before-bookmarks.mp4`, `before-bookmarks-second-back.png` |
| Source: My Posts → one `<` | Original drawer | `dev-posts.mp4`, destination/end PNGs |
| Source: Bookmarks → one `<` | Original drawer; correct bookmark rows | `dev-bookmarks.mp4`, destination/end PNGs |
| Source: My Posts again → one `<` | Original drawer; correct authored rows | `dev-posts-repeat.mp4`, destination/end PNGs |
| Source: close restored drawer once | Home is visible | `dev-home-after-close.png` |
| Final source after fresh Expo Go launch: Bookmarks → detail → header Back | Bookmarks title and rows retained | `dev-bookmarks-before-detail.png`, `dev-bookmarks-detail.png`, `dev-bookmarks-after-detail.png` |
| Final source: list → one system Back → another system Back | Drawer first, then Home | `dev-bookmarks-hardware-drawer.png`, `dev-home-after-hardware-close.png` |
| Final source: reopen Bookmarks → one header `<` | Original drawer | `dev-final-bookmarks.mp4`, destination/end PNGs |

The optional non-Home-origin probe reached Participation, which has no My Page header button; that helper stopped at the missing control and is not pass evidence. It did not change application code or device navigation settings. Original Participation-tab preservation remains covered by the provider tests.

## Verification

- RED before source changes: 6 expected failures (three Activity header replacements, two query handoffs, and the shared-route contract); 11 existing tests passed. Log: `red-tests.txt`.
- GREEN: 21/21 focused Activity, drawer, layout/focus, and Back tests passed.
- Filter-return RED: four expected failures before the additional correction (`filter-red-tests.txt`). The tests exercise each real Activity row callback, detail-route encoding and return decisions, and invalid/duplicate/extra query rejection.
- Final full frontend suite: 564/564 passed (`full-tests.txt`).
- `npm run typecheck`: passed.
- ESLint on changed production/test files: passed with no warnings or errors.
- Scoped read-only code review: no concrete regressions found.
- Follow-up review of filter preservation and strict return-route validation: no findings.

## Remaining verification

`Phase 5 QA`: repeat on the final packaged Android build and physical devices, and verify iOS/web. APK generation remains deferred until the user’s requested fix batch is complete. These development-runtime captures are not final packaged-build evidence.
