# Android branding and AAB preparation — 2026-09-08

Work package: CODEX.md, Work Package 9 (Phase 4 integration).

## Update — 2026-09-09: first release without remote push

- User explicitly deferred push notifications to a later release. This supersedes the Firebase build blocker recorded below on 2026-09-08; Firebase setup is `v1.1` work and Google console sign-in is no longer needed for this AAB.
- `expo.extra.pushNotificationsEnabled=false` is the shared build/runtime decision. NotificationBootstrap avoids loading the native notification module, permission requests, response listeners, and token registration. In-app notification polling, list/settings, read state, and navigation are preserved.
- Release injection/validation and Gradle skip Firebase only for explicit Boolean `false`. Enabling push requires the matching Firebase client file again; missing/string-valued flags fail release checks. Other HTTPS, identity, signing-profile, version, and privacy checks remain.
- Regression tests: 10/10 release-config tests passed, including the new deferred/enabled/invalid-flag and public-API cases. `npm run release:check:local` passes without Firebase. Signed AAB generation and artifact verification completed on 2026-09-09.
- Full frontend suite: 523/523 passed; typecheck passed; lint has 0 errors and the same 7 unrelated existing warnings. Production-profile Gradle resource/Kotlin compilation passed in 2m 13s (293 tasks), and the merged manifest passed target API 36 checks. Read-only code/native-module review found no actionable regression.
- Build snapshot: branch `codex/android-aab-no-push`, commit `9e74489341ea80f9412ac152284fa7bbc6945944`, isolated checkout `.worktrees/aab-no-push`. Clean install and 13 focused release/splash tests passed there. EAS build `5375e36a-f05a-4956-863f-3befa1601d29` finished at `2026-09-09T00:40:51.943Z`, producing version `0.1.0` / versionCode `2` with `aisw-campus-production`. No Play submission was performed.
- Checksum-verified Gitleaks 8.30.1 reported zero findings in both the build checkout and the extracted final AAB.
- For a later push release: resolve Firebase activation, obtain the package-matching client file, configure FCM v1 credentials, set the flag to `true`, and build/test a new version on a physical device.

### Completed signed artifact

