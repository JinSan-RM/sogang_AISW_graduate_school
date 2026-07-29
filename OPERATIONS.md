# Runtime Operations

This runbook applies only to `docker-compose.production.example.yml`. Commands
must be run from the repository root in Windows PowerShell. The verification
evidence at the end is historical evidence, not an operating procedure or proof
that the current host is ready for public traffic.

## Production environment gate

Copy the templates, replace every placeholder, and keep the resulting files
untracked:

```powershell
Copy-Item .env.production.example .env.production
Copy-Item .env.production.worker.example .env.production.worker
```

Set `APP_ENVIRONMENT=production`. Startup rejects unsafe or placeholder
configuration, including weak auth secrets, default database credentials,
missing SMTP, non-public URLs, non-durable media paths, disabled push/rate
limiting, and broad CORS or Host rules.

Required production values:

- `AUTH_SECRET_KEY`: random value of at least 32 characters.
- `ACCOUNT_DELETION_RECEIPT_RETENTION_DAYS`: an interval explicitly approved
  by the privacy owner. Production intentionally has no invented default.
- `ALLOWED_HOSTS`: comma-separated public API hostnames only. Do not include a
  scheme, port, IP literal, or wildcard. The first hostname is also sent as the
  internal readiness check's `Host` header.
- `CORS_ORIGIN_REGEX`: an anchored HTTPS expression matching only approved web
  origins. Native applications do not need a CORS entry.
- `RATE_LIMIT_ENABLED=true`.
- `RATE_LIMIT_TRUST_PROXY=false` until the host-local ingress is verified to
  discard client-supplied `Forwarded` and `X-Forwarded-*` headers and set its
  own canonical client address. Only then may this be changed to `true`.
- `RATE_LIMIT_TRUSTED_PROXY_IPS`: leave empty while proxy trust is `false`.
  When enabling trust, set the narrow comma-separated IP/CIDR addresses
  actually observed as the ingress source by the backend. Never use a wildcard
  or an all-addresses CIDR.
- `SMTP_HOST`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL`, and
  `SMTP_REQUIRED=true`.
- `MEDIA_UPLOAD_DIR` and `MEDIA_PRIVATE_UPLOAD_DIR`: the production Compose
  values `/data/media` and `/data/private-media`.
- `MEDIA_UPLOAD_MAX_BYTES`, `MEDIA_UPLOAD_CHUNK_BYTES`,
  `MEDIA_ACCESS_URL_EXPIRE_SECONDS`, `MEDIA_ALLOWED_EXTENSIONS`, and
  `MEDIA_ALLOWED_MIME_TYPES`: explicit upload limits and allowlists.
- `PUBLIC_API_URL`, `SUPPORT_URL`, `PRIVACY_POLICY_URL`, and
  `ACCOUNT_DELETION_URL`: approved public HTTPS URLs.
- `SUPPORT_EMAIL`, `PUBLIC_OPERATOR_NAME`,
  `PRIVACY_POLICY_EFFECTIVE_DATE`, and `PRIVACY_POLICY_VERSION`: approved
  public legal/support metadata.
- `OPERATIONS_ALERT_WEBHOOK_URL`: an approved provider HTTPS endpoint stored as
  a secret in both production environment files. Never commit or log it.
- `OPERATIONS_ALERT_TIMEOUT_SECONDS`: provider timeout from 1 to 10 seconds.
- `PRODUCTION_MEDIA_VOLUME_NAME` and
  `PRODUCTION_PRIVATE_MEDIA_VOLUME_NAME`: normally keep the documented
  defaults. Change them only for a rehearsed, reversible media recovery.

`PUBLIC_API_URL` is the canonical value in the root production environment.
Compose passes it to the backend and maps it to the web image's
`EXPO_PUBLIC_API_URL` build argument. A native EAS build does not read the root
environment file: configure `EXPO_PUBLIC_API_URL` separately in the selected
EAS environment, using the same HTTPS API URL. This URL is public configuration,
not a secret.

The upload volumes must never be exposed by the reverse proxy or a static-file
mount. Downloads go through the authenticated media API and short-lived signed
URLs. Rotating `AUTH_SECRET_KEY` invalidates outstanding signed URLs.

## Public ingress boundary

Production Compose intentionally publishes no PostgreSQL port and binds the API
and static web ports only to host loopback:

```text
remote device -> HTTPS :443 ingress/tunnel -> 127.0.0.1:8000 API
                                           -> 127.0.0.1:8080 web
