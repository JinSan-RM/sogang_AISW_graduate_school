# GCP IP Production Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy the complete AISW production-shaped stack on one Debian 13 GCP VM at `https://34.50.35.119`, automatically maintain a publicly trusted IP certificate, and import `board_articles_ver3.xlsx` plus `attachments_ver2` through an isolated PostgreSQL review-and-restore gate.

**Architecture:** Keep PostgreSQL private, attach a fixed-address Nginx container to a dedicated internal ingress network, and expose only host ports 80/443. A Certbot 5.7 container obtains and renews Let's Encrypt `shortlived` IP certificates through a shared ACME webroot; Nginx reloads when the certificate fingerprint changes. Legacy source files enter an operator-only staging directory, import only into a `migration_review` database, pass manifest verification, and are restored as one coordinated database/media set into fresh production targets.

**Tech Stack:** Docker Engine 29, Docker Compose 5, Nginx 1.31 Alpine, Certbot 5.7, Let's Encrypt ACME HTTP-01, FastAPI, PostgreSQL 16, Alembic, Bash, pytest.

## Global Constraints

- Target host is Debian 13 x86_64 with 2 vCPU, 8 GiB RAM, 2 GiB swap, and a 50 GB disk.
- Public IPv4 is the reserved static address `34.50.35.119`; there is no domain and Cloudflare remains disabled.
- Only TCP 80/443 are application ingress. PostgreSQL, FastAPI 8000, and Expo web 8080 must not bind publicly.
- Production keeps `APP_ENVIRONMENT=production`, `SEED_DEMO_DATA=false`, rate limiting enabled, and trusts only the fixed Nginx peer `/32`.
- IP certificates use Certbot 5.4 or newer, the Let's Encrypt `shortlived` profile, and automated renewal because validity is 160 hours.
- Raw legacy inputs are never committed or served. Server-side staging is mode `0700`, import targets only a database whose name contains `migration_review`, and raw-source cleanup remains an explicit operator step after successful cutover.
- `board_articles_ver3.xlsx`, `comments.xlsx`, the approved legacy reference workbook/CSV, and all 648 `attachments_ver2/attachments` files are fingerprinted before import.
- Unsupported archived files remain in the private source archive and are not exposed by the media API; any unexpected missing/orphaned/failed supported attachment aborts import.
- A production deployment cannot be declared ready until real SMTP, support/operator/privacy values, push configuration, alert webhook, certificate, API, web, and restored media verification all pass.

---

### Task 1: Executable IP-ingress contract tests

**Files:**
- Create: `backend/tests/test_ip_production_deployment.py`
- Test: `backend/tests/test_release_runtime.py`

**Interfaces:**
- Consumes: existing `Settings.validate_runtime()` and Docker Compose files.
- Produces: regression assertions for public IPv4 runtime settings, fixed proxy trust, non-public service ports, TLS mounts, and renewal services.

- [ ] **Step 1: Write failing runtime and deployment-file tests**

```python
def test_public_ipv4_production_runtime_is_accepted():
    production_settings(
        allowed_hosts="34.50.35.119",
        public_api_url="https://34.50.35.119/api",
        support_url="https://34.50.35.119/support",
        privacy_policy_url="https://34.50.35.119/privacy",
        account_deletion_url="https://34.50.35.119/account-deletion",
        cors_origin_regex=r"^https://34\.50\.35\.119$",
        rate_limit_trusted_proxy_ips="172.30.251.14/32",
    ).validate_runtime()
```

The deployment-file test must assert that `docker-compose.ip.yml` exposes only `80:80` and `443:443`, assigns `172.30.251.14`, mounts the certificate volume read-only into Nginx, and does not publish the database.

- [ ] **Step 2: Run tests to verify the new deployment-file test fails**

Run: `python -m pytest backend/tests/test_ip_production_deployment.py backend/tests/test_release_runtime.py -q`

Expected: the IPv4 runtime test passes and the deployment-file test fails because `docker-compose.ip.yml` does not exist.

- [ ] **Step 3: Keep the test fixtures free of usable credentials**

Use only syntactically valid fake provider endpoints and secrets already accepted by `production_settings()`; never copy local `.env` values into tests.

- [ ] **Step 4: Run the focused runtime test again**

Run: `python -m pytest backend/tests/test_release_runtime.py -q`

Expected: PASS.

### Task 2: Nginx and Certbot IP ingress

**Files:**
- Create: `docker-compose.ip.yml`
- Create: `deploy/nginx/ip.conf.template`
- Create: `deploy/nginx/ip-bootstrap.conf`
- Create: `deploy/nginx/watch-certificates.sh`
- Modify: `.env.production.example`
- Test: `backend/tests/test_ip_production_deployment.py`

