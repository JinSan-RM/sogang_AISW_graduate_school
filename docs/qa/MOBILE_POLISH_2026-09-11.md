# Mobile polish verification — 2026-09-11

Scope: WP5/WP9 P0. The user requested fixes for the remaining items from the mobile issue audit and screenshots showing the result.

Later on 2026-09-11 the user requested the APK build. That build and its separate installed-APK results are recorded in `APK_REGRESSION_2026-09-11.md`; the Expo Go/web observations below remain their original evidence and are not substituted for packaged-runtime checks.

## Changes

| Issue | Change |
| --- | --- |
| Motion/unexpected navigation when changing tabs after deleting one's post | Deletion uses the validated source-list return path instead of replacing the detail with a new standalone board. Explicit standalone-board origins use `dismissTo`. Confirmation and post-menu state close after success. |
| Deleted posts lingering in retained lists | Deletion now invalidates My Activity, Home album, and Home popular caches as well as the existing shared post/feed caches before navigating. |
| Duplicate loading indicators | Home has one initial spinner and section text placeholders. Notices suppresses pull/pagination indicators during initial loading and suppresses pagination during first-page refresh. Normal pull refresh remains available. |
| Adjacent banner peeking outside the carousel | The measured full-width banner viewport clips overflow; the page gap, page indicator, and automatic paging remain. |
| White system status-bar icons | Dark icons are configured in the root Expo/stack UI, Expo Android configuration, and Android app/splash themes. |

Long-post scrolling and resource-create Back already have source fixes and Android evidence in `LONG_POST_SCROLL_ANDROID_2026-09-10.md` and `RESOURCE_CREATE_BACK_ANDROID_2026-09-10.md`; this change does not alter those flows. Startup-logo duplication was also already fixed; its native lifecycle regression suite was rerun. Packaged after-fix startup appearance still needs the final APK build described in `SPLASH_TRANSITION_ANDROID_2026-09-10.md`.

## Runtime setup

- Android 16 / API 36, Pixel 7 emulator, 1080 × 2400, Expo Go running the current source through Metro.
- Mobile web at a 405 × 900 viewport, running the same source.
- A local FastAPI server using the real application routes with an isolated SQLite QA database, local fixture user/posts, and three existing repository banner assets. No production posts were created or deleted.
- The list-loading capture used a temporary 5-second API delay on Android. The delay was then removed and the loaded list was checked.
- A 5-second delay applied to both browser preflight and data requests initially exceeded the browser client's timeout. Removing the injected delay and retrying returned the normal list; `web-notices-loaded.png` records the successful state.
- The Windows host had memory pressure and the emulator initially showed Android System UI ANRs. After restarting the emulator and limiting Metro workers, the source app completed the flows below. This is not a performance benchmark or a claim of physical-device coverage.
- Temporary QA servers, Metro, and the emulator were stopped after captures; the browser viewport was restored.

## Observed results

| Scenario | Observed result | Local evidence under `outputs/qa/mobile-polish-2026-09-11/` |
| --- | --- | --- |
| Android Home with three banners | The captured second page has no adjacent image visible outside the viewport; clock and system icons are dark against white. | `android-home.png` |
| Android delete from Community → Resources → Exam Archive | The test post disappears, and Resources plus Exam Archive remain selected. | `android-before-delete.png`, `android-after-delete.png` |
| Android tab change after deletion | Notices opens normally; selecting Community opens its documented default album root without exposing the deleted detail or a duplicate board list. | `android-notices-loaded.png`, `android-tabs-after-delete.png`, `android-tab-switch.mp4` |
| Android first notice-list loading | Exactly one loading spinner is visible; the normal notice list appears after the delay. | `android-single-loading.png`, `android-notices-loaded.png` |
| Mobile-web delete and tab navigation | Deletion returns to the original Community resource filter with the deleted item absent; subsequent explicit tab selection uses the established tab defaults. | `web-before-delete.png`, `web-after-delete.png` |
| Mobile-web banner and loading | A single full banner is visible; a new notice category shows one loader, and the list recovers after requests finish. | `web-home-banner.png`, `web-single-loading.png`, `web-notices-loaded.png` |

Screenshots are unedited app captures. The native post-delete, banner/status, and loading captures were visually inspected; UI XML additionally verifies the navigation destinations and remaining post titles. The tab recording is supporting evidence, not a frame-timing measurement.

## Automated checks and review

- Added screen-callback regressions for successful/failed post deletion, Community/My Activity origins, direct-entry fallback, and the actual standalone-board `returnTo` parameter. A review found that `navigate` would push another board for that last case; a failing regression was added before changing it to `dismissTo`.
- Added notice-screen regressions that execute its real refresh expression, proving the initial-loader overlap is suppressed while normal refresh remains available.
- Added a real QueryClient/QueryObserver regression through `useDeletePost`: the retained My Activity list empties after deletion, and inactive bookmarks/Home caches become stale. It failed before the cache change and passes afterward.
- The initial new regressions failed before the fixes. Targeted navigation/loading/startup tests passed after the fixes; the existing startup lifecycle tests continue to pass with the StatusBar mock.
- The final full frontend suite passed **582/582** tests, with zero failures, skips, or cancellations, after the standalone-board correction: `node --import tsx --test --test-concurrency=2 --test-reporter=spec 'tests/**/*.test.ts'`. Output: `outputs/qa/mobile-polish-2026-09-11/frontend-tests-final.txt`; duration 42.4 seconds.
- Final `npm run typecheck`: passed (exit 0).
- Scoped ESLint for the modified screens, hook, helper, and tests: passed (exit 0, no warnings or errors).
- Scoped `git diff --check`: passed (exit 0).
- Independent read-only review found no further actionable defects after the standalone-board correction.

## Limits

Current source is verified on Android Expo Go and mobile web. This task did not generate or install a new APK, verify the packaged native splash, or run iOS/physical-device QA. Those checks remain `Phase 5 QA`; the existing batch-build instruction is preserved. The Android resource/configuration status-bar changes require the next native build to be included in the distributable app.