PostgreSQL   -> Compose network only; no host or router port
```

Do not change either Compose binding to `0.0.0.0`. Do not port-forward 5432,
8000, 8080, or the local QA ports. Public access is supported only through one
of the following:

- a host-local reverse proxy that terminates valid public TLS and exposes only
  443 (optionally 80 solely for an HTTPS redirect); or
- an authenticated outbound tunnel with fixed HTTPS hostnames.

`frontend/nginx.conf` serves static files only; it is not the public TLS reverse
proxy. The operator must provision the host ingress or tunnel separately. It
must reject unapproved Host values, overwrite forwarding headers, forward only
to the loopback ports, and set an upload-body limit and timeout compatible with
`MEDIA_UPLOAD_MAX_BYTES`. Keep `RATE_LIMIT_TRUST_PROXY=false` if these properties
or the exact `RATE_LIMIT_TRUSTED_PROXY_IPS` source addresses have not been
verified.

Keep Windows Firewall enabled for every active network profile. A host reverse
proxy needs an inbound rule only for 443 (and optionally 80 for redirect);
8000, 8080, and PostgreSQL need no public inbound rule. An outbound tunnel
normally needs no inbound rule at all.

## Start and inspect production Compose

Use the same argument list for every production operation:

```powershell
$composeArgs = @(
  '--env-file', '.env.production',
  '-f', 'docker-compose.production.example.yml'
)

docker compose @composeArgs config --quiet
if ($LASTEXITCODE -ne 0) { throw 'Production Compose validation failed.' }

docker compose @composeArgs up -d --build
if ($LASTEXITCODE -ne 0) { throw 'Production Compose startup failed.' }

docker compose @composeArgs ps
docker compose @composeArgs logs --tail=100 backend notification-worker
```

Before opening public HTTPS traffic, verify that the external API hostname is
the first `ALLOWED_HOSTS` entry, `/health/ready` succeeds through HTTPS, the
certificate chain is valid on the remote device, and no database or loopback
service port is reachable directly from the internet.

## Operational alerts

The provider-neutral webhook adapter emits structured events for:

- unhandled backend exceptions;
- notification scheduler failures;
- Expo push transport failures and rejected tickets;
- Expo receipt synchronization failures and failed receipts.

Payload context is filtered through an explicit allowlist of operational
counts, route templates, HTTP methods, and error type names. Do not add email
addresses, push tokens, request bodies, raw exception messages, or webhook
values. Delivery failures must not replace normalized API responses or stop the
scheduler retry loop. Route the provider to a monitored destination and test
failure and recovery before launch.

## Production seed and initial administrator

Production startup calls non-authoritative `seed_reference_data`. It creates
missing reference boards, FAQs, and the home banner only; it creates no user,
never overwrites operator-edited reference content, and never deactivates custom
boards. Deterministic demo credentials remain non-production only.

For a new production deployment:

1. Complete migrations and start with the approved production environment.
2. Register and activate the member who will become the first administrator.
3. Promote that existing member inside the production backend container:

```powershell
docker compose @composeArgs exec backend `
  python scripts/bootstrap_initial_admin.py --email '<existing-active-member>'
```

The command refuses non-production environments, missing or inactive members,
and every run after an active administrator exists. Later role changes must use
the authenticated admin API.

## Daily notification operations

Compose runs `notification-worker` once per day at 09:00 Asia/Seoul. The worker
environment must carry the same approved
`ACCOUNT_DELETION_RECEIPT_RETENTION_DAYS` and alert endpoint as the backend.

```powershell
docker compose @composeArgs ps notification-worker
docker compose @composeArgs logs --tail=100 notification-worker
```