**Interfaces:**
- Consumes: `PUBLIC_IP`, `TLS_CONTACT_EMAIL`, `IP_INGRESS_SUBNET`, `IP_INGRESS_PROXY_IP`, and the existing backend/frontend services.
- Produces: services `nginx-bootstrap`, `nginx`, `certbot`, and `certificate-renewer`; volumes `letsencrypt` and `certbot_webroot`; network `ip_ingress`.

- [ ] **Step 1: Add the dedicated ingress overlay**

Pin `nginx:1.31.3-alpine` to `sha256:4a73073bd557c65b759505da037898b61f1be6cbcc3c2c3aeac22d2a470c1752` and `certbot/certbot:v5.7.0` to `sha256:34ee91d2f43008eb78a007d22f23ed4b2eaa9a454cb27ca2c042b49527a695b4`. Attach backend, frontend, and Nginx to `172.30.251.0/28`; assign only Nginx `172.30.251.14`.

- [ ] **Step 2: Add HTTP bootstrap configuration**

Serve only `/.well-known/acme-challenge/` from `/var/www/certbot` and return `404` for every other path while the trusted certificate is absent.

- [ ] **Step 3: Add HTTPS reverse-proxy configuration**

Redirect HTTP to HTTPS after preserving the ACME path. Proxy `/api/`, `/health`, and `/health/ready` to `backend:8000`; proxy all remaining routes to `frontend-web:8080`. Overwrite `X-Forwarded-For` with `$remote_addr`, set `X-Forwarded-Proto https`, allow a 20 MiB upload plus framing overhead, and load `/etc/letsencrypt/live/${PUBLIC_IP}/fullchain.pem` and `privkey.pem`.

- [ ] **Step 4: Reload Nginx on certificate changes**

The watcher records `sha256sum` of `fullchain.pem`, checks every 300 seconds, and runs `nginx -s reload` only when the checksum changes.

- [ ] **Step 5: Add IP-specific environment examples**

Document:

```dotenv
PUBLIC_IP=34.50.35.119
TLS_CONTACT_EMAIL=replace-with-monitored-address
IP_INGRESS_SUBNET=172.30.251.0/28
IP_INGRESS_PROXY_IP=172.30.251.14
RATE_LIMIT_TRUSTED_PROXY_IPS=172.30.251.14/32
ALLOWED_HOSTS=34.50.35.119
PUBLIC_API_URL=https://34.50.35.119/api
CORS_ORIGIN_REGEX=^https://34\.50\.35\.119$
```

- [ ] **Step 6: Run the deployment contract test**

Run: `python -m pytest backend/tests/test_ip_production_deployment.py -q`

Expected: PASS.

### Task 3: One-command certificate and application lifecycle

**Files:**
- Create: `scripts/production-ip.sh`
- Test: `backend/tests/test_ip_production_deployment.py`

**Interfaces:**
- Consumes: `.env.production`, `.env.production.worker`, base/production/IP Compose files, and Docker Compose.
- Produces: actions `Config`, `IssueStaging`, `Issue`, `Up`, `Renew`, `Ps`, `Logs`, and `Smoke`.

- [ ] **Step 1: Write failing script-contract tests**

Assert the script rejects a non-global IPv4, `CLOUDFLARE_ENABLED=true`, proxy trust not equal to `${IP_INGRESS_PROXY_IP}/32`, placeholder contact email, and a certificate lineage whose SAN does not contain the configured IP.

- [ ] **Step 2: Implement configuration preflight**

Resolve env files, validate required keys without printing values, verify that `PUBLIC_API_URL` and all public web URLs use the configured IP, and call `docker compose ... config --quiet` with all three Compose files.

- [ ] **Step 3: Implement staged and live issuance**

Start only `nginx-bootstrap`, then run Certbot webroot with:

```bash
certbot certonly --non-interactive --agree-tos --email "$TLS_CONTACT_EMAIL" \
  --preferred-profile shortlived --webroot --webroot-path /var/www/certbot \
  --ip-address "$PUBLIC_IP" --cert-name "$PUBLIC_IP"
```

`IssueStaging` adds `--staging`; `Issue` does not. Stop bootstrap after every attempt through a shell trap.

- [ ] **Step 4: Implement healthy startup and renewal**

`Up` requires the live certificate, starts backend/frontend/worker/Nginx/renewer with `--wait`, verifies no Cloudflare connector is running, and runs `Smoke`. `Renew` runs `certbot renew`, reloads Nginx, and verifies certificate dates/SAN. The long-running renewer attempts renewal every 12 hours; the Nginx watcher provides the reload handoff.

- [ ] **Step 5: Implement external smoke checks**

Use `curl --fail --proto '=https' --tlsv1.2` against `/health`, `/health/ready`, `/healthz`, and a frontend deep link; inspect the peer certificate with `openssl s_client` and reject a SAN mismatch or less than 24 hours remaining.

