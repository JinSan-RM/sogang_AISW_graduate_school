# App-wide keyboard avoidance — Android, 2026-09-10

WP9 / WP5 P0 usability fix. The user reported that typing obscures the screen across the app.

## Cause and changes

The edge-to-edge Android window retained its full height when the keyboard opened. The navigator had no keyboard avoidance, so fixed comment controls and report sheets stayed behind the IME despite native `adjustResize` configuration.

`KeyboardViewport` now reserves keyboard overlap around the root navigator, covering member, auth, legal and admin routes. Web retains a plain View. Native password confirmation has its own wrapper because a React Native Modal occupies a separate window. Bottom tabs hide during input. Login content and the report sheet can scroll within the remaining height; post-detail comment editing allows handled taps while the keyboard is open.

An initial native check also caught residual bottom padding after dismissal. Installed RN 0.81 sends Android `keyboardDidHide` with the visible-frame height excluding system bars; its KeyboardAvoidingView still calculates overlap from that coordinate. Android avoidance is therefore enabled only while the keyboard is visible, with listener cleanup on unmount. iOS keeps normal KeyboardAvoidingView behavior. This restores the original tab position after dismissal.

References consulted: [React Native 0.81 KeyboardAvoidingView](https://reactnative.dev/docs/0.81/keyboardavoidingview), [Expo keyboard handling](https://docs.expo.dev/guides/keyboard-handling/), and the installed ReactRootView / KeyboardAvoidingView sources. The measurements below come from this app's native execution.

## Actual execution

Pixel_7 emulator, Android 16 / API 36, 1080×2400, Expo Go 54.0.8 / SDK 54, authorized production test account. Source ran through Metro; **no new application APK was generated**. QA text remained local and unsent. No post, comment, report, profile update or account deletion was submitted.

All images are unmodified ADB captures with matching UI Automator XML in `outputs/qa/keyboard-avoidance-2026-09-10/`. This generated directory is ignored by Git.

| Sequence | Result | Capture |
| --- | --- | --- |
| 1. Before: focus comment input | Input/send bottom 2080 exceeds keyboard top 1517; both hidden | [Before comment](../../outputs/qa/keyboard-avoidance-2026-09-10/01-before-comment.png) |
| 2. Before: Report → Other → focus detail | Detail bottom 1915 exceeds keyboard top 1517; input and submit hidden | [Before report](../../outputs/qa/keyboard-avoidance-2026-09-10/02-before-report.png) |
| 3. After: type an unsent comment | Input bottom 1455 and send bottom 1454 are above keyboard top 1517 | [Comment typing](../../outputs/qa/keyboard-avoidance-2026-09-10/07-final-comment.png) |
| 4. Dismiss keyboard | Original Home tab bounds `[0,2165][216,2316]` restored; draft retained | [Restored layout](../../outputs/qa/keyboard-avoidance-2026-09-10/08-final-keyboard-dismissed.png) |
| 5. Report → Other → type | Detail bottom 1289 and full submit button bottom 1465 are above keyboard top 1517 | [Report typing](../../outputs/qa/keyboard-avoidance-2026-09-10/09-final-report.png) |
| 6. Open post editor and type content | Content field and full register button remain visible above IME | [Post editor](../../outputs/qa/keyboard-avoidance-2026-09-10/11-post-editor.png) |
| 7. Focus profile's last field and scroll | Phone field remains visible; scroll exposes full completion button, bottom 1408 < numeric IME top 1633 | [Profile scrolled](../../outputs/qa/keyboard-avoidance-2026-09-10/13-profile-scrolled.png) |
| 8. Focus native password confirmation | Empty secure field and Cancel stay above IME; Back, refocus, Cancel, reopen/refocus and Cancel all work | [Password Modal](../../outputs/qa/keyboard-avoidance-2026-09-10/15-password-modal-focused.png) |

Report Back was rechecked after this change: first hardware Back dismisses the keyboard while retaining the report, next Back closes the report while retaining detail, next Back returns to the list. `10-final-report-keyboard-dismissed.xml` records the intermediate sheet with the original tab bounds. Password Modal autofocus marks the field focused; a tap was used to open the keyboard in Expo Go. No password was entered.

## Verification

- Before implementation, the one-off `check_visible.py` geometry assertions failed on the actual comment/report captures (2080/1915 > 1517), then passed on final captures. The layout-restoration assertion also failed on the initial KAV attempt (tab shifted upward 199 px) and passed after the visibility guard.
- `npm test`: 543/543 passed, including existing comment-keyboard, comment-cache and report Back regressions. Log: `outputs/qa/keyboard-avoidance-2026-09-10/frontend-tests.log`.
- `npm run typecheck`: passed.
- Changed-file ESLint: passed, no warnings/errors.
- Independent scoped code review: no critical/important findings; requested long-form and native Modal checks completed above.

Phase 5 QA: final packaged APK, physical Android keyboards/display sizes and iOS keyboard behavior remain to be verified after the requested batch of fixes. Auth/admin routes share the reviewed root wrapper; this run exercised the representative member/editor/Modal paths listed above, not every route individually.
