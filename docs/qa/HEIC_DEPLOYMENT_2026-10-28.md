# HEIC production deployment — 2026-10-28

WP5/WP9 P0. The user explicitly requested production deployment and verification
of the existing HEIC pictures on the web. Backend/worker deployment completed at
**10:52 KST**, application revision `68ae2895701c38bafad87269dae2ed52a699d19a`.

## Deployment and preservation

- VM: existing `sogang-aisw-app`, canonical `https://www.aisw-campus.com` and the
  installed-client API `https://34.50.35.119`.
- Backend and notification worker run the same pinned candidate image:
  `sha256:1a8984b6c73287b804173db8bee1be91c80591e70ed3365849ae4f4920067ce4`.
  Both retain `appuser`, their exact previous environment and durable volume mounts.
- All 100 running backend Python sources match the committed source manifest.
  The frontend image and operator-owned environment files remain byte-identical.
- Server checkout is on `codex/heic-jpeg-display` at `68ae289`; default Compose
  backend/worker image tags select the candidate. Existing domain/IP ingress and
  volumes are retained. Nginx was reloaded after the backend address changed.
- Coordinated DB, public-media and private-media backup, checksums, archive reads
  and PostgreSQL dump contents validation passed. Final private backup:
  `/srv/aisw-backups/heic-20261028-68ae289-attempt2`.
- Database remains `0035_poll_question_deadline`; `alembic check` reports no new
  upgrade operations. No schema migration or production content edit was required.

## Runtime checks

- Candidate Linux Python 3.12 image imports the application and libheif 1.23.6.
- Full Linux backend suite: **658 passed, 2 skipped**. Both skips require a separate
  PostgreSQL transaction-lock test database. Existing Python 3.12 datetime/httpx
  deprecation warnings remain (13202 warnings), not new HEIC test failures.
- The test runner used the candidate dependency image and an immutable read-only
  source checkout, with no network or production database/secret access. Separate
  rehearsal converted read-only production HEIC copies inside the candidate image.
- Both HTTPS origins return readiness 200. Backend, worker, frontend, database
  and ingress remain running; healthchecked services report healthy.

## Live existing-image verification

Read-only operational verification selected an existing ordinary member and used
a one-minute access token held only in process memory. No refresh/login session,
account, post, poll, or notification test record was created.

For both the canonical domain and the installed-client IP origin:

- The actual networking certification feed returns posts 989, 990 and 991 with
  existing thumbnail media IDs 1159, 1160 and 1161.
- Authenticated access URLs issue signed JPEG previews; all six downloads return
  `200 image/jpeg`, decode at 2048x1536, and contain no EXIF.
- `original=true` returns original HEIC bytes. Their SHA-256, stored filename,
  privacy and original byte size match the **pre-deployment** manifest.
- Unauthenticated access-URL requests return 401; substituting a preview signature
  into the original file endpoint returns 403. Browser-origin CORS checks pass.

Chromium then loaded the six actual production signed URLs from a local
verification page: **6/6 loaded with 2048x1536 natural dimensions**. The page shows
the three live pictures using the same IP image origin as the existing web bundle.
This verifies production image serving and browser rendering; the normal web-app
login/menu UI was not separately driven in this check.

Local private evidence (not committed):

- `.codex-tmp/heic-deploy/live-api-evidence.json`
- `outputs/qa/heic-deployment-2026-10-28/browser-results.json`
- `outputs/qa/heic-deployment-2026-10-28/production-jpeg-browser.png`

An already-open app/web page should be refreshed so its in-memory media query
obtains the new JPEG representation URL. Physical native/HDR visual QA remains
`Phase 5 QA`; this backend fix does not require a store release.

## Preparation and recovery notes

An initial thin Git bundle could not resolve objects in the server checkout.
A complete bundle supplied the required history. The build used a LF-normalized
immutable archive verified against all 221 backend Git blobs. Early isolated test
runner attempts lacked excluded tests or access to the private bind mount; those
commands failed before service cutover and were corrected before the green run.

The first coordinated-backup attempt then stopped at a Git metadata permission
check after checkout. Its error handler restored the old runtime. Task-created
root-owned checkout files were restored to the repository owner, and a fresh
coordinated backup preceded the successful second attempt. A pre-existing
unreadable frontend directory was left untouched; root read-only Git checks
confirmed that tracked content was clean. Existing untracked operator files remain.
The initial attempt is not reported as a successful rollout.
