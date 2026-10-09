# 1.0.4 store submission — 2026-10-09

## Authorized scope

The user requested store submission, then explicitly selected 1.0.4 and public
store review. CODEX WP9 covers this release work. Runtime source is unchanged
from the verified 1.0.3 artifacts except app.json version and Android native
versionName. Clean source `cee7d48b04b4fb60ffe31051d952e5e555839a53` was committed
and pushed. Existing EAS remote signing identities were frozen and reused.

`npm run release:check:local` and Git whitespace/diff checks pass. Existing fresh
966 frontend tests, typecheck and lint cover the unchanged runtime source; they
were not rerun solely for this metadata change. Physical native QA remains open.

## Artifacts

| Format | Version / native counter | EAS build | Status |
| --- | --- | --- | --- |
| IPA | 1.0.4 / 16 | [c10c1a3f](https://expo.dev/accounts/kimjinsan11/projects/sogang-community/builds/c10c1a3f-01ba-4ac6-a5fb-83a2882e3659) | FINISHED; downloaded and verified |
| AAB | 1.0.4 / 14 | [2ea67011](https://expo.dev/accounts/kimjinsan11/projects/sogang-community/builds/2ea67011-f31f-4bce-833d-9e71481f9228) | FINISHED; downloaded and verified |

IPA: 21,661,887 bytes; SHA-256
`f7744d52b3da4236208cc6cf04bc2f5de5297f1db2dea72daa07b33323e32834`.
ZIP CRC, exact source/build/profile identity, Info.plist 1.0.4/16, Store
provisioning, six original fonts/aliases and canonical API URL pass. Hermes
bundle SHA-256 is unchanged from the verified 1.0.3 IPA. EAS signing succeeded;
independent macOS codesign and physical iOS verification were unavailable.

AAB: 81,948,992 bytes; SHA-256
`c196c15516f74014c8c50832429f9f417283446083878b974cb9c7c03d968d07`.
ZIP CRC, exact production source/version/code, six fonts/aliases and canonical
API checks pass. Bundletool, jarsigner and established production certificate
SHA-256 `34809aacf23ca22f2522a0c591f6fdf2c2dfe0a0537523e09e6bd486becd31de`
pass. All44 packaged64-bit native libraries have minimum load alignment16384;
AAB PAGE_ALIGNMENT_16K passes. Hermes SHA-256 matches the verified1.0.3 AAB.

Fresh read-only whole-change review found no new implementation defect and
confirmed the exact iOS source/processing/attachment evidence. Android was
still building at review time; root subsequently ran and read the complete
artifact verifier's successful output. Review-access and Play-access blockers
remain unresolved; no claim of overall store readiness is made.

Ignored files/evidence: `outputs/releases/2026-10-09-1.0.4/`.

## Apple

App/bundle identities were verified before mutation: ASC `6809467636`,
`kr.ac.sogang.aisw.campus`.

- Current live version queried as 1.0.3/build 14, READY_FOR_DISTRIBUTION.
- The earlier 1.0.3/build 15 upload `6a91c47b` finished in EAS, but is not the
  public update candidate and its Apple processing was not established.
- New 1.0.4/build 16 [EAS submission](https://expo.dev/accounts/kimjinsan11/projects/sogang-community/submissions/a2789199-123a-4ed8-9ce9-dc33d8674a01)
  is FINISHED. Apple independently reports **VALID**, not expired, exact build
  ID `5410b537-377e-4055-9b60-46af34e76c2f`.
- Exact valid build attached to 1.0.4 version ID
  `ef4e32cf-1966-492a-9f61-eda44273818b`; state PREPARE_FOR_SUBMISSION.
- Description, keywords, marketing/promotional values and five existing iPhone
  screenshots are preserved. Update explanation describes poll/participant
  display and tab-navigation fixes. Support URL is the verified canonical page.
- Release type is MANUAL: scope is review; approval will not trigger automatic
  publication. No App Review submission or public release has been performed.

**Blocked:** the inherited App Review demo login ID is not an email, while the
renewed production login requires EmailStr. The validation request returned422.
A valid production review email/account or direct ASC review-detail correction
is needed before submitting an app the reviewer cannot currently sign into.
No demo credential contents or tokens were written to evidence or tool output;
no production account was created or password changed.

The official localization client's partial update defaults omitted fields to
null. A temporary draft metadata clear was restored from the exact live1.0.3
values, and all inherited text fields were compared for equality before build
attachment. Live versions were untouched.

## Google Play

**Blocked:** EAS has no Play submission service-account key for this package.
The user's requested search of documents, retained build logs and prior task
records found only `aisw-campus-production`, the distinct Android signing key;
no existing Play key path or developer/app ID was found. Current GCP project
lists only the Compute default service account. No key, API/IAM grant or new
store identity was created.

The user reported Google login in a separate computer Chrome window. Enabled
browser inventory exposes only Codex IAB, and selecting Chrome returned
unavailable. Its login/cookies were not extracted or transferred. Play Console
access through an available session or an existing submission key remains
required. No Play upload, highest-existing-versionCode check, track mutation,
review or public release has been performed.

## Other deployment scope

Production `/health`, `/health/ready`, `/healthz`, support, privacy and account
deletion URLs return200. This operation does not redeploy the GCP runtime or
change backend/DB. The earlier 1.0.3 APK remains available from the prior release
record; a new APK is not needed for store submission.
