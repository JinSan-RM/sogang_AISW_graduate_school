# Report sheet Back — Android verification, 2026-09-10

WP5 P0. Fix commit: `0da0e43`.

Executed the current app source in Expo Go 54.0.8 / SDK 54 on the Pixel_7 Android 16 (API 36) emulator, using the authorized test account and production data. No new application APK was built and no report was submitted.

Opened Community → Resources → All → `2026년 1학기 해킹 및 침해대응 - 이재광교수님`, then More → Report. Used Android `KEYCODE_BACK`, not a backdrop tap, for both Back actions.

| Step | Observed result | Unmodified ADB capture |
| --- | --- | --- |
| Open Report | Report bottom sheet appears over the post | [Report open](../../outputs/qa/report-back-2026-09-10/03-report-open.png) |
| First Android Back | Sheet closes; the same post stays visible | [Detail retained](../../outputs/qa/report-back-2026-09-10/04-first-back-detail.png) |
| Second Android Back | Resources list returns with All/latest filters | [List restored](../../outputs/qa/report-back-2026-09-10/05-second-back-list.png) |
| Reopen the same post | Detail opens without the report sheet | [Reopened detail](../../outputs/qa/report-back-2026-09-10/06-reopened-detail.png) |

Each capture is 1080×2400 and has a matching UI Automator XML file. Automated XML assertions checked the retained title, missing report overlay, and restored list controls. Full sequence metadata: `outputs/qa/report-back-2026-09-10/verification.json`. Screenshots were visually inspected and shown to the user in order.

Code verification recorded with the fix: six Back callback regressions, navigation suite 59/59, full frontend suite 543/543, typecheck and changed-file lint passed. The native sequence above covers post reporting; comment reporting and delete-confirmation guards have automated callback coverage.

Phase 5 QA remaining: final packaged APK and physical-device verification after the requested batch of fixes is complete. Generated screenshots/XML remain in the repository's ignored `outputs/` directory.