- File: `outputs/android/AI-SW-CAMPUS-0.1.0-2.aab` (81,534,849 bytes).
- SHA-256: `18E35E4F7E5A35EE6A93825E03EB7120656D51A603B481D0EF43174ECE7C494D`.
- [EAS build record](https://expo.dev/accounts/kimjinsan11/projects/sogang-community/builds/5375e36a-f05a-4956-863f-3befa1601d29).
- Bundletool 1.18.3 validation passed. Actual manifest: `kr.ac.sogang.aisw.campus`, version `0.1.0` / code `2`, target API `36`, debuggable/cleartext/backup disabled. CAMERA, READ/WRITE_EXTERNAL_STORAGE, and SYSTEM_ALERT_WINDOW are absent.
- Bundle config uses `PAGE_ALIGNMENT_16K`; all 44 packaged arm64-v8a/x86_64 native libraries have ELF LOAD alignment of at least 16 KB (88 native libraries total). Reference: [Android 16 KB page-size support](https://developer.android.com/guide/practices/page-sizes).
- `jarsigner -verify` passed. The actual signing certificate matches the configured upload certificate SHA-256: `34:80:9A:AC:F2:3C:A2:2F:25:22:A0:C5:91:F6:FD:F2:C2:DF:E0:A0:53:75:23:E0:9E:6B:D4:86:BE:CD:31:DE`.
- The packaged app config has `pushNotificationsEnabled=false`; the packaged JavaScript includes the production API `https://34.50.35.119/api`. No `google-services.json`, JKS, keystore, or `credentials.json` files are included.
- Extracted artifact secret-scan report: `outputs/android/AI-SW-CAMPUS-0.1.0-2-gitleaks.json` (zero findings).
- Remaining before public release: resolve published privacy-policy placeholders and existing launch gates; test cold launch, icon/splash, login, and in-app notifications on a physical device through Play internal testing. No device was connected for this session. iOS archive/device QA remains separate. Firebase is not a blocker for this push-disabled AAB.

The following sections preserve the historical 2026-09-08 setup evidence. Their Firebase prerequisite and missing-AAB status are superseded by the completed 2026-09-09 release above.

## Approved artwork

- The user supplied `data/app_icon_1024.png` and requested the existing splash design.
- `frontend/assets/app-icon.png` is a byte-for-byte copy of that 1024×1024 PNG. SHA-256: `D601DC1BB992B4A0903E21C2D5363881F631BF4C7705C2C379BC43AA9DCF9800`.
- `frontend/assets/splash-logo.png` remains unchanged. The React splash retains its full-screen layout, background `#EEF2FE`, minimum 1.5-second timer, and font/session readiness checks.

## Native integration

- Added the SDK 54-compatible `expo-splash-screen` 31.0.13 dependency and config plugin.
- Applied Expo SDK 54's `withAndroidIcons` and `withAndroidSplashScreen` plugins selectively to the checked-in Android project. This regenerated the standard launcher images and splash drawables, theme, strings, and activity registration without regenerating unrelated native configuration.
- The native system splash uses the same portrait artwork. Android `imageWidth: 600` centers it in Expo's 288 dp splash canvas so the existing central logo and lettering remain legible; the excess portrait background is clipped. The React full-screen artwork is not cropped or replaced.
- The React splash image calls `SplashScreen.hide` on `onLoadEnd`. This releases Expo Router's native overlay as soon as the original artwork loads, rather than leaving that overlay up until the navigator mounts after the React splash gate.
- `frontend/assets/adaptive-icon.png` is a transparent Android derivative of the supplied icon, generated with ImageGen, then resized/padded with Expo image-utils. The original base icon remains unchanged. It preserves the overlapping blue shapes and CAMPUS wordmark; the derivative is not a byte-identical cutout of the original.
- The derivative was fitted to 704×704 inside a 1024×1024 transparent canvas. Its solid-alpha maximum radius is 297.37 px, within Android's conservative 33/108 safe radius (312.89 px on this canvas).
- Android uses this foreground on `#EEF2FE` and reuses its alpha mask for the monochrome/themed icon, as supported by Android. An attempted separate white ImageGen derivative was rejected for edge noise and is not used. Expo generated density-specific legacy, round, foreground, monochrome, and adaptive XML resources.
- Run `npm run release:sync-android-branding` after artwork/config changes. It uses the locked Expo SDK 54 icon/splash plugins and leaves unrelated native configuration in place; check the generated diff when upgrading Expo.
- The native namespace, application ID, and Kotlin paths match `kr.ac.sogang.aisw.campus`. The user confirmed a **new Play registration** on 2026-09-08, so preparation continues with this identifier and a new upload key.

## EAS and public environment

- Corrected `expo.owner` to the owner returned by EAS: `kimjinsan11`. Project: `@kimjinsan11/sogang-community`, ID `bf5cf461-a033-4fd9-9fbf-2ba2019d4c35`. Project lookup succeeds.
- EAS remote Android versionCode is currently `1`. The production profile produces an app bundle, uses remote credentials/versions, auto-increments, and requires a clean commit. Existing-app updates must also exceed the highest versionCode in Play Console.
- Registered and read back 10 public variables in the EAS `production` environment. Their reproducible values are in `frontend/.env.production.example`; a Git-ignored local `.env.production` is prepared too.
- API origin: `https://34.50.35.119/api`. Health, readiness, and web health returned 200. Public support, privacy, and account-deletion routes returned 200; support and privacy were also inspected in the browser.
- Operator/contact values match the current public support page. Policy version/effective date `2026-07-12` match the active `/api/registration/options` response. This does not approve the policy text: the public privacy body still contains contact/effective-date/overseas-transfer placeholders that need reconciliation before launch.
- Created a new EAS-managed JKS upload key for `kr.ac.sogang.aisw.campus`. The default Android build-credentials configuration is `aisw-campus-production`; creation and subsequent credential readback succeeded. Private key material/passwords are stored by EAS and were not printed or added to Git.
- Upload certificate SHA-256: `34:80:9A:AC:F2:3C:A2:2F:25:22:A0:C5:91:F6:FD:F2:C2:DF:E0:A0:53:75:23:E0:9E:6B:D4:86:BE:CD:31:DE`. This is the upload certificate; Play App Signing may use a separate app-signing certificate for installed apps.
- Confirmed the existing GCP project `project-abb18f92-e365-4990-b93` contains the `sogang-aisw-app` VM at `34.50.35.119`. Enabled Firebase Management and Cloud Resource Manager APIs there as setup prerequisites. No separate Cloud project, database, storage bucket, Analytics property, or FCM service-account key was created.
- Firebase project listing is empty, and `availableProjects` lists the existing GCP project. The active Google account `sogang30s@gmail.com` is its Owner; `testIamPermissions` confirms all four permissions documented for `projects.addFirebase`. Despite this, `addFirebase` returns HTTP 403 `PERMISSION_DENIED` / `The caller does not have permission`. The API response does not identify the remaining cause. Do not infer that granting broader IAM roles will resolve it.
- Firebase console was opened for account-side diagnosis but requires Google sign-in. User sign-in is pending. No Firebase Android app/client file is available yet; strict production checks remain enabled.

## Verification from initial branding integration

- Source/icon SHA-256 equality: passed.
- Generated standard icon and native splash drawable: visually inspected.
- Existing splash gate tests: 3/3 passed.
- Expo SDK dependency compatibility: passed (`npx expo install --check`).
- Full frontend lint: 0 errors, 7 warnings in unrelated existing files.
- Final frontend typecheck and changed-file lint (`app/_layout.tsx`): passed.
- `:app:processReleaseResources :app:compileReleaseKotlin`: passed (293 actionable tasks; release resources linked and the new splash module/activity compiled).
- Merged Android release manifest check: passed, including target API 36 and existing permission/network/backup restrictions.
- Final `:app:processReleaseResources` rebuild after the image-load callback: passed; Metro bundled 1,495 modules and copied 56 assets (208 actionable Gradle tasks, 5 executed).
- Read-only code review: no remaining actionable findings after the native-overlay callback fix.

## AAB preparation verification

- Typecheck: passed. Splash and release-configuration tests: 9/9 passed.
- Strict validator with the prepared local public environment: exactly one static blocker, missing `android/app/google-services.json`. This count does not cover policy approval or device QA. New registration is now confirmed and the upload key has been created.
- Updated `:app:processReleaseResources :app:compileReleaseKotlin`: passed in 1m 52s, 293 tasks (20 executed). Metro bundled 1,495 modules and 56 assets with the prepared public environment.
- Final merged release manifest: passed, including target API 36. Verified the actual manifest package/activity and the configured API URL inside the generated release JavaScript bundle.
- Changed-file lint: passed after declaring the script's CommonJS `__dirname` global. Final full lint: 0 errors and the same 7 existing warnings in unrelated files.
- Read-only review found no new actionable regressions. The remote version override is applied by EAS after its pre-install hook, so the existing source version-equality check remains valid.
- This is resource/Kotlin/JavaScript build evidence without Firebase injection or release signing, not a completed production bundle or a device test.

## Build sequence after the remaining inputs arrive

Run these commands from `frontend` using the CLI version range already pinned in `eas.json`:

1. New Play registration is confirmed. Keep `kr.ac.sogang.aisw.campus` consistent across Expo, Gradle, Firebase, and the new Play listing.
2. Sign in to the Firebase console with the existing GCP project's owner account and resolve its initial Firebase activation failure. Add the Android app with this package name and obtain `google-services.json`. Keep it at the ignored `android/app/google-services.json` for local checks, and upload it as the EAS file variable:

   ```powershell
   npx --yes eas-cli@21.3.0 env:create --environment production --name GOOGLE_SERVICES_JSON --type file --visibility secret --value ./android/app/google-services.json --non-interactive
   ```

3. The upload key is already configured in EAS (`aisw-campus-production`); reuse it for future builds. Configure FCM v1 credentials separately for actual push delivery. A Play submission service account is only needed if automating submission, not for generating the AAB.
4. Run `npm run release:check:local`. All strict checks must pass. Review and commit the intended source/assets in a clean build checkout; the current tree is uncommitted, and user-managed legal source documents must not be included accidentally.
5. Build with `npx --yes eas-cli@21.3.0 build --platform android --profile production`. Validate the downloaded signed AAB, then test via Play internal testing before production submission.

## Remaining release work

- `blocked`: Firebase activation currently returns HTTP 403 despite verified Owner/required permissions. Console sign-in and matching Firebase Android client configuration are pending. New registration and EAS upload signing key are ready; no signed AAB has been generated.
- `blocked` for launch: reconcile the published policy placeholders/metadata and previously recorded release gates; passing a config validator does not close those gates.
- `Phase 5 QA`: signed AAB generation and physical-device cold-launch checks, including icon masking and the native-to-React splash transition.
- `Phase 5 QA`: iOS archive and device appearance; only shared Expo configuration was updated here.

References: [Expo SDK 54 splash-screen configuration](https://docs.expo.dev/versions/v54.0.0/sdk/splash-screen/), [Android adaptive/themed icons and alpha-mask reuse](https://developer.android.com/develop/ui/compose/system/icon_design_adaptive), [Expo existing credentials](https://docs.expo.dev/app-signing/existing-credentials/), [Firebase activation API and required permissions](https://firebase.google.com/docs/reference/firebase-management/rest/v1beta1/projects/addFirebase).
