# HEIC display compatibility — 2026-10-28

WP5/WP9 P0. The user clarified that the incident affects web display; their native
app can display the photos. The supplied screenshot selects Networking > Activity
certification, not the administrator guide list. Posts 991/990/989 use HEIC media
1161/1160/1159. Ordinary member authorization and stored files were valid.

## Implementation

- Preserve original bytes and all media/attachment IDs and original metadata.
- Default access URLs select representation-scoped signed JPEG previews for
  HEIC/HEIF. `original=true` and existing original file URLs retain original bytes.
- Generate new-upload copies before success; lazily cover legacy uploads.
  Copies are versioned atomic sidecars in the same protected storage directory.
- Apply orientation, fit within 2048px, quality 88, RGB output, no EXIF. Reject
  corrupt images and decoded inputs over 50 million pixels without partial files.
- Bound conversion concurrency and offload eager conversion from the async upload
  event loop. Account deletion and rollback include sidecars; source-existence
  guards prevent publication after concurrent deletion.

## Evidence

The initial seven API regressions failed before implementation: HEIC bytes were
served as HEIC, signatures did not distinguish representations, and corrupt HEIC
was accepted. The final suite includes real encoded HEIC/HEIF, legacy generation,
private/member/guest access, original retrieval, token expiry/substitution,
concurrent generation, orientation/size, cleanup and deletion rollback. A fixture
orientation issue was corrected by putting EXIF on the encoder call, avoiding
double orientation in the generated fixture.

An independent read-only review found event-loop blocking and deletion/publication
race issues. Both were reproduced with failing tests and fixed. Review exclusions
remain physical native rendering, HDR visual fidelity and Linux runtime installation.

Read-only production copies of the three affected HEICs converted successfully.
For each copy, the original SHA-256 remained unchanged. Output JPEGs are 2048x1536,
contain no EXIF, and are 537583/532206/621381 bytes for IDs 1159/1160/1161.
Chromium loaded all three JPEGs with nonzero natural dimensions while all three
identical HEIC originals failed decoding. No production content or server was changed.
Private local evidence: `.codex-tmp/heic-jpeg-verification/conversion-evidence.json`
in the original checkout; original photos and preview bytes are not committed.

## Verification and remaining gates

- Original baseline: 643 passed, 3 skipped (SQLite suite).
- Final candidate suite after both review fixes: **657 passed, 3 skipped**.
  Skips: two PostgreSQL-only lock tests and one Windows symlink-privilege test.
  One existing Starlette/httpx deprecation warning remains.
- Focused final conversion/API/lifecycle tests: 14 passed.
- Backend compile/import and new preview route OpenAPI checks pass.
- Frontend typecheck passes; no frontend sources changed.
- `pip-audit -r requirements.txt`: no known vulnerabilities, including the two
  newly pinned image dependencies.
- Local Docker runtime smoke is **blocked**: Docker Desktop Linux daemon is not
  running (`dockerDesktopLinuxEngine` named pipe is absent). Production wheel
  availability is verified; this is not a Linux runtime pass.
- `Phase 5 QA`: physical iOS/Android and HDR/wide-gamut visual comparison.
- Operational deployment is pending; the live website still serves its previous
  backend until the candidate backend image is deployed. Existing HEICs require
  no DB backfill and generate JPEGs when accessed after deployment.
