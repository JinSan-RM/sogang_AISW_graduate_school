# Runtime Smoke Test

Use the tracked `docker-compose.qa.yml` so verification never touches the normal development Compose project or its `pgdata` volume. The QA project uses:

- project name: `aisw_p0qa`
- PostgreSQL host port: `55432`
- backend host port: `58000`
- dedicated volume: `aisw_p0qa_qa_pgdata`

The test secret and disabled external providers in this file are for isolated local QA only.

## 1. Validate, Build, and Start

From the repository root:

```powershell
docker compose -p aisw_p0qa -f docker-compose.qa.yml config -q
docker compose -p aisw_p0qa -f docker-compose.qa.yml build
docker compose -p aisw_p0qa -f docker-compose.qa.yml up -d
docker compose -p aisw_p0qa -f docker-compose.qa.yml ps -a
```

Expected: database and backend are healthy; notification worker is running.

## 2. Confirm Clean Migration and Seed

```powershell
docker compose -p aisw_p0qa -f docker-compose.qa.yml exec -T backend alembic current --check-heads
docker compose -p aisw_p0qa -f docker-compose.qa.yml exec -T db `
  psql -U postgres -d sogang_app_qa -Atc `
  "SELECT version_num FROM alembic_version;
   SELECT 'users='||count(*) FROM users;
   SELECT 'boards='||count(*) FROM boards;
   SELECT 'banners='||count(*) FROM banners;"
```

Expected:

```text
0021_account_deletion_receipts
users=1
boards=32
banners=1
```

This QA stack is non-production, so the `users=1` result is the deterministic local fixture. Production must instead use non-authoritative reference seeding: no user creation, no overwrite of operator-edited reference content, and no deactivation of custom boards. After a real member is active, the first production administrator is promoted once from the backend directory with:

```powershell
$env:APP_ENVIRONMENT = "production"
python scripts/bootstrap_initial_admin.py --email <existing-active-member>
```

The automated release-runtime regression is the safe local verification of this production-only command. Do not point a manual rehearsal at production data.

## 3. Run Tests Against an Isolated PostgreSQL Test Database

The runtime Docker image intentionally contains production dependencies only. Install test dependencies in the host virtual environment:

```powershell
Set-Location backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt -r requirements-test.txt
Set-Location ..

docker compose -p aisw_p0qa -f docker-compose.qa.yml exec -T db `
  createdb -U postgres sogang_app_test

Set-Location backend
$env:TEST_DATABASE_URL = "postgresql+psycopg://postgres:postgres@127.0.0.1:55432/sogang_app_test"
$env:APP_ENVIRONMENT = "test"
$env:ALLOW_TEST_DB_RESET = "1"
python -m pytest -q
python scripts/verify_backend.py
Set-Location ..
```

Pytest drops and recreates every table in `TEST_DATABASE_URL`. It refuses external database resets unless all three controls are present:

1. `APP_ENVIRONMENT=test`
2. `ALLOW_TEST_DB_RESET=1`
3. database name is exactly `test`, starts with `test_`, or ends with `_test`

Never point `TEST_DATABASE_URL` at development, staging, or production data.

## 4. Verify Exact Legacy Fingerprint Recovery

Create another disposable database, build only revision `0001`, remove its version marker, and run the guarded migration entry point:

```powershell
docker compose -p aisw_p0qa -f docker-compose.qa.yml exec -T db `
  createdb -U postgres sogang_app_legacy_test

Set-Location backend
$env:DATABASE_URL = "postgresql+psycopg://postgres:postgres@127.0.0.1:55432/sogang_app_legacy_test"
$env:APP_ENVIRONMENT = "test"
alembic upgrade 0001_phase1_init
Set-Location ..

docker compose -p aisw_p0qa -f docker-compose.qa.yml exec -T db `
  psql -U postgres -d sogang_app_legacy_test -v ON_ERROR_STOP=1 `
  -c "DROP TABLE alembic_version;"

Set-Location backend
python -m app.migrate
alembic current --check-heads
Set-Location ..
```

Expected: the exact schema is stamped at `0001` and upgraded to `0021_account_deletion_receipts`. A missing, ambiguous, or structurally different schema must stop before stamp or upgrade.

## 5. Verify Current-Head Reversibility and Failure Safety

On a disposable current-head database with no completed account deletion, verify the new migrations can downgrade to the previous stable head and return:

```powershell
Set-Location backend
$env:DATABASE_URL = "postgresql+psycopg://postgres:postgres@127.0.0.1:55432/sogang_app_qa"
alembic downgrade 0019_past_councils
alembic upgrade head
alembic current --check-heads
Set-Location ..
```

