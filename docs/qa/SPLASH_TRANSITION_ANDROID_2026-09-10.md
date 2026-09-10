# Android splash size transition — 2026-09-10

Scope: WP9 P0 mobile startup usability. The user reported that the launch image grows on the APK, while web does not show the same transition.

## Reproduction on the installed APK

- Android 16 / API 36, Pixel 7 emulator, `emulator-5554`, 1080 × 2400.
- Package `kr.ac.sogang.aisw.campus`, version `0.1.0`, versionCode `3`.
- Installed APK matches `outputs/android/AI-SW-CAMPUS-0.1.0-3-comment-cache-fix-test.apk`; SHA-256 `4906a08bf54793007c613c2793f2e676188b2b67251020148f9bb4bbae6c5480`.
- Force-stop the package, start ADB `screenrecord`, then launch its MAIN/LAUNCHER activity. The recorded launch shows a small native logo, a larger React logo, and then Home.
- Original recording: `outputs/qa/splash-transition-2026-09-10/splash-before.mp4`. Frames were extracted at 10 fps without resizing, cropping, or annotations. Both frames below show the defect **before** the source fix.

| Sequence | Recorded frame | Black wordmark width |
| --- | --- | --- |
| Native launch screen | `frames/frame-005.png` | 266 px |
| React loading screen immediately afterward | `frames/frame-015.png` | 386 px |

The wordmark grows approximately 45.1%. `record.py`, `measure.py`, and `measurement.json` in the same ignored QA directory preserve capture steps, image bounds, and evidence hashes. The measurement excludes system bars; the original full-size frames are preserved.

## Cause and source correction

The same branding was displayed twice with different sizing rules. Android displayed the generated native splash drawable first. The root layout then displayed `assets/splash-logo.png` (1080 × 2280) as a full-screen React `Image` with `contain`. Its `onLoadEnd` hid the native layer while the React splash remained visible for the readiness gate. A web launch only showed that React image.

The root now calls public `SplashScreen.preventAutoHideAsync()` at module scope on native platforms. While fonts, session hydration, or the existing 1,500 ms minimum duration are pending, native returns no second branded view. Once ready, it mounts the existing navigator and hides the native splash on the first content viewport layout. Web retains its original image and readiness gate and does not control native splash APIs. Auth guards and keyboard avoidance remain in place.

This supersedes the native full-screen React replay described in `ANDROID_BRANDING_2026-09-08.md`; it preserves the artwork, native resources, and minimum duration. The change uses the existing SDK 54 `expo-splash-screen` dependency. Its direct dependency declaration and required lock entries are included with the fix; unrelated release scripts and native branding work remain separate.

Installed Expo SDK 54 source confirms that the public prevent call disables automatic hiding by Expo Router on readiness. Android suppresses pre-draw while retaining the splash, so the ready React viewport can still lay out and explicitly hide it.

## Verification

- Five new tests execute the real root layout with native/React boundaries replaced. Before the fix, all five failed for missing native hold, duplicate native React images, or web calling the native hide API. After the fix, all five pass.
- Native cases cover Android and iOS, module-time hold, independent session/font readiness, the 1,500 ms timer, no second image, no premature hide, hide after content layout, and timer cleanup. The web case covers its original image, minimum duration, ready navigation, and absence of native splash calls.
- Splash tests: **8/8 passed** including the three existing readiness tests.
- Full frontend suite: **548/548 passed**; output saved to `outputs/qa/splash-transition-2026-09-10/frontend-tests.txt`.
- `npm run typecheck`: passed.
- `npx eslint app/_layout.tsx tests/splashLifecycle.test.ts`: passed.
- Read-only review of the layout and lifecycle tests found no actionable issues; the reviewer independently reran the five new tests and checked SDK 54/Router 6 manual splash ownership.

## Remaining verification

No new APK was built or installed for this change, following the user's request to build after the full fix batch. The current APK and the above recording still contain the old behavior. Source tests do not establish the final packaged animation or physical-device appearance.

`Phase 5 QA`: after the final APK build, repeat the same cold launch capture and verify one stable native logo followed by Home/login, with no larger React logo or empty transition. Repeat reopening and signed-out launch on Android, and validate native startup on iOS. Expo Go is unsuitable as proof of the final native splash appearance; SDK 52+ development environments do not fully reproduce it. See the [Expo SDK 54 splash-screen documentation](https://docs.expo.dev/versions/v54.0.0/sdk/splash-screen/).
