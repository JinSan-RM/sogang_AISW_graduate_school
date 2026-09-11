# APK regression verification — 2026-09-11

User scope: verify all listed issues except Son Ye-jin's assignments. Rows **4, 11, 12 are excluded**. Existing spreadsheet completion flags are not treated as proof of current APK behavior.

WP5/WP9 P0; this follows `MOBILE_POLISH_2026-09-11.md` and the earlier item-specific source verification. The user explicitly requested APK checks after clarification that prior checks used Expo Go/mobile web.

## Execution checklist

| Row | Scenario | APK result | Evidence |
| --- | --- | --- | --- |
| 1 | Bottom tabs remain above system controls | Partial: Pixel 7 gesture navigation passed; small display, three-button navigation and iPhone unverified | `apk-home-verified.png`: tabs end at y=2316, above system gesture area |
| 2 | Album thumbnails remain visible after selection/wraparound | Passed in tested three-image album | `apk-album-third.png`, `apk-album-wrap.png`: all three thumbnails remain visible at image 3 and after returning to image 1 |
| 3 | Deleting the sole comment updates the returning list count to zero | APK pending; production comments were not deleted | Current-source automated coverage is separate from runtime evidence |
| 5 | Report Back closes the report before leaving detail | APK pending | No completed APK scenario |
| 6 | Keyboard does not cover focused inputs/actions; layout restores after dismissal | Passed in tested resource composer | `apk-long-lines-inside-drag.png`, `apk-resource-back.png`; keyboard shown/dismissed and tabs restored |
| 7 | Home Back → reopen → Participation → Back returns Home | Passed | `apk-home-exit.txt` confirms launcher; `apk-reopen-participation.png`, `apk-reopen-back-home.png` |
| 8 | Cold startup uses one stable-size logo | APK animation verification pending | Screen recording timed out and Android System UI showed an ANR; not suitable startup-animation evidence |
| 9 | Profile/notification/account entry and return do not expose the background tab | APK animation verification pending | Static navigation screenshots cannot establish absence of a transition flash |
| 10 | My Posts/Bookmarks header Back returns in one press on repeated visits | Passed, two visits per screen | `apk-my-posts-back.png`, `mypage-back-results.json`, return UI XML files |
| 13 | Council activity-history menu removed | Passed | `apk-council.png`: full menu, no activity-history entry |
| 14 | Long content can be dragged inside the body to expose Register | Passed | `apk-long-lines-before.png`, `apk-long-lines-inside-drag.png`: 30 numbered lines; swipe starts inside body; Register bottom y=1412, keyboard top y=1517 |
| 15 | Resource-create Back restores Resources and its selected category | Passed for hardware Back and header Close | `apk-resource-back.png`, `apk-resource-close.png`: Resources → exam archive restored |
| 16 | Own-post deletion restores the source list; later tab navigation remains correct | APK pending; production posts were not deleted | Current-source automated coverage is separate from runtime evidence |
| 17 | Startup and content loading do not duplicate indicators | APK pending for both situations | Current-source automated coverage passed; no controlled startup/content-loading APK capture completed |
| 18 | Multiple banners do not peek outside their viewport | Passed in observed two-banner Home | `apk-home-ready.png` (2/2), `apk-home-verified.png` (1/2), edges visually inspected |
| 19 | System status-bar icons are dark | Passed | `apk-home-verified.png`, `apk-long-lines-inside-drag.png` |

## Build and environment

The current APK was built, artifact-verified, installed with `adb install -r`, and launched on the Pixel 7 Android 16/API 36 emulator (1080×2400, density 420). Installed package inspection confirms versionCode 4; the existing login was retained. The full current-source frontend suite was rerun: **582/582 passed**, zero failures/skips/cancellations, 80.6 seconds. Log: `outputs/qa/apk-regression-2026-09-11/frontend-tests.txt`. Automated results are not APK runtime proof. The table records 9 passed scenarios, 1 partially verified scenario and 6 pending scenarios; it does not claim all 16 are resolved on every device.

- Build current frontend/native source locally as a bundled Hermes release APK. A temporary Gradle init script sets test versionCode 4 and uses the existing debug signing key for direct installation. No store submission or upload-signing change is requested.
- An initial local TLS proxy was verified against the isolated API, but automatic approval review rejected launching the emulator with the proxy option (`blocked by policy`, no detailed reason). That approach was abandoned and the proxy stopped; no emulator CA trust changes were made. The delivered APK was checked with production-connected read-only and unsubmitted-draft flows. A separate local-data QA APK has **not** been built; destructive APK scenarios remain pending.
- A separate SQLite QA fixture database was prepared with a disposable member, posts, one comment, one bookmark, a four-image album and three banners. This fixture is not used by the delivered APK. No production post/comment was created or deleted during these checks.
- iPhone and physical-device checks are unavailable in this Windows environment and must remain separate from Android emulator results.
- Generated build logs, screenshots, videos, UI XML and test-fixture tools are under `outputs/qa/apk-regression-2026-09-11/` (ignored by Git).

