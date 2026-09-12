# Gallery touch areas and participation full-view correction — 2026-09-12

WP5/WP9 P0 follow-up to `ALBUM_ARROWS_ANDROID_2026-09-12.md`. The user requested that the entire left arrow work and reiterated that participation and album screens must not expose the photo full-view control.

## Version and prior capture discrepancy

The earlier screenshots ran the current working source over HEAD `5b2d460` (2026-09-11 14:23 KST) with the gray-arrow appearance change. They were Android Expo Go captures against an isolated local database, not a new packaged APK. The activity image defaults introduced in `b7099fe` (2026-08-31 14:34 KST) still enabled full-view. Because the local fixture boards had no `activity_image_layout`, they exercised those defaults. The fixture did not represent any separately configured production board setting. The earlier capture failed to reconcile that default with the user's no-full-view decision.

## Changes

- Remove the transparent 24dp My Page edge overlay. The parent now observes touch starts without claiming them and captures only a single-finger horizontal drag beginning inside the leftmost 24px. Simple taps and small movements reach the underlying photo button. Both gallery controls keep their existing 44px width and the gray circular icons.
- Record the initial native `pageX` before acquisition. React Native initializes `gesture.x0` only after granting the responder and resets `dx` on grant, so acquisition and the existing 36px completion threshold must use the recorded start position and release position respectively. This also preserves short, fast edge swipes and rejects drags starting in the middle of the screen.
- Remove the activity-certification full-view button, fade overlay, modal, and viewer state. Preserve source-orientation rules, frame dimensions, and `contain`/`cover` rendering. Default `expandable` values are false; the frame also reports no viewer when old metadata contains true. The unused administrator toggle is removed. The version-1 metadata wire format remains compatible, with no API or database migration.
- Album hero images continue to use their existing non-expandable renderer.

## Verification

Evidence directory: `outputs/qa/gallery-touch-2026-09-12/` (local, ignored).

- Full frontend suite: **585/585 passed** (`frontend-tests.log`). Updated policy expectations and the drawer cases failed against the prior source before the fix. Additional lifecycle cases reproduced premature capture outside the edge and loss of total swipe distance before those issues were corrected.
- Frontend typecheck and changed-file ESLint: passed.
- Read-only review checked the actual React Native 0.81.5 PanResponder lifecycle; its acquisition/release findings were corrected and covered by the updated tests.
- Mobile-web viewport: 412 × 915. At y64, y182, and y300, each integer x across both 44px buttons resolves to the appropriate button and a pointer cursor: **44/44 on both sides at all three heights**. Before the fix, the left side exposed only 20/44. Evidence: `web-hit-map-after.json` and the earlier measurement.
- Actual web clicks at left x1, 8, 16, 23, 24, 35, 43 and right x368, 411, plus four upper/lower corners, all advanced to the expected photo: **13/13**. Evidence: `web-clicks-after.json`.
- A web drag from x160 to x300 did not open My Page. A drag from x16 to x180 opened it, and its Close button returned to the album. These three states were checked in the live browser automation's returned accessibility trees; a full standalone snapshot was not retained (`web-drawer-open.txt` contains only a later unchanged-state diff).
- Club, study, and networking activity screens render without full-view. Web screenshots: `web-club-after.png`, `web-study-after.png`, `web-networking-after.png`; album: `web-album-after.png`.
- After recovering the emulator, the three activity screens were also captured and visually verified on Android with gray arrow backgrounds and no full-view control: `android-club-recovered.png`, `android-study-final.png`, and `android-networking-final.png`. The album was recaptured as `android-album-final.png`. These use the corrected working source and isolated local fixtures. Earlier files named `android-*-after.png` and `android-club-final.png` contain failed home/loading/ANR captures and must not be used as the final results.
- Android 16 / Pixel 7 Expo Go: native taps across left x3, 24, 48, 60, 88, and 114 all changed to the expected previous photo; right x966 changed to the next photo. Each tap was issued once and screenshots were observed until selection updated. Evidence: `android-final-taps.json` and its original PNGs.
- The probe's original initial screenshot filename was reused during a later failed capture. Its initial selection/pixel observations are preserved in the JSON, with a separately identified pre-probe control screenshot (`android-right.png`) showing the same selected third photo. The seven successful tap-result PNGs remain intact.

The emulator displayed Process System/System UI ANR dialogs under host load. These are preserved in `android-ready.png` and `android-final-tap-08-2.png` and excluded from functional pass counts. An initial 0.5s fixed-delay screenshot sampled stale state; later observations showed the tap had been applied. The final probe therefore waits for the expected selected thumbnail without sending a second tap. This verifies response by location, not response-time performance. Packaged/physical-device and iOS checks remain Phase 5 QA. No replacement APK was generated; the installed release APK remains versionCode 4 from 2026-09-11.