Expected: `0021`→`0019`→`0021` succeeds. If an account has already been irreversibly anonymized, the `0020` downgrade must fail rather than invent non-null authors.

Run the migration tests against an unknown or modified unversioned schema. Expected: the bootstrap exits nonzero without stamping or changing the schema.

## 6. Health, Auth, Content, and Admin API

```powershell
$base = "http://127.0.0.1:58000"
Invoke-RestMethod "$base/health"

$login = Invoke-RestMethod -Method Post `
  -Uri "$base/api/auth/login" `
  -ContentType "application/json" `
  -Body '{"email":"test@sogang.ac.kr","password":"password123"}'

$accessToken = $login.data.access_token
$authHeader = @{ Authorization = "Bearer $accessToken" }

Invoke-RestMethod "$base/api/users/me" -Headers $authHeader
$boardGroups = Invoke-RestMethod "$base/api/boards" -Headers $authHeader
Invoke-RestMethod "$base/api/search?q=notice" -Headers $authHeader
Invoke-RestMethod "$base/api/faqs" -Headers $authHeader
Invoke-RestMethod "$base/api/events" -Headers $authHeader
Invoke-RestMethod "$base/api/notifications/settings/me" -Headers $authHeader
Invoke-RestMethod "$base/api/admin/stats" -Headers $authHeader
```

Confirm a guest content request is normalized:

```powershell
curl.exe -sS -o NUL -w "%{http_code}" "$base/api/users/me"
```

Expected: `401`, with `{status, message, code}` when the response body is inspected.

The automated PostgreSQL suite is the authoritative owner/member/admin matrix for mutual-aid, draft/hidden/deleted posts, anonymous authors, comment IDs, reports, reactions, activity, search, and attachments.

## 7. Media Upload and Signed Access

Create a disposable valid PNG:

```powershell
$smokeFile = Join-Path $env:TEMP "aisw-media-smoke.png"
$pngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZlGAAAAAASUVORK5CYII="
[IO.File]::WriteAllBytes($smokeFile, [Convert]::FromBase64String($pngBase64))

$uploadJson = curl.exe -sS -X POST "$base/api/media/uploads" `
  -H "Authorization: Bearer $accessToken" `
  -F "file=@$smokeFile;type=image/png" `
  -F "private=true"
$upload = $uploadJson | ConvertFrom-Json
$mediaId = $upload.data.id

$access = Invoke-RestMethod "$base/api/media/$mediaId/access-url" -Headers $authHeader
curl.exe -sS -o NUL -w "%{http_code}" "$base$($access.data.url)"
curl.exe -sS -o NUL -w "%{http_code}" "$base/api/media/$mediaId/access-url"
curl.exe -sS -o NUL -w "%{http_code}" "$base/uploads/$($upload.data.stored_filename)"
```

Expected:

- upload status `ready`
- authorized signed URL `200`
- access-URL issuance without token `401`
- legacy public `/uploads/...` path `404`
- signed URL expiry matches `MEDIA_ACCESS_URL_EXPIRE_SECONDS`

## 8. Notification Worker

```powershell
docker compose -p aisw_p0qa -f docker-compose.qa.yml exec -T backend `
  python scripts/run_notification_jobs.py
docker compose -p aisw_p0qa -f docker-compose.qa.yml logs `
  --no-color --tail=100 backend notification-worker
```

Confirm the job returns reminder/receipt/rate-limit counts and the scheduler records its next KST run.

Real FCM/APNs delivery still requires an EAS development/preview or release build on physical Android and iOS devices.

## 9. Frontend CI-Equivalent Checks

```powershell
Set-Location frontend
npm ci --legacy-peer-deps
npm run lint
npm test
npm run typecheck
npm run doctor
npm run export:web
npm audit --omit=dev
Set-Location ..
```

Treat a nonzero audit result as a recorded release risk even when it is isolated to the Expo/React Native build toolchain.

## 10. Dependency Security Checks

Use an isolated Python environment:

```powershell
Set-Location backend
python -m pip_audit -r requirements.txt
Set-Location ../frontend
npm audit --omit=dev
Set-Location ..
```

The backend gate requires zero known vulnerabilities. A nonzero frontend result must record severity, root advisories, available remediation, breaking-change impact, owner, and decision; it is not waived merely because it is transitive.

## 11. Database and Media Restore Rehearsal

Create a PostgreSQL custom-format dump, restore only into a new disposable database, and compare:

- table count;
- every table's row count;
- column fingerprint;
- index fingerprint;
- primary/unique/foreign/check constraint fingerprint.

Archive both protected media roots with `tar`, extract into a new disposable directory, and compare relative paths, sizes, and SHA-256 checksums. Never restore a rehearsal over live data.

