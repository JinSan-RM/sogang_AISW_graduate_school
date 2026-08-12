# GCP single-VM public-IP production rehearsal

This runbook deploys the production runtime to one Debian VM and publishes it
directly at `https://34.50.35.119`. It intentionally does not use Cloudflare or
a domain. The same HTTPS origin serves the PC web build and the API used by
Expo Android and iOS clients.

This is a production-shaped **test deployment**, not a launch approval. The
repository keeps the production validation gate enabled. SMTP, legal metadata,
alerting, secrets, exact CORS/Host rules, durable PostgreSQL/media volumes, and
TLS must all be configured before the application can start.

Let's Encrypt generally issues short-lived IP-address certificates, and Certbot
5.4 or newer supports `--ip-address`. The overlay pins Certbot 5.7.0 and keeps
staging and live certificate state in different Docker volumes. See the
[Let's Encrypt IP certificate announcement](https://letsencrypt.org/2026/01/15/6day-and-ip-general-availability.html)
and [Certbot short-lived certificate guidance](https://letsencrypt.org/2026/03/11/shorter-certs-certbot.html).

## Fixed deployment inputs

- VM public IPv4: `34.50.35.119` (reserved/static in GCP).
- Public ports: TCP 80 and 443 only. Port 80 serves ACME HTTP-01 and redirects
  normal traffic to HTTPS after startup.
- PostgreSQL: private Compose network only; no host port.
- Backend and web fallback bindings: host loopback only (`127.0.0.1`).
- Trusted reverse-proxy peer: `172.30.251.14/32` on the private
  `ip_ingress` network.
- Source directory: `/srv/aisw-import/incoming`, mode `0700`.
- Approved source-manifest SHA-256:
  `91918ee5a1596985f3a33fe2f7a55a1a9515d80f06a903141243b3a42af8cda0`.

Do not expose ports 5432, 8000, or 8080 in the GCP firewall. Do not delete the
source archive, extracted attachments, migration reports, or coordinated
backup set until PC web and both physical-device checks pass.

## 1. Check out the deployment branch

Run these commands on the VM after the branch has been pushed:

```bash
cd /opt/aisw-app
git status --short --branch
git fetch --prune origin
git switch --create codex/gcp-ip-production --track origin/codex/gcp-ip-production
```

The `git status` output must be clean before switching. If the local branch
already exists, use:

```bash
git switch codex/gcp-ip-production
git pull --ff-only
```

## 2. Create private production environment files

```bash
cd /opt/aisw-app
umask 077
cp .env.production.example .env.production
cp .env.production.worker.example .env.production.worker
chmod 600 .env.production .env.production.worker
openssl rand -hex 32
openssl rand -hex 32
nano .env.production
nano .env.production.worker
```

Use one random value as `POSTGRES_PASSWORD` and the other as
`AUTH_SECRET_KEY`. A hexadecimal database password is already URL-safe, so use
the same password in `DATABASE_URL`. Never paste either value into chat, a
commit, a screenshot, or shell history.

Replace every placeholder. In particular, production requires:

- a monitored `TLS_CONTACT_EMAIL`;
- approved `ACCOUNT_DELETION_RECEIPT_RETENTION_DAYS`;
- real SMTP host, username, password, from address, reply-to address, and
  `SMTP_REQUIRED=true`;
- a monitored `SUPPORT_EMAIL`, approved operator name, privacy effective date,
  and privacy version;
- an approved HTTPS `OPERATIONS_ALERT_WEBHOOK_URL`, repeated exactly in the
  worker environment file;
- the same database URL, receipt-retention days, and alert settings in both
  environment files.

Keep these already documented raw-IP values unchanged:

```dotenv
PUBLIC_IP=34.50.35.119
CLOUDFLARE_ENABLED=false
RATE_LIMIT_TRUST_PROXY=true
RATE_LIMIT_TRUSTED_PROXY_IPS=172.30.251.14/32
ALLOWED_HOSTS=34.50.35.119
CORS_ORIGIN_REGEX=^https://34\.50\.35\.119$
PUBLIC_API_URL=https://34.50.35.119/api
SUPPORT_URL=https://34.50.35.119/legal/support
PRIVACY_POLICY_URL=https://34.50.35.119/legal/privacy
ACCOUNT_DELETION_URL=https://34.50.35.119/legal/account-deletion
```

Confirm that no placeholders remain without printing secret values:

```bash
if grep -nE 'replace-with|example\.invalid' .env.production .env.production.worker; then
  printf 'ERROR: replace every reported placeholder before continuing.\n' >&2
else
  printf 'No documented placeholders remain.\n'
fi

bash scripts/production-ip.sh Config
```

`Config` validates the public IP boundary, exact trusted proxy, public URLs,
TLS contact email, and the merged Compose model. Backend startup later applies
the full production runtime validation as a second gate.

## 3. Run the one-time legacy import

This command is intentionally allowed only when the production database has no
public tables, both production media volumes are empty, public services are
stopped, the source directory is private, and every source hash matches:

```bash
cd /opt/aisw-app
bash scripts/production-import-legacy.sh \
  /srv/aisw-import/incoming \
  91918ee5a1596985f3a33fe2f7a55a1a9515d80f06a903141243b3a42af8cda0
```

The importer first builds and migrates an isolated timestamped review database.
Only after all gates pass does it make a custom PostgreSQL dump, archive both
media trees, write report hashes, restore the production database, and populate
the production media volumes. It never deletes or edits the raw sources.

Expected gates for the approved `attachments_ver2` and
`board_articles_ver3.xlsx` set:

- source manifest: 653 entries with the approved manifest hash;
- attachment source: 648 non-empty regular files;
- database: 685 posts, 247 comments, 197 imported users, and 1,923 provenance
  ledger records;
- supported media: 637 files and exactly 706,706,761 verified bytes;
- unsupported media: 11 entries deliberately archived in the migration ledger
  (4 ZIP, 4 MP4, 2 TXT, and 1 IPYNB), not silently dropped;
- production media verification: the same generated SHA-256 manifest as the
  review database.

The final output prints the review database name, generated media manifest, and
`migration-output-<UTC timestamp>` path. Save those three lines. A failure after
the production restore begins is a stop condition: inspect that coordinated
backup set before changing a volume or retrying.

## 4. Issue staging and live IP certificates

GCP firewall TCP 80 must reach this VM. The staging issuance validates the
network and ACME path but is never served to users:

```bash
cd /opt/aisw-app
bash scripts/production-ip.sh IssueStaging
bash scripts/production-ip.sh Issue
```

The two commands use separate certificate volumes, so an untrusted staging
certificate cannot replace the live certificate. The live certificate is
short-lived; the renewal container checks every 12 hours, while Nginx watches
for certificate changes and reloads automatically.

## 5. Start and verify the server

```bash
cd /opt/aisw-app
bash scripts/production-ip.sh Up
bash scripts/production-ip.sh Ps
bash scripts/production-ip.sh Smoke
```

`Up` stops any Compose-managed Cloudflare connector, builds the application,
waits for PostgreSQL/backend/web/Nginx health, then runs the external HTTPS
smoke gate. `Smoke` verifies the certificate's IP SAN and validity window plus:

- `https://34.50.35.119/health`
- `https://34.50.35.119/health/ready`
- `https://34.50.35.119/healthz`
- `https://34.50.35.119/legal/privacy`

For diagnostics:

```bash
bash scripts/production-ip.sh Logs
docker compose --env-file .env.production \
  -f docker-compose.yml \
  -f docker-compose.production.example.yml \
  -f docker-compose.ip.yml ps -a
```

Run the explicit renewal path after the first successful start. It is safe even
when the certificate is not yet due and repeats the external smoke gate:

```bash
bash scripts/production-ip.sh Renew
```

### Rollback boundary

The one-time importer writes a coordinated PostgreSQL dump, public/private
media archives, reports, and `SHA256SUMS` before touching the production
database or media volumes. If import or startup fails after restoration begins:

1. stop application-facing services with the exact three-file Compose model;
2. do not rerun the importer and do not empty, rename, or delete any volume;
3. keep `/srv/aisw-import/incoming/migration-output-<timestamp>` unchanged;
4. inspect `deployment-ready.env`, `artifacts/SHA256SUMS`, and the failing logs;
5. restore only into new database/media targets by following the coordinated
   restore procedure in `OPERATIONS.md`, then switch names after verification.

Stop application-facing services without removing volumes:

```bash
docker compose --env-file .env.production \
  -f docker-compose.yml \
  -f docker-compose.production.example.yml \
  -f docker-compose.ip.yml \
  stop backend frontend-web notification-worker nginx certificate-renewer
```

Never use `down -v` on this deployment. It would remove the production
PostgreSQL/media state and is not part of this runbook.

## 6. PC web and Expo device checks

Open `https://34.50.35.119` in a PC browser. Verify list/detail screens, Korean
text, images/documents, comments, login email, upload/download, the three legal
deep links, and a browser refresh while on a deep link.

For local Expo development, set the public API URL before restarting Metro:

```bash
cd frontend
EXPO_PUBLIC_API_URL=https://34.50.35.119/api npx expo start --clear
```

On Windows PowerShell use:

```powershell
Set-Location frontend
$env:EXPO_PUBLIC_API_URL = "https://34.50.35.119/api"
npx expo start --clear
```

Test on physical Android and iOS devices over a network that can reach the
public IP. Verify signup/email verification, login/restart persistence,
post/comment reads, every imported attachment type that remains supported,
upload/download authorization, and logout. A native client does not need a CORS
entry, but it still requires the valid public certificate.

If admin-path testing is in scope, first register and activate the designated
member through the normal production email flow. Then run the one-time bootstrap
with that existing active email (do not put it in shell history on a shared
machine):

```bash
read -r -p 'Existing active admin email: ' admin_email
docker compose --env-file .env.production \
  -f docker-compose.yml \
  -f docker-compose.production.example.yml \
  -f docker-compose.ip.yml \
  exec backend python scripts/bootstrap_initial_admin.py --email "$admin_email"
unset admin_email
```

The command refuses a missing/inactive user and refuses to create a second
initial administrator. Later role changes use the authenticated admin API.

Record failures before deleting any source or migration artifact. This test VM
is not approved for public launch until backup restore, alert delivery, SMTP,
permissions, and browser/device evidence are reviewed.

After all checks and an independent backup/restore rehearsal pass, the operator
may archive the private raw transfer set according to the approved retention
policy. Resolve and print the path first; do not use a wildcard or recursively
delete `/srv`:

```bash
source_root="$(realpath -e -- /srv/aisw-import/incoming)"
printf 'Approved cleanup target: %s\n' "$source_root"
test "$source_root" = /srv/aisw-import/incoming
```

This runbook deliberately does not include an automatic deletion command. Raw
source cleanup needs explicit operator approval because the files contain the
only original attachment set and personal-data-bearing migration inputs.
