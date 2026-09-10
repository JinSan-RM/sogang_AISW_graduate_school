# Long post scrolling and Register access — 2026-09-10

Scope: WP5/WP9 P0 post-composer usability. The user requested scrolling from inside a long body so the Register button can be reached without finding the narrow outside margin.

## Result and applicable fix

The installed APK reproduces Register being inaccessible behind the keyboard after scrolling a long draft. The current source allows a vertical drag starting inside the body to reveal the full Register button above the keyboard.

The applicable production fix is already committed as `4c7bfb5` (`fix: keep text inputs above the native keyboard`). `KeyboardViewport` reserves the IME overlap around the native navigator and releases it when Android hides the keyboard; bottom tabs hide during typing. The existing composer ScrollView can then scroll its footer into the remaining viewport. Neither `KeyboardViewport.tsx` nor the create-form source has changed between that commit and the tested source, `9bf63b3`.

This follow-up records the long-body verification and its acceptance criterion. It does not introduce another input-gesture implementation. An inside-only gesture failure was not reproduced in the tested condition: both runtimes scroll from the body, but the old APK exhausts its scroll range while the footer is still behind the IME. Do not describe this as proof that every reported gesture issue on every device is fixed.

## Actual Android evidence

Pixel 7 emulator, Android 16/API 36, 1080×2400, Gboard. Flow: Community → Resources → new lecture-review post. Approximately 30 numbered draft lines were entered with short pauses. The title was left empty and no post was submitted. Both temporary drafts were closed after testing.

Before runtime: installed package `kr.ac.sogang.aisw.campus`, `AI-SW-CAMPUS-0.1.0-3-comment-cache-fix-test.apk`. Current runtime: Expo Go (`host.exp.exponent`), source through Metro 8083. No new APK was built.

Evidence is in `outputs/qa/long-post-drag-2026-09-10/`. Original full-size screenshots and corresponding UI XML are retained.

| Action/result | Old APK | Current source |
| --- | --- | --- |
| Long draft with keyboard open | `apk-long-draft.png` | `dev-long-draft.png` |
| Swipe upward inside body, x540, y1350→600, 450ms | `apk-inside-drag.png`: body scrolls, Register stays covered | `dev-inside-drag.png`: full Register is visible |
| Follow with the same swipe in the left margin, x25 | `apk-outside-drag.png`: footer remains covered at scroll end | `dev-outside-drag.png`: Register remains visible at scroll end |
| Dismiss keyboard on old APK | `apk-keyboard-hidden.png`: Register appears at its unchanged location | Prior keyboard QA covers restoration after dismissal |

The keyboard top is at y1517 in the observed captures. After the inside drag, the old APK's Register button occupies y1912–2038; the current source's button occupies y1286–1412. UI XML reports even controls behind the keyboard, so finding the `등록` label alone is not a visibility check. The screenshot and whole-button bounds establish visibility.

## Verification for this follow-up

- Reused the geometry assertion from the keyboard QA: old `apk-inside-drag.xml` fails because 2038 > 1517; current `dev-inside-drag.xml` passes because 1412 ≤ 1517. Both the button and label were checked.
- Existing board navigation, design verification, and root splash/navigation tests: **71/71 passed**. Log: `outputs/qa/long-post-drag-2026-09-10/regression-tests.txt`.
- `npm run typecheck`: passed.
- The follow-up changes documentation only; it relies on the existing committed runtime fix and the actual native checks above.

## Remaining verification

`Phase 5 QA`: repeat on the final packaged APK and physical-device keyboard/display combinations. iOS and browser gesture behavior were not exercised here. The user requested APK generation after the full fix batch, so packaged-build verification remains pending.
