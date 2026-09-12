# Album arrow appearance and missed left taps — 2026-09-12

Follow-up: the touch overlap and participation full-view discrepancy are addressed in `GALLERY_TOUCH_AND_FULL_VIEW_2026-09-12.md`. The investigation and initial appearance-only results below are retained as historical evidence.

Scope: WP5/WP9 P0 community usability investigation and user-requested appearance follow-up. **Both symptoms were reproduced in the installed Android APK. Gray backgrounds are now restored in source and verified in Android Expo Go; the left touch overlap remains Phase 5 QA. No replacement APK was generated.**

## Follow-up: gray backgrounds and complete multi-image captures

The user requested the existing gray-background design, Android screenshots of multi-image screens, and a demonstration of the unequal hit areas. The source change reuses `SliderPrevIcon` and `SliderNextIcon` at 28px in the album detail, matching the existing activity-certification and council-activity controls. These icons contain a black circle at 35% opacity and a white chevron. The previous album-only icon branch and its outdated no-background comment were removed. Button geometry, handlers, visibility rules, and drawer gestures are unchanged in this follow-up.

Current source ran on Pixel 7 / Android 16 in Expo Go. An isolated local SQLite database and the repository's three existing banner images supplied repeatable multi-image content; no production data was changed. Original 1080 × 2400 screenshots and UI XML are in `outputs/qa/gallery-background-2026-09-12/`. Each listed route was visually checked for loaded photos and the intended screen:

| Presentation | Screens | Capture names (`android-*.png`) |
| --- | --- | --- |
| Album slider, background restored | Event album | `event-album` |
| Existing gray-circle post sliders | Club, study, networking certification; council activity | `club-activity`, `study-activity`, `networking-activity`, `council-activity` |
| Existing gray-circle introduction sliders | Current council; cohort leaders; past councils | `gsa-executives`, `gsa-cohort-leaders`, `gsa-past-councils` |
| Vertical attachments, no arrow controls | Notice; club guide; networking guide; resources (exam archive); expanded FAQ | `academic-notices`, `club-promo`, `networking-programs`, `exam-archive`, `faq`, plus `-more` scroll captures |

This covers all eight current photo-slider screen variants and five additional multi-image detail presentations. Shared resource and notice renderers were represented by exam archive and academic notices. Single-photo full-view modals, administrative upload forms, and home/feed previews are outside this detail-gallery capture set. Deep links use only the local fixture IDs recorded in `routes.json`.

The same source was measured in a 412 × 915 mobile-web viewport. Both buttons have a 44 × 240px box. At the gallery center, `elementFromPoint` and computed cursor checks found no photo-button target for left x0–23, `이전 사진` for x24–43, and `다음 사진` for every right x368–411. Actual browser clicks independently produced this selection sequence:

| Click x (y182) | Photo before → after |
| --- | --- |
| 16 | 1 → 1 |
| 23 | 1 → 1 |
| 24 | 1 → 3 |
| 43 | 3 → 2 |
| 368 | 2 → 3 |
| 400 | 3 → 1 |

Evidence: `web-hit-map.json`, `web-click-results.json`, and `web-event-album.png`. The inline pointer demonstration overlays these measured ranges on the actual web screenshot; it is an interactive explanation, not a recording of a native mouse hover. Native touch evidence from the original APK remains below. The current left-side effective width is 20px versus 44px on the right because the drawer covers the first 24px. Adding the gray circle alone does not resolve that overlap.

Verification: 49 existing media-display, council-introduction, design, and post-image tests passed; frontend typecheck and scoped ESLint passed. Read-only review found no actionable issues. No new test was added for this reversible icon substitution. Packaged APK, physical-device, and iOS checks remain Phase 5 QA.

## Original installed-APK investigation

The remaining sections record the initial state before the source appearance change above.

## Environment and route

- Pixel 7 emulator, Android 16/API 36, 1080 × 2400, density 420, gesture navigation.
- Installed application: `kr.ac.sogang.aisw.campus`, version 0.1.0 / versionCode 4, from the existing mobile-fixes test APK.
- The installed APK's SHA-256 was freshly checked on the emulator: `a0ebe9957153be4c474bb12d9209586288813a84d4a29c426a1d0111e89c04fe`, matching `AI-SW-CAMPUS-0.1.0-4-mobile-fixes-test.apk`. Evidence: `installed-apk.json`.
- Existing authenticated session, production album: Community → 행사 사진첩 → `26년 2학기 개강파티` (three photos). No content was created, edited, or deleted.
- The current post detail, gallery icons, drawer provider, and tab layout match the SHA-256 values recorded for this APK's source snapshot. Evidence: `outputs/qa/album-arrows-2026-09-12/source-verification.json`.