## Backup prerequisites and consistency

Create PostgreSQL custom-format and both media-volume backups with the same
timestamp. Store them outside the repository on encrypted, operator-only
storage. Set the destination explicitly:

```powershell
$backupDirectory = $env:AISW_BACKUP_DIRECTORY
if ([string]::IsNullOrWhiteSpace($backupDirectory)) {
  throw 'Set AISW_BACKUP_DIRECTORY to an encrypted operator-only directory.'
}
New-Item -ItemType Directory -Force -Path $backupDirectory | Out-Null
$backupDirectory = (Resolve-Path -LiteralPath $backupDirectory).Path
$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
```

`pg_dump` is transaction-consistent while the service is live, but it cannot
make database rows and media files one atomic snapshot. For a coordinated
disaster-recovery set, place the app in maintenance or stop `backend` and
`notification-worker`, create all three artifacts, and then restart them.
Record the commit, timestamp, operator, hashes, encryption destination, and
approved retention/deletion date.

## PostgreSQL backup without binary PowerShell redirection

PowerShell 5.1 can corrupt binary data sent through `>` or a PowerShell
pipeline. The following creates the custom-format dump inside the database
container and copies it byte-for-byte with `docker compose cp`:

```powershell
$remoteDump = "/tmp/aisw_$stamp.dump"
$localDump = Join-Path $backupDirectory "aisw_$stamp.dump"

try {
  docker compose @composeArgs exec -T `
    -e "BACKUP_PATH=$remoteDump" `
    db sh -ceu 'umask 077; pg_dump --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --format=custom --file "$BACKUP_PATH"'
  if ($LASTEXITCODE -ne 0) { throw 'pg_dump failed.' }

  docker compose @composeArgs cp "db:$remoteDump" $localDump
  if ($LASTEXITCODE -ne 0) { throw 'Copying the database dump failed.' }
}
finally {
  docker compose @composeArgs exec -T `
    -e "BACKUP_PATH=$remoteDump" `
    db sh -ceu 'rm -f -- "$BACKUP_PATH"'
}

if ((Get-Item -LiteralPath $localDump).Length -le 0) {
  throw 'The database dump is empty.'
}
Get-FileHash -Algorithm SHA256 -LiteralPath $localDump
```

Never use `Get-Content`, `Set-Content`, a PowerShell pipeline, or `>` to move a
`.dump` file.

## Named-volume media backup

Resolve the actual volume names and pinned helper image from the rendered
production Compose configuration. The helper runs without a network, mounts
each source read-only, and writes directly to the encrypted host directory:

```powershell
$composeConfigJson = docker compose @composeArgs config --format json
if ($LASTEXITCODE -ne 0) { throw 'Could not render production Compose.' }
$composeConfig = $composeConfigJson | ConvertFrom-Json

$archiveImage = $composeConfig.services.db.image
$mediaVolume = $composeConfig.volumes.production_media.name
$privateMediaVolume = $composeConfig.volumes.production_private_media.name
$mediaArchive = "media_$stamp.tar"
$privateMediaArchive = "private_media_$stamp.tar"

function Backup-ProductionVolume {
  param(
    [Parameter(Mandatory = $true)][string]$VolumeName,
    [Parameter(Mandatory = $true)][string]$ArchiveName
  )

  docker volume inspect $VolumeName *> $null
  if ($LASTEXITCODE -ne 0) { throw "Volume not found: $VolumeName" }

  docker run --rm --network none --read-only `
    --mount "type=volume,source=$VolumeName,target=/source,readonly" `
    --mount "type=bind,source=$backupDirectory,target=/backup" `
    --env "ARCHIVE_NAME=$ArchiveName" `
    $archiveImage sh -ceu 'umask 077; tar -C /source -cf "/backup/$ARCHIVE_NAME" .'
  if ($LASTEXITCODE -ne 0) { throw "Backup failed: $VolumeName" }
}

Backup-ProductionVolume -VolumeName $mediaVolume -ArchiveName $mediaArchive
Backup-ProductionVolume -VolumeName $privateMediaVolume -ArchiveName $privateMediaArchive

Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $backupDirectory $mediaArchive)
Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path $backupDirectory $privateMediaArchive)
```

