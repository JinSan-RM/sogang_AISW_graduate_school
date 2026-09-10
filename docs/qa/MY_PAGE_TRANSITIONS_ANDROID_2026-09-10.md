# My Page settings transition — 2026-09-10

Scope: WP5/WP9 P0 My Page usability, QA 145–147. The reported issue is the underlying tab appearing while entering or returning from Profile, Notifications, or Account settings.

## Cause and correction

The drawer previously slid closed for 180 ms before a 170 ms timer pushed settings. On Back, it navigated to the original tab first, then reopened with a 210 ms slide. Both sequences exposed that tab between the two intended screens.

The drawer now remains fully open while the selected settings route mounts. The shared settings hook waits for focus and layout, then allows the native navigation commit a paint opportunity across two animation frames before removing the covering drawer. Waiting only for layout was insufficient in Android execution: an intermediate version still showed one Home frame for Account and four for Notifications. The final paint wait is canceled on blur/unmount, rescheduled on layout, and checks focus again before acknowledgment. It is a rendering opportunity, not a native presentation-completion signal; the video evidence below establishes the observed result.

On Back, the drawer appears fully open over settings first. Android's native Modal `onShow` then triggers the original-tab navigation underneath it; web/iOS use the overlay layout callback. The callback is consumed once. The saved origin and mounted tab state are retained, with Home only as the missing-origin fallback. Explicit drawer close still slides, and Android Modal Back priority remains intact.

The three covered settings routes reveal without a separate stack slide; Settings index remains first. Duplicate menu taps and logout are ignored during the brief handoff. Selecting the already focused settings page through an edge-opened drawer simply reveals the current form. Profile saving, notification changes, account actions, and other drawer menu navigation retain their existing behavior.

## Android execution and evidence

Device: Pixel 7 emulator, Android 16 / API 36, 1080 × 2400. Before recordings use installed package `kr.ac.sogang.aisw.campus`, APK `AI-SW-CAMPUS-0.1.0-3-comment-cache-fix-test.apk`. After recordings use current source through Expo Go (`host.exp.exponent`, Metro 8083), not a newly built APK.

All evidence is under `outputs/qa/mypage-transition-2026-09-10/`. The final `dev-painted-*` recordings assert the foreground package, verify that the selected settings screen actually replaced the drawer, and verify return to My Page using UI XML. No settings were saved or account operations submitted.

| Route | Before recording | Final source recording | Back action |
| --- | --- | --- | --- |
| Profile | `before-profile.mp4` | `dev-painted-profile.mp4` | Header |
| Notifications | `before-notifications.mp4` | `dev-painted-notifications.mp4` | Android system Back |
| Account | `before-account.mp4` | `dev-painted-account.mp4` | Android system Back |

The existing APK exposes Home in all three round trips. Final recordings show the full settings page followed by the full My Page drawer. Header Back was also exercised for Notifications in the earlier `dev-notifications` run; the remaining entry flash in that intermediate run led to the paint-wait correction.

| Route | Before: Home frames / sampled frames | Final source: Home frames / sampled frames |
| --- | --- | --- |
| Profile | 26 / 133 | 0 / 166 |
| Notifications | 18 / 107 | 0 / 238 |
| Account | 19 / 108 | 0 / 176 |

`analyze.py` extracts 20 fps frames without resizing, cropping, or annotations and checks the large blue Home banner region. `frame-analysis.json` stores sampled frame counts, detected Home frames, and video hashes. This region is white on the drawer and the three settings pages. The original MP4s and full-size PNGs are preserved. Intermediate runs (`after-*`, `dev-*` without `painted`, `final-account`, `verified-account`) are diagnostic artifacts and are not final pass evidence.

Useful captures: `before-profile-frames/frame-017.png` shows the unwanted Home frame; `dev-painted-profile-destination.png` shows Profile; `dev-painted-profile-end.png` shows return directly to the drawer. Corresponding destination/end captures exist for Account and Notifications.

## Automated verification

- Before the first correction, three real-provider tests and three return-order tests failed for delayed navigation and navigating to the origin before showing the drawer.
- Focused suite: **16/16 passed**. It covers all three destinations, retained forms, duplicate taps, delayed/mismatched acknowledgments, original Participation-tab preservation, one-shot native `onShow`, explicit drawer close, layout/focus ordering, frame boundaries, and cancellation on blur.
- Full frontend suite: **557/557 passed**, recorded in `frontend-tests.txt` in the QA directory.
- `npm run typecheck`: passed.
- Scoped ESLint: 0 errors; one pre-existing unused `Ionicons` import warning in Notifications. The final hook/test delta passes lint without warnings.
- Read-only code review, including the final paint/cancellation refinement: no actionable findings; reviewer independently reran the 16 focused tests.

## Remaining verification

`Phase 5 QA`: repeat these transitions, reopening, and gesture/button Back on the final packaged Android build and physical devices, and verify iOS/web appearance. The user requested APK generation after the full fix batch, so no APK was built for this change. Development screenshots and unit tests do not replace that final packaged check.
