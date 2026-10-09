# 1.0.4 Store Submission Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans for the release changes; separate read-only Android credential research can run in parallel.

**Goal:** Submit the current app changes for store review using the existing store identities and credentials.

**Architecture:** Preserve Expo Router, native modules, backend and GCP runtime. Change only release version metadata and use EAS remote signing and monotonically increasing native counters.

**Tech Stack:** Expo SDK 54, React Native, EAS CLI 24.4.1, App Store Connect and Google Play Console.

**Spec:** User's 2026-10-09 store submission instruction and explicit 1.0.4 public-review selection; CODEX.md WP9.

## Global Constraints

- Bundle/package: `kr.ac.sogang.aisw.campus`; ASC app `6809467636`.
- Display version: `1.0.4`, including the existing Android Gradle versionName.
- Existing EAS remote signing credentials; no new signing identities or broader IAM grants.
- Keep private credential material out of tracked files and command output.
- Report EAS upload, Apple processing, store review and public release separately.

## Review Focus

- A previously released 1.0.3 cannot be reused for a new public iOS update.
- Select the exact production AAB, never the newer internal APK via --latest.
- Verify actual archive identity/version/counter and source commit before submission.
- Existing Play upload signing key does not establish Play API submission access.
- Reuse current store metadata and review access; report missing inputs rather than inventing declarations or credentials.

## Task 1: Release version and native builds

- [x] Update frontend/app.json and frontend/android/app/build.gradle to 1.0.4.
- [x] Run npm run release:check:local and inspect the complete Git diff.
- [x] Commit the verified version change and queue production IPA/AAB with frozen existing credentials.
- [x] Download FINISHED artifacts; verify the exact source, version, identity, signing/profile and 16 KB Android alignment using the existing artifact verifier.

## Task 2: Store submission

- [x] Reuse the managed ASC API key; upload the exact new IPA and verify Apple's processingState.
- [x] Inspect existing ASC version/localization/review metadata, prepare 1.0.4 and attach the valid build.
- [ ] Submit App Review and verify the returned review state, or report the exact missing store requirement.
- [x] Search prior authorized Play records; no existing submission key found. User subsequently supplied an authenticated Play Console session.
- [x] Verify existing developer/app/package and highest versionCode; upload exact production AAB14 and save production release5 with Korean release notes.
- [ ] Resolve both stores' non-email reviewer credentials, reconcile Google managed-publishing setting with review-only scope, then send for review and verify the returned state.

## Task 3: Evidence

- [x] Record IDs, source, artifact checks, review states and limitations in docs/qa and CODEX.md.
- [x] Check documentation against actual remote results and commit/push the release record.

Remaining store work is blocked on valid production reviewer login for both
stores. Apple upload/VALID processing and draft attachment are complete;
Google upload and production candidate save are complete. Google's automatic
pre-review check is still pending and managed publishing is disabled. Actual
App Review/Play review submission is not complete.