- [ ] **Step 6: Run syntax and contract tests**

Run: `bash -n scripts/production-ip.sh deploy/nginx/watch-certificates.sh`

Run: `python -m pytest backend/tests/test_ip_production_deployment.py -q`

Expected: PASS.

### Task 4: Isolated Ver3 legacy-data bootstrap

**Files:**
- Create: `scripts/production-import-legacy.sh`
- Modify: `data/README.md`
- Modify: `OPERATIONS.md`
- Test: `backend/tests/test_ip_production_deployment.py`

**Interfaces:**
- Consumes: an absolute operator-owned source directory, `.env.production`, and the backend image.
- Produces: a verified review database, `pg_dump` artifact, public/private media archives, redacted reports, SHA-256 manifest, and fresh production database/media volumes.

- [ ] **Step 1: Write failing import-script safety tests**

Assert rejection when the source is world-readable, files are missing, the attachment count is not 648, the review database name lacks `migration_review`, production services are running, the target database is non-empty, or the target media volumes already contain files.

- [ ] **Step 2: Fingerprint the approved source set**

Require explicit paths for Ver3 articles, comments, legacy reference workbook, raw CSV, and `attachments_ver2/attachments`. Write SHA-256 values and file counts to a mode-`0600` staging report without logging article content or personal fields.

- [ ] **Step 3: Import into the isolated database**

Create a timestamped `aisw_migration_review_*` database, run Alembic to head, execute `import_legacy_articles.py --apply` with all explicit Ver3 paths, and write media into timestamped review directories. Never point the importer at the production database.

- [ ] **Step 4: Verify and package one coordinated set**

Run `verify_legacy_media.py`, capture `manifest_sha256`, create a PostgreSQL custom dump and public/private tar archives, hash all artifacts, and fail if the verification report contains failures.

- [ ] **Step 5: Restore only into fresh targets**

Restore the verified dump into the empty production database and each tar into a newly created named volume. Run the verifier again from the backend image with `--expected-manifest-sha256` before starting public services.

- [ ] **Step 6: Print an explicit cleanup checklist**

On success, print the exact review database, source staging path, and artifact paths that remain. Do not delete the raw source automatically; require the operator to confirm application-level checks first and then remove the resolved staging directory explicitly.

- [ ] **Step 7: Run importer and deployment regressions**

Run: `python -m pytest backend/tests/test_legacy_import.py backend/tests/test_media_security_and_migrations.py backend/tests/test_ip_production_deployment.py -q`

Expected: PASS.

### Task 5: Documentation and complete verification

**Files:**
- Modify: `OPERATIONS.md`
- Modify: `CODEX.md`
- Modify: `QA_서버_업다운_명령어.txt`

**Interfaces:**
- Consumes: all scripts and Compose interfaces above.
- Produces: a copy/paste GCP runbook that distinguishes infrastructure-ready, production-runtime-ready, data-verified, and device-verified states.

- [ ] **Step 1: Document the exact VM workflow**

Document source clone, secret env creation, private data transfer, `Config`, staging certificate rehearsal, live issuance, isolated import, `Up`, `Smoke`, logs, renewal dry run, backup, rollback, and explicit raw-source cleanup.

- [ ] **Step 2: Record external blockers without weakening production validation**

List real SMTP credentials, monitored support/reply-to addresses, approved privacy retention days/operator/policy values, Expo FCM/APNs credentials, and a working HTTPS alert webhook as mandatory production inputs. Test placeholders may not be labeled production-ready.

- [ ] **Step 3: Run the focused and full backend suites**

Run: `python -m pytest backend/tests/test_ip_production_deployment.py backend/tests/test_legacy_import.py backend/tests/test_release_runtime.py -q`

Run: `python -m pytest backend/tests -q`

Expected: all new/focused tests pass; any pre-existing unrelated failure is recorded with its exact test name and output.

- [ ] **Step 4: Render Compose with a synthetic non-secret environment**

Run: `docker compose --env-file <generated-test-env> -f docker-compose.yml -f docker-compose.production.example.yml -f docker-compose.ip.yml config --quiet`

Expected: exit 0; database has no public port, backend/frontend bind only loopback, and Nginx alone binds 0.0.0.0:80/443.

- [ ] **Step 5: Verify source and secret hygiene**

Run: `git status --short`, `git diff --check`, and a tracked-file scan proving `.env.production`, raw spreadsheets, attachments, dumps, archives, and migration reports are absent from Git.

- [ ] **Step 6: Update the operational readiness record**

Mark code/static verification as passed only with captured output. Keep live GCP TLS, SMTP, push, Android/iOS, and browser checks pending until they run against `34.50.35.119`.