## 12. Production Compose and Web Rehearsal

Using temporary non-secret rehearsal values, validate and build `docker-compose.production.example.yml`. Confirm:

- PostgreSQL, backend, and notification worker are healthy;
- backend and worker run as UID `10001`;
- backend readiness and guest/authenticated/admin HTTP checks pass;
- one-shot notification worker execution passes;
- frontend web `/healthz` returns success;
- a direct Expo Router deep link returns the SPA shell rather than an Nginx 404.

This is a local topology check. It does not verify public DNS/TLS, production secrets, SMTP/push providers, durable storage, or live monitoring.

## 13. Cleanup

First verify the exact QA project targets:

```powershell
docker compose -p aisw_p0qa -f docker-compose.qa.yml ps -a
docker volume ls --filter "label=com.docker.compose.project=aisw_p0qa"
```

Then remove only the disposable QA containers/network/volume:

```powershell
docker compose -p aisw_p0qa -f docker-compose.qa.yml down -v
```

Do not run `down -v` against the normal `aisw_app_renewal` project.

## Recorded Result — 2026-07-27

- QA Compose config/build/start: pass
- Clean PostgreSQL migration: `0021_account_deletion_receipts`
- Seed: `users=1`, `boards=32`, `banners=1`
- Final current-source backend rerun: SQLite 104/104 in 5.41 seconds; isolated PostgreSQL 104/104 in 31.42 seconds
- Migration paths: clean; `0019`→head; `0021`→`0019`→`0021`; exact unversioned `0001` recovery to head; unknown schema fail-closed — all pass
- Health/auth/board/post/search/FAQ/event/notification/admin/account-deletion API: pass
- Private PDF upload and signed access: `200`; no-token `401`; public path `404`
- Notification job, scheduler, and one-shot worker: pass; latest one-shot output was `reminders=0`, `receipts=0`, `removed_rate_limits=0`, `removed_account_deletion_receipts=0`
- Production seed/bootstrap regression: no demo user creation, operator-edited reference content and custom boards preserved, one-time initial-admin promotion/audit/refusal behavior pass
- Operational-alert adapter regression: structured non-PII payload and webhook-secret-safe failure logging pass; live provider delivery remains external
- CI hardening: workflow permission is `contents: read`; backend audit tool is pinned as `pip-audit==2.10.1`
- Secret scan: checksum-verified Gitleaks 8.30.1 found zero findings in 43 commits and 298 current non-ignored files; CI full-history scan is configured, final signed artifact scan remains
- Dependency/license review: CycloneDX 1.6 backend/frontend production SBOM validation pass; forbidden, strong-copyleft-only, and unknown licenses 0; final signed native notice verification remains
- Frontend: lint zero errors/zero warnings, tests 7/7, typecheck pass, Doctor 17/17, web export pass; after the lockfile update, clean `npm ci --legacy-peer-deps` revalidation again passed lint 0/0, tests 7/7, and typecheck
- Backend dependency audit: zero known vulnerabilities
- Frontend dependency audit after the safe `postcss` 8.5.18 update: runtime/`--omit=dev` 33 affected entries (critical 0, high 19, moderate 14); all dependencies 40 (critical 0, high 26, moderate 14). Remaining remediation requires incompatible major overrides or a breaking Expo 57/React Native 0.86 upgrade, so owner acceptance or upgrade approval remains required
- PostgreSQL dump/restore: 30 tables; identical all-table counts and column/index/constraint fingerprints
- Media tar/restore: relative paths, sizes, and SHA-256 checksums identical
- Docker runtime: database/backend healthy, worker running; backend and worker UID 10001; `/health/ready` returned `200` with database ready, and guest/authenticated/admin HTTP checks pass
- Production Compose config/build and web `/healthz`/deep-link fallback: pass
- Disposable local unsigned Android release-bundle rehearsal: `:app:bundleRelease` passed from an isolated Windows short-path copy of the same 115 frontend source files; bundletool 1.18.3 validation, target API 36, `PAGE_ALIGNMENT_16K`, release-manifest security, and an extracted-artifact Gitleaks scan passed. Historical SHA-256: `5c2acf192fad9d02449cdc9acef059fb98d67655ea684aecc455f0378ee474e0`; the temporary path is not retained as release evidence
- Local bundle limitation: `jarsigner` reported unsigned; package/version remained `com.anonymous.sogangcommunity` / `0.1.0` / `1`, and localhost plus development-client strings remained. This is compile/audit evidence, not a production or store candidate
- Store boundary: strict release configuration check is `BLOCKED_EXTERNAL` by 18 approved inputs; no EAS production variables, remote versions, signed AAB, or iOS archive were created or inspected
