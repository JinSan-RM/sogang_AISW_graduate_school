# Phase 5 QA Handoff

Updated: 2026-07-27

## Decision

- **Phase 5 QA: Conditional GO.** Identified P0 code, privacy, permission, migration, local runtime, backup/restore, and CI-equivalent gates pass.
- **Store release: NO-GO.** The fixed store-readiness gate is **14/50 = 28%**. Frontend high-severity dependency risk, 18 strict release-config inputs, production providers/URLs, signed artifacts, physical-device checks, and store-console work remain.
- No commit, push, production deployment, production-data migration, remote EAS credential/build action, or store submission was performed.

## Completion Snapshot

These percentages separate product coverage from formal release evidence. Only release preparation uses the fixed 50-item denominator.

| Area | Estimate | Evidence and remaining work |
| --- | ---: | --- |
| UI | 94% | Five-tab IA, P0 screens, loading/error/retry states, two-depth comments, account deletion, and protected admin entry exist. Physical-device keyboard, picker, deep-link, accessibility, and final visual polish remain. |
| Function | 97% | P0 auth/community/admin/event/notification/media/account-deletion flows and server-side permission checks pass regression tests. Draft autosave, upload progress, and recurring events are deferred P1/v1.1 work. |
| Integration and QA | 88% | SQLite/PostgreSQL 104-test suites, local Compose/API/worker/web, migration, backup/restore, and an unsigned Android release-bundle rehearsal pass. Signed native artifacts, physical-device matrices, and live-provider verification remain. |
| Release preparation | 28% | `RELEASE_GATE_CHECKLIST.md` has 14 `PASS` items out of 50. Actual release-variant manifest security, an unsigned AAB compile/audit rehearsal, and production dependency/license review passed; official IDs, secrets/providers, public URLs, store assets/accounts, signed builds, device checks, and approvals remain. |

## Verified Gates

The following checks passed against the 2026-07-27 working tree:

- Isolated Compose project `aisw_p0qa` built and ran PostgreSQL 16, backend, and notification worker without touching the normal development volume.
- A clean database reached the single Alembic head `0021_account_deletion_receipts`.
- Migration rehearsals passed for clean, `0019`→head, `0021`→`0019`→`0021`, and exact unversioned `0001` recovery. Unknown or mixed unversioned schemas remain fail-closed without stamping or mutation.
- Final current-source rerun passed **104/104 on SQLite** in 5.41 seconds and **104/104 on isolated PostgreSQL** in 31.42 seconds; compile/import/OpenAPI checks passed.
- Test reset protection requires `APP_ENVIRONMENT=test`, `ALLOW_TEST_DB_RESET=1`, and an explicitly test-named database.
- API smoke passed for readiness, normalized guest denial, member/admin permissions, boards/posts/comments/search/media/events/FAQ/notifications/admin, and authenticated/public account deletion.
- The latest QA Compose backend/database were healthy, the worker was running, and `/health/ready` returned `200` with database ready. The one-shot worker passed with `reminders=0`, `receipts=0`, `removed_rate_limits=0`, and `removed_account_deletion_receipts=0`; backend and worker ran as UID `10001`.
- A private PDF upload and authorized signed download returned `200`; access-URL issuance without a token returned normalized `401`, and the legacy public `/uploads/...` path returned `404`.
- Frontend tests passed **7/7**; lint passed with **0 errors/0 warnings**; typecheck, Expo Doctor `17/17`, and web export passed. After the lockfile update, clean `npm ci --legacy-peer-deps` revalidation again passed tests, lint, and typecheck.
- Local production Compose config/build, backend/worker/database health, web `/healthz`, and Expo Router deep-link fallback passed.
- Actual Android release-variant manifest processing and `release:verify-android-manifest` passed: target API 36, cleartext disabled, backup disabled, and forbidden storage/overlay/camera permissions absent.
- An isolated disposable Windows short-path copy of the same 115 frontend source files completed `:app:bundleRelease` in 16m47s across 721 tasks. The temporary unsigned 74,847,032-byte AAB had SHA-256 `5c2acf192fad9d02449cdc9acef059fb98d67655ea684aecc455f0378ee474e0`; its path is not retained as release evidence.
- Checksum-verified bundletool 1.18.3 validated that AAB and reported uncompressed native libraries with `PAGE_ALIGNMENT_16K`. Its manifest resolved target API 36, min API 24, `allowBackup=false`, `usesCleartextTraffic=false`, no forbidden camera/storage/overlay permission, no debuggable attribute, and no dev-launcher/dev-menu manifest entry.
- The extracted AAB contained 1,461 files totaling 219,116,528 bytes and produced zero Gitleaks findings. It is not a store candidate: `jarsigner` reported it unsigned, package/version remained `com.anonymous.sogangcommunity` / `0.1.0` / `1`, and the JS/config payload still contained two localhost matches, one Expo development-client/dev-launcher match, and two placeholder-package matches.
- PostgreSQL custom-format restore reproduced 30 tables with identical all-table row counts and column/index/constraint fingerprints. Protected-media tar restore reproduced the same relative paths, sizes, and SHA-256 checksums.
- Production startup uses non-authoritative reference seeding: no demo user is created, operator-edited reference content is preserved, and custom boards are not deactivated.
- The first production administrator must be an existing active member promoted through the one-time production-only bootstrap. Concurrent attempts are advisory-lock protected, later attempts are refused, and success writes a detail-free audit event.
- The operational-alert adapter filters context through an explicit route-template/method/error-type/count allowlist. Tests verify that email/token keys are dropped and webhook secrets or exception strings are not logged on provider failure.
- CI declares `permissions: contents: read`; backend audit tooling is pinned as `pip-audit==2.10.1`.
- Checksum-verified Gitleaks 8.30.1 found zero findings across 43 commits, 298 current non-ignored files, and the extracted local unsigned AAB; CI now scans full history. `REL-13` remains incomplete until the final signed artifacts are also scanned.
- Reproducible CycloneDX 1.6 SBOMs cover 37 backend-image components/36 app dependencies and 809 frontend production instances/749 unique PURLs. Forbidden, strong-copyleft-only, and unknown licenses are zero; weak/file-level copyleft, dual-license, and Inter OFL cases are documented in `docs/release/DEPENDENCY_REVIEW.md`. Final signed native notice verification remains separate.
- Backend production dependency audit reports zero known vulnerabilities.