## Current build constraint

- Local native compilation reproduced Ninja's Windows 260-character path error. Shortening only the C++ staging directory did not solve encoded absolute dependency paths. A temporary SUBST alias was also unsuitable because autolinking canonicalized dependency paths; the alias was removed.
- A physical short-path application snapshot exists at `C:/Temp/aiswq`; application files were copied and vendor source files hard-linked. Autolinking now resolves the app, React Native, and safe-area native sources under `C:/Temp/aiswq`, avoiding the original long paths. The current-source hashes are in `source-snapshot-sha256.json`.
- The initial copy included an unnecessary historical `.git.backup-20260428-150911` directory and `dist-release` output. The copy helper now excludes these. Existing copied files are retained because automatic approval review rejected deletion, including the retry after the user's APK request. Original project files are preserved.
- A downloaded test-only `system.img` was instead compressed using Windows NTFS compression, preserving its bytes: 4,415,553,536 logical bytes occupy 2,495,725,568 bytes. This recovered about 1.9 GB without deletion. Available space then exceeded 4 GB and the build continued.
- The physical snapshot initially still generated one 311-character C++ object path. Changing only the generated C++ staging location to `C:/aqx` reduced the maximum generated ARM64 object path to 231 characters. App native compilation now proceeds past the former Ninja failure.
- Worklets was compiled for both ARM64 and x86_64 in the physical snapshot. Reanimated uses binaries compiled earlier in this verification attempt: 156 source/configuration files match the snapshot, both ABIs have identical compiler definitions/options/link flags and toolchains, and the cached binaries postdate their sources. Current runtime dependencies are copied from the active build. `native-cache-reuse.json` records the source, destination and SHA-256 values; the temporary init script disables only the redundant Reanimated CMake compilation tasks. Application code and resources continue to build from the current snapshot.
- APK packaging subsequently completed; the runtime results above use captures from the installed versionCode 4 APK, not source tests or prior Expo Go captures.
- Full application C++, Java/Kotlin and Metro compilation completed. Metro bundled 1,502 modules and 56 assets. The merged-manifest validation passed for target API 36. Android lint vital checks also passed on the retry.
- The first full build reached Java-resource merging but ran out of disk space (`gradle-build-disk-failure.txt`). Generated native/build output was compressed without changing file contents, and the retry used one Gradle worker with 1,536 MiB heap / 768 MiB metaspace.
- That retry reached `packageRelease` but reported `newPosition < 0`. Archive inspection located one truncated output from the disk-full build: `optimized_processed_res/release/optimizeReleaseResources/resources-release-optimize.ap_`. It was preserved as `disk-full-resources.ap_.broken`; the other 13 app-build archives passed full ZIP CRC checks. Gradle regenerated the optimized-resource output successfully. About 3.4 GB was available before this retry.

## Built artifact

- Gradle `:app:assembleRelease`: **BUILD SUCCESSFUL**, exit 0. The optimized resource archive was regenerated successfully.
- APK: `outputs/android/AI-SW-CAMPUS-0.1.0-4-mobile-fixes-test.apk`, 78,580,299 bytes, version 0.1.0 (4).
- SHA-256: `a0ebe9957153be4c474bb12d9209586288813a84d4a29c426a1d0111e89c04fe`.
- `artifact-verification.json`: all APK entries pass CRC; signature verifies and matches the previous test APK certificate; 16 KiB ZIP alignment passes; expected package/version/target API and ARM64/x86_64 libraries are present; no Android debuggable flag; production API is present in the Hermes bundle; 247 source hashes match the workspace and build snapshot.
- Update installation and MainActivity launch succeeded on the existing Pixel_7 emulator. `installed-package.txt` and `apk-launch.txt` record the package and launch result. Prior Expo Go captures are not used as APK proof.

## Runtime observations and limits

- The initial high-resolution startup recording exceeded its timeout and Android **System UI** displayed an ANR. Recording was stopped and the system recovered after choosing Wait. This does not establish the cause or prove that startup animation is correct. `apk-home.png` contains that system dialog and must not be used as a passing Home screenshot.
- The first Home notice request showed an error. Tapping Retry loaded notices successfully; `apk-home-verified.png` shows the recovered screen. The cause of the initial request failure was not established.
- The long-body draft contained 30 numbered lines. A swipe from (540,1350) to (540,600), starting inside the focused body, exposed the entire Register button above Gboard. The draft was closed without submission. Earlier `apk-long-body-*` captures contain only a short bulk-input result and are not the long-content proof.
- Header Back returned to the My Page drawer in one press on each of two My Posts visits and two Bookmarks visits. XML assertions in `check-mypage-back.py` and `mypage-back-results.json` cover the last three visits; the first visit is recorded in `apk-my-posts-back.png/xml`.
- Runtime evidence is limited to one Android emulator and the scenarios above. Physical Android devices, iPhone, startup animation, transition flashes, both controlled loading states and production-data deletion remain unverified.