## Results

1. **Missing gray button backgrounds: reproduced.** Both controls display white chevrons directly over the image/letterbox. `galleryArrow` has no background; its existing comment explicitly specifies white arrows without a background circle. The SVG icons also contain only stroked paths. This is the present implementation, not a failed image download.
2. **Left arrow misses taps: reproduced by touch location.** The same photo remains selected after three taps near the visible left chevron. Moving the tap slightly right, inside the same button, makes all three previous-photo operations work, including wraparound. The right arrow also works on all three taps.

All coordinates below are native screenshot pixels. The gallery occupies y273–903 and its vertical center is y588. UI XML reports left-button bounds `[0,273][116,903]` and right-button bounds `[965,273][1080,903]`.

| Probe, starting on photo 1 | Tap coordinate | Observed selected photos | Transitions |
| --- | --- | --- | --- |
| Visible left-chevron area | (48, 588) | 1 → 1 → 1 → 1 | 0/3 |
| Same left button, farther inward | (88, 588) | 1 → 3 → 2 → 1 | 3/3 |
| Visible right-chevron area | (1007, 588) | 1 → 2 → 3 → 1 | 3/3 |

`tap-probe.py` captures the actual screen after each tap and identifies the active photo from its blue thumbnail border. Original PNGs and per-tap pixel counts are retained in `tap-results.json`. This verifies selection changes rather than relying on whether an accessibility node says it is clickable.

A second interleaved probe checks the edge-layer boundary: x60 left taps failed **2/2**, while x68 left taps succeeded **2/2**, with successful right taps between them. Its sequence was 1 → 1 → 2 → 1 → 1 → 2 → 1. This brackets the 63px edge boundary and makes general startup delay an insufficient explanation for the missed taps. See `boundary-results.json`; all 15 tap observations and the source hashes passed the recorded evidence assertions in `verification.json`.

## Source cause

- `frontend/components/MyPageDrawer.tsx`: the provider renders an invisible `edgeSwipeArea` over every tab-area screen while the drawer is closed. It spans the leftmost **24dp** for the full height, has `zIndex: 20`, and uses `pointerEvents="box-only"`. Its PanResponder claims the initial touch even if the user never swipes.
- `frontend/app/(tabs)/_layout.tsx`: this provider wraps the navigator, including album detail.
- `frontend/app/(tabs)/board/post/[postId].tsx`: the left gallery button begins at x0 and is **44dp** wide, with `zIndex: 2`. The icon is padded 8dp from the edge.
- `frontend/components/icons.tsx`: the previous icon's path spans local x8–17, placing its visible stroke around screen x16–25dp. Most of that overlaps the drawer's touch layer.

At density 420, 24dp equals 63 pixels: the failed x48 tap is covered, while the successful x88 tap is beyond that layer but still inside the left button. The code therefore explains the position-dependent failure: a transparent drawer touch surface intercepts the tap before the gallery button. Increasing only the button's touch padding would leave that covering layer in place.

Remediation should add the requested gray arrow backgrounds and resolve the overlap between the gallery controls and the drawer's edge gesture, preserving intentional My Page navigation. No implementation or replacement APK was requested in this investigation.

## Evidence and limits

Evidence directory: `outputs/qa/album-arrows-2026-09-12/` (local, ignored by Git).

- `album-detail.png`, `album-detail.xml`: current APK gallery and button bounds.
- `left-visible-1.png` through `left-visible-3.png`: failed left taps.
- `left-inside-1.png` through `left-inside-3.png`: successful previous-photo sequence.
- `right-visible-1.png` through `right-visible-3.png`: successful next-photo sequence.
- `tap-results.json`, `tap-probe.py`: reproducible tap sequence and selection evidence.
- `boundary-results.json`, `boundary-*.png`, `verification.json`: interleaved boundary probe and evidence assertions.
- `source-verification.json`: current source matches the existing APK build snapshot for the four relevant files.

The host was under memory pressure during emulator boot. System UI, Messages, and Launcher showed ANR dialogs before the gallery probe; those dialogs were dismissed and are not counted as arrow failures. The recorded gallery tap sequence completed with the gallery visible and its active thumbnail detectable in every frame. This is a functional touch-location check, not a performance measurement. A subsequent swipe starting at the same left coordinate did not visibly open the drawer; that gesture is not claimed as additional proof of drawer opening. Physical-device and iOS checks remain Phase 5 QA. No application code changed, so no application test suite or build was rerun.