Both archives contain protected user data even when encrypted storage is used.
Apply the approved access, retention, and deletion policy.

## PostgreSQL restore rehearsal and reversible recovery

Always restore into a new database first. Copying through
`docker compose cp` remains binary-safe on Windows PowerShell 5.1:

```powershell
$dumpToRestore = (Resolve-Path -LiteralPath $localDump).Path
$restoreDb = "aisw_restore_$stamp"
$remoteRestoreDump = "/tmp/$restoreDb.dump"

try {
  docker compose @composeArgs cp $dumpToRestore "db:$remoteRestoreDump"
  if ($LASTEXITCODE -ne 0) { throw 'Copying the restore dump failed.' }

  docker compose @composeArgs exec -T `
    -e "RESTORE_DB=$restoreDb" `
    -e "RESTORE_PATH=$remoteRestoreDump" `
    db sh -ceu 'createdb --username "$POSTGRES_USER" "$RESTORE_DB"; pg_restore --exit-on-error --no-owner --no-privileges --username "$POSTGRES_USER" --dbname "$RESTORE_DB" "$RESTORE_PATH"'
  if ($LASTEXITCODE -ne 0) { throw 'Restoring the rehearsal database failed.' }
}
finally {
  docker compose @composeArgs exec -T `
    -e "RESTORE_PATH=$remoteRestoreDump" `
    db sh -ceu 'rm -f -- "$RESTORE_PATH"'
}

docker compose @composeArgs exec -T `
  -e "RESTORE_DB=$restoreDb" `
  db sh -ceu 'psql --username "$POSTGRES_USER" --dbname "$RESTORE_DB" --tuples-only --no-align --command "SELECT version_num FROM alembic_version;"'
if ($LASTEXITCODE -ne 0) { throw 'Restore verification failed.' }
```

Run application-level checks and record table counts and schema fingerprints.
For a monthly rehearsal, drop only the newly created rehearsal database after
evidence is recorded:

```powershell
docker compose @composeArgs exec -T `
  -e "RESTORE_DB=$restoreDb" `
  db sh -ceu 'dropdb --username "$POSTGRES_USER" "$RESTORE_DB"'
```

For an actual recovery, keep the original database intact. Stop public traffic,
point `POSTGRES_DB` and the backend `DATABASE_URL` in `.env.production`, plus
the worker `DATABASE_URL` in `.env.production.worker`, at the verified restored
database. Recreate `db`, `backend`, and `notification-worker`, verify readiness,
then reopen traffic. Roll back by restoring the previous untracked environment
values. Do not drop either database until the recovery owner approves it.

## Named-volume media restore and reversible cutover

Verify the recorded archive hashes first. Restore into new, empty volumes; never
extract directly over either live volume:

```powershell
$restoreMediaVolume = "aisw-production_restore_media_$stamp"
$restorePrivateMediaVolume = "aisw-production_restore_private_media_$stamp"

function Restore-ProductionVolume {
  param(
    [Parameter(Mandatory = $true)][string]$ArchiveName,
    [Parameter(Mandatory = $true)][string]$TargetVolume
  )

  docker volume inspect $TargetVolume *> $null
  if ($LASTEXITCODE -eq 0) { throw "Refusing existing restore volume: $TargetVolume" }

  docker volume create $TargetVolume | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Could not create restore volume: $TargetVolume" }

  docker run --rm --network none --read-only `
    --mount "type=bind,source=$backupDirectory,target=/backup,readonly" `
    --mount "type=volume,source=$TargetVolume,target=/restore" `
    --env "ARCHIVE_NAME=$ArchiveName" `
    $archiveImage sh -ceu 'tar -C /restore -xf "/backup/$ARCHIVE_NAME"'
  if ($LASTEXITCODE -ne 0) { throw "Restore failed: $TargetVolume" }

  docker run --rm --network none --read-only `
    --mount "type=bind,source=$backupDirectory,target=/backup,readonly" `
    --mount "type=volume,source=$TargetVolume,target=/restore,readonly" `
    --env "ARCHIVE_NAME=$ArchiveName" `
    $archiveImage sh -ceu 'tar -C /restore -df "/backup/$ARCHIVE_NAME"'
  if ($LASTEXITCODE -ne 0) { throw "Archive comparison failed: $TargetVolume" }
}