## Closed P0 Security and Integration Items

- One object-level read policy covers mutual-aid list/detail/search/comments/reactions/bookmarks/activity/media/reports. Non-owner members receive object-hiding `404`; owners and admins retain intended access.
- Missing and inaccessible comment IDs return the same normalized response for update, delete, and report operations without side effects.
- Anonymous and forced-anonymous posts mask author identity in list/detail/bookmarks/activity/search. Author-name search and blocking do not expose identity by side channel.
- Draft, hidden, deleted, and inactive-board visibility is backend-enforced, including explicit administrator moderation access.
- Public static upload serving is removed. Uploads stream in bounded chunks, validate size/extension/MIME/signature, clean partial files, and use authorized short-lived capability URLs.
- Post/comment text is trimmed and bounded; validation, HTTP, auth, and unexpected errors use normalized envelopes.
- Irreversible account deletion verifies the current password. The public email request/verify flow is non-enumerating; private/draft/hidden/mutual-aid content and private media are deleted, while retained published content is disconnected from the author. Migration `0021` stores only a non-identifying receipt.
- Production startup no longer creates a demo credential or authoritatively rewrites operator content. Initial administrator creation is an explicit, one-time audited promotion of an existing active member.
- Legacy migration auto-stamping requires an exact structural fingerprint covering columns, defaults, keys, foreign keys, uniqueness, and delete behavior.
- CI separates migration, pytest-reset, and legacy-fingerprint PostgreSQL databases and runs frontend lint/test/typecheck/Doctor/export.
- The five-tab IA and administrator entry/protection are present and backed by focused frontend tests.

## Dependency Risk

After the safe `postcss` 8.5.18 update:

- runtime audit, `npm audit --omit=dev --json`: **33 affected** — critical 0, high 19, moderate 14;
- all dependencies, `npm audit --json`: **40 affected** — critical 0, high 26, moderate 14.

The remaining automatic fixes require incompatible major overrides or an Expo 57 / React Native 0.86 major-upgrade chain. No forced major upgrade was applied during P0 stabilization.

Before store release, choose and record one of:

1. upgrade/remediate the Expo toolchain and repeat native regression testing; or
2. approve each remaining reachable risk for the release branch with an owner, mitigation, expiry date, and follow-up issue.

`REL-12` therefore remains `FAIL`; the absence of critical findings does not make the audit a pass.

## Native and Physical-Device Matrix

- Android and iOS: login, refresh, logout/revocation, expired-session recovery, and SecureStore persistence.
- Android and iOS: image/document picker, private mutual-aid evidence upload/download, replacement/removal, keyboard overlap, offline/retry, and deep links.
- Register real Expo push tokens and verify immediate notice plus event D-day/D-1 delivery, permission denial, settings suppression, ticket/receipt sync, and logout token deactivation.
- Traverse every P0 route as member and admin; verify guest redirects and backend `401/403/404` independently of UI hiding.
- Complete a signed Android production AAB and an iOS release archive on approved CI/EAS/macOS, then inspect resolved identifiers, manifests/plists, versions, SDK/API levels, permissions, signing, and checksums.
- Verify VoiceOver/TalkBack, dynamic text, photo/notification permission denial, and destructive-action confirmation on physical devices.

## Store-Release Blockers

- Strict release configuration still reports 18 approved external-input blockers.
- Replace `com.anonymous.sogangcommunity` with approved permanent Android/iOS identifiers and confirm remote version/build numbers.
- EAS production environment values, credentials, and remote versions are absent; the validated local rehearsal AAB was unsigned, disposable, and non-candidate, and no signed production AAB or iOS archive has been inspected.
- Configure production SMTP, auth secret, CORS/proxy, HTTPS API/web origins, durable media/DB/backup, FCM/APNs/Expo credentials, and approved receipt/backup retention.
- Configure the required `OPERATIONS_ALERT_WEBHOOK_URL`, provider, on-call routing, and live delivery/recovery test. The actual value and receipt confirmation are `BLOCKED_EXTERNAL`.
- Provide public HTTPS support, privacy-policy, and account-deletion URLs plus approved operator/contact metadata.
- Provide final icon, screenshots, Android feature graphic, store listing copy, reviewer accounts, legal/privacy declarations, and submission approvals.
- Resolve or formally accept the remaining high-severity frontend dependency risk.
- Complete signed-artifact, physical-device, store-console, and live-public-host verification.

## Non-P0 Follow-ups

- Add a bounded-entry defense before inspecting OpenXML ZIP members to reduce pathological ZIP resource use.
- Draft autosave, visible upload progress, recurring events, advanced analytics, and PostgreSQL full-text tuning remain P1/v1.1.
- Closed-site web push requires a separate service-worker/VAPID integration; current web behavior is open-site polling/system notification.

## Historical Evidence

- The 2026-07-12 `0016` and early 2026-07-27 `0019` smoke runs remain historical evidence only.
- Earlier smaller test-count and nonzero-lint-warning snapshots are superseded by the current 104/104 backend, 7/7 frontend, and 0-warning results.
- Historical Android debug builds and the current unsigned local release bundle do not satisfy signed production artifact or physical-device gates.
