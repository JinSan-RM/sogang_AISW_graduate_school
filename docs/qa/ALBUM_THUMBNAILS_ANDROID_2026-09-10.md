# Android album thumbnails turn gray — 2026-09-10

Work package: CODEX.md WP9 (Phase 4 integration). Status: **Fixed in application source and installable test APK; authenticated Android emulator verification passed. Physical-device verification remains Phase 5 QA.**

## Update: actual application fix and authenticated captures

The user subsequently requested implementation and supplied a test login. Applied the constant-border fix directly to `frontend/app/(tabs)/board/post/[postId].tsx`: the base thumbnail has `borderWidth: 2` and `borderColor: "transparent"`; the active style changes only the color. No media-access, API, authentication, or route logic changed.

Opened the original application APK, logged in through its normal login screen, and navigated **Community → 행사 사진첩 → 제59회 학위수여식** using live production data. The original APK reproduced the reported behavior after selecting photos 1 → 2 → 3 → 4. Installed the fixed application APK with `adb install -r`, retained the authenticated session, and opened the same album. All thumbnails remained visible after the same sequence, next-photo wraparound, previous-photo wraparound, and direct thumbnail selection. These are actual application screens, not the isolated diagnostic screen used below.

Actual Android screen captures (Pixel_7, Android 16 / API 36, 1080 × 2400):

| Original application, fourth photo selected | Fixed application, fourth photo selected |
| --- | --- |
| ![Before](../../outputs/qa/album-thumbnail-fix-2026-09-10/before-photo-4.png) | ![After](../../outputs/qa/album-thumbnail-fix-2026-09-10/after-photo-4.png) |

Pixel verification on the inner 110 × 110 area of each thumbnail: original `[0, 0, 0, 12100]` non-gray pixels; fixed `[12100, 12100, 12100, 12100]` in every inspected selection/wraparound frame. Evidence: `outputs/qa/album-thumbnail-fix-2026-09-10/verification.json`. The images are unchanged ADB screenshots. No credentials are stored in these artifacts.

Validation:

- Existing frontend tests: **532/532 passed**.
- TypeScript check and changed-file ESLint: passed.
- Independent read-only review: no actionable regression.
- Exported the complete Expo Router app entry (1,498 modules), then compiled it with the project's Hermes compiler. The diagnostic entry was excluded.
- Verified 54 exported media/font assets against the original APK by bytes or decoded PNG pixels. Confirmed 1,147 native/resource/config entries remained byte-identical.
- New APK passed zipalign 16 KB checks and APK v2/v3 signature verification; install and authenticated runtime checks passed. No AndroidRuntime/ReactNativeJS error was reported in the inspected runtime log.
- Output: `outputs/android/AI-SW-CAMPUS-0.1.0-3-album-thumbnail-fix-test.apk` (119,209,203 bytes).
- SHA-256: `3e433b36a8fe6431d6445900ec2f04db8483721e3b32b1b811fbea52fc5f906c`.
- It uses the existing debug signing key for direct installation, version 0.1.0 / code 3, and the production API. The original APK/AAB is preserved; this is not a Play Store release.

The following sections retain the initial diagnostic evidence. Their earlier login and implementation limitations are superseded by this update.

## Finding

The album's selected thumbnail receives `borderWidth: 2`; deselecting it removes that property entirely. In the APK's React Native 0.81.5 Android runtime, this causes the parent with `overflow: "hidden"` and rounded corners to stop drawing its child image. The gray `#E5E7EB` thumbnail background remains. Each visited thumbnail becomes gray after deselection, eventually leaving only the currently selected thumbnail visible.

Reproduction with local image data rules out a download or signed-URL failure as a necessary cause. Setting a constant two-point border on all thumbnails, transparent when inactive and blue when active, restored the images immediately and preserved all four images throughout a full selection cycle in the diagnostic screen.

Production code locations:

- `frontend/app/(tabs)/board/post/[postId].tsx:724`: conditional active style.
- Same file, line 1798: gray background, rounded corners, and hidden overflow.
- Same file, line 1805: selected-only border width and color.

The installed React Native source also explains the clipping failure: `ReactViewManager.kt:289` resets an omitted border width to `Float.NaN`; `BackgroundStyleApplicator.kt:90` stores it in `BorderInsets`; `BorderInsets.kt` resolves non-null values, including NaN; `BackgroundStyleApplicator.kt:348` uses those insets when clipping children. This internal NaN path was traced in source, without native debugger instrumentation. The direct runtime evidence establishes the conditional border removal as the trigger.

## Runtime evidence

- Original APK: `outputs/android/AI-SW-CAMPUS-0.1.0-3-back-navigation-test.apk`.
- Original SHA-256: `3a4a653636768f70571bff5abdae467398ebc507badab6365bf46ba2a212d324` (rechecked against the file).
- Emulator: Pixel_7, Android 16 / API 36, x86_64.
- The original APK installed and opened successfully, but the real album route required login. No test credentials were supplied during this investigation; no authenticated production post was inspected.
- A separate diagnostic APK reused the original APK's native libraries and resources, replacing only the JavaScript entry bundle. It imported the real `MediaImage` and `useMediaAccessUrl`, extracted the actual gallery styles from post detail, and used four existing repository images as local data URIs. It preserved the horizontal thumbnail ScrollView, Pressables, percentage-sized images, and state-driven selection.
- This isolates the album rendering defect in the actual APK runtime; it is not a claim that the production post was opened or that every device was tested.
- APK packaging, alignment, signing, and signature verification succeeded. The original release/test artifact was preserved.

Observed sequence:

1. Initial render: all four images visible.
2. Select image 2: image 1 becomes gray.
3. Select image 3: images 1 and 2 become gray.
4. Select image 4: images 1–3 become gray; image 4 remains visible.
5. Enable constant border width: images 1–3 immediately become visible again.
6. Cycle 4 → 1 → 2 → 3 → 4: all thumbnails remain visible.

Screenshots are stored locally in `.codex-tmp/album-gray-diagnosis/`:

- [Initial state](../../.codex-tmp/album-gray-diagnosis/initial.png)
- [Reproduced issue, image 4 selected](../../.codex-tmp/album-gray-diagnosis/original-photo-4.png)
- [Constant-border experiment after a full cycle](../../.codex-tmp/album-gray-diagnosis/stable-cycle-photo-4.png)

Pixel check of each thumbnail's inner 110 × 110 region (12,100 pixels), counting pixels different from the gray background:

| Frame | Thumbnail 1 | Thumbnail 2 | Thumbnail 3 | Thumbnail 4 |
| --- | ---: | ---: | ---: | ---: |
| Original, image 4 selected | 0 | 0 | 0 | 9,826 |
| Constant border, image 1 selected | 10,384 | 12,094 | 9,225 | 9,826 |
| Constant border, image 2 selected | 10,384 | 12,094 | 9,225 | 9,826 |
| Constant border, image 3 selected | 10,384 | 12,094 | 9,225 | 9,826 |
| Constant border, image 4 selected | 10,384 | 12,094 | 9,225 | 9,826 |

Reproduction helper files are local/ignored: `.codex-tmp/album-gray-diagnosis/prepare-harness.cjs`, `package-harness.ps1`, and generated `frontend/.expo/album-gray-diagnostic.jsx`.

## Initial recommended fix and remaining verification

Keep `borderWidth: 2` and `borderColor: "transparent"` in the base thumbnail style, and set only the active border color in the selected style. This is the one-variable workaround verified above; no image cache reset, API change, or native dependency upgrade is required for this reproduced trigger.

The initial request was diagnosis, and application source/APK files were unchanged at that stage. The follow-up implementation, updated APK, and authenticated album verification are completed in the update above. Verification on the reporting physical device remains `Phase 5 QA`. Network-specific media failures remain a separate concern.