Restore-ProductionVolume -ArchiveName $mediaArchive -TargetVolume $restoreMediaVolume
Restore-ProductionVolume -ArchiveName $privateMediaArchive -TargetVolume $restorePrivateMediaVolume
```

After application-level verification, stop `backend` and
`notification-worker`, set `PRODUCTION_MEDIA_VOLUME_NAME` and
`PRODUCTION_PRIVATE_MEDIA_VOLUME_NAME` in the untracked `.env.production` to
the restored volume names, and recreate those two services. The old volumes
remain untouched for rollback. Do not delete old or failed-restore volumes
until the recovery owner approves deletion.

## Account deletion operations

- The authenticated endpoint is `DELETE /api/users/me` with
  `{"current_password":"..."}`.
- The public path uses `POST /api/auth/account-deletion/request` and
  `POST /api/auth/account-deletion/verify`; it requires email verification and
  the current password without revealing whether an account exists.
- A completed operation hard-deletes account PII, authentication/session
  records, private content, and private media. Retained public content has its
  author link removed.
- `account_deletion_receipts` must never gain user ID, email, IP address,
  free-form reason, or deletion counts.
- Administrator self-deletion is rejected until responsibilities are
  transferred and the account is demoted.
- Keep the approved retention decision in deployment records and
  `ACCOUNT_DELETION_RECEIPT_RETENTION_DAYS`.

# Verification Evidence

The following section is retained as historical release evidence and must not
be copied as a live-host operating checklist.

## Recorded local rehearsal — 2026-07-27

This evidence describes an isolated local release-engineering rehearsal, not a live-host or store verification.

- production Compose config and image build: pass;
- PostgreSQL, backend, and notification worker: healthy;
- backend and worker runtime UID: `10001`;
- readiness, guest/authenticated/admin HTTP matrix, and one-shot worker: pass; the worker reported `reminders=0`, `receipts=0`, `removed_rate_limits=0`, and `removed_account_deletion_receipts=0`;
- production non-authoritative seed and one-time initial-admin bootstrap regression: pass; production creates no demo user and preserves operator-managed reference content;
- operational-alert adapter regression: pass; structured non-PII payload and secret-safe failure logging verified;
- production web `/healthz` and Expo Router deep-link fallback: pass;
- PostgreSQL `pg_dump`/restore: 30 tables; all-table row counts and column/index/constraint fingerprints identical;
- media tar/restore: relative-path inventory and SHA-256 checksums identical;
- current migration head: `0021_account_deletion_receipts`;
- disposable local unsigned Android release AAB rehearsal: `:app:bundleRelease` passed from an isolated short-path copy of the same 115 frontend source files; bundletool 1.18.3 validation, API 36, 16 KB page alignment, release-manifest security, and extracted-artifact Gitleaks scan passed; only hash/size and verification results are retained as evidence;
- local AAB boundary: package `com.anonymous.sogangcommunity`, versionCode `1`, versionName `0.1.0`, no signature, and bundled localhost/development-client strings make this a compile/audit rehearsal only;
- signed production AAB/IPA, physical devices, public DNS/TLS, production storage, SMTP, push credentials, and live backup lifecycle: not verified here.

On Windows, a deep checkout path exceeded CMake/Ninja path limits during the native release rehearsal. `ANDROID_CXX_BUILD_STAGING_DIR` can point native intermediates to a short absolute path. The successful full bundle run used an isolated short-path copy whose 115 frontend source files were verified identical; do not treat such a copy as the release source unless its file inventory is rechecked against the pinned release commit.
