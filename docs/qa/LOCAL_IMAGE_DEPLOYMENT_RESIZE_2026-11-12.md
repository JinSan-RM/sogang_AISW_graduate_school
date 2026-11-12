# Local image delivery and 6GiB VM — 2026-11-12

WP1/WP9. The user authorized moving builds to the local host and reducing VM
capacity. After asking whether 6GB was possible, the user delegated the choice;
6GiB shared-core medium was selected to retain headroom over the 4GiB option.
No GitHub push, mobile build, schema change, IAM update or Ops Agent repair is
part of this operation.

## Delivery implementation

Source revision: `8f1ab4a45a383d90803837820999f5163c2a00a4`.

- Local builder and PowerShell launcher export only clean committed Git source,
  build Linux/amd64, verify revision labels/IDs/platform and stream a checksum of
  the image archive. Backend and worker share one image. Full frontend releases
  use a strict nine-field public JSON; production credentials stay on the VM.
- Importer rejects corrupt archives, unsupported services, conflicting tag/ID
  mappings and wrong platform/revision/digest; it atomically writes the ignored
  three-ID profile `deploy/production-images.env` after all checks.
- Production Config/runtime validation preflights local images and never builds.
  Up uses `--no-build --pull never`; Build is rejected. Compose run has no
  `--no-build` flag, so runtime runs inspect the explicit local image first and
  use `--pull never`. Generic, IP/domain and legacy-import paths share the rules.
- Independent review found two importer validation/compatibility issues and one
  VM recovery-state issue. Regression checks and recovery changes addressed them
  before production execution; re-review reported no remaining blocker.

Verification:

- Windows deployment/build/import/network checks: **68 passed**.
- Actual local backend image build/export passed, Linux/amd64 revision verified.
- Full isolated Linux suite: **706 passed, 7 skipped**, 13,202 existing warnings.
  The runner had no network or production credentials/data access and mounted an
  immutable committed source copy read-only.
- Initial test-runner attempt reported 697 passes and nine Git-fixture errors
  because the disposable Python-slim test image lacked Git. Adding Git only to
  the test runner produced the green full run; the production image was unchanged.
- A first Windows tar extraction rejected four Unicode root filenames. Python's
  validated UTF-8 extraction repaired the disposable verification source before
  testing; the production builder's own extraction had already succeeded.
- All 100 backend application Python files match the prior runtime after LF
  normalization. Raw bytes differ because the older server image normalized
  CRLF; no application source, Dockerfile or direct requirement changed from
  `68ae289` to this delivery commit.

Image ID: `sha256:f49cad409d7e342fb8cd24549f2826c179f5e74b025bd1180c6678207de0f0e9`.
Archive: 85,721,088 bytes; SHA-256
`9949d25c55a5c461a0eac102081219faccc2332c8a38d873ca98eeee7cd78904`.

## Live image-only deployment

Completed **10:25:51 KST**, before resizing. Import through final verification
took **55.71 seconds**; that interval includes work while old services remained
available and is not a measured outage duration.

- Authenticated SSH transfer, archive/helper hashes and loaded image metadata
  passed. Thirteen reviewed helper/config/document files were synchronized.
- Production Config ran the imported image. A checked custom PostgreSQL dump
  preceded cutover; full `pg_restore --file=/dev/null` archive decoding passed.
- Backend and notification worker now use the locally built image. The prior
  frontend image is retained, as are the DB/Nginx/cert-renewer image IDs.
- Every service's environment values, mounts and published ports match its
  original snapshot. Both private environment files retain their original hashes.
- Database remains `172.18.0.2:5432`; Alembic version is unchanged. No database
  restore or production content edit was performed.
- Both canonical-domain and installed-client IP origins returned 200 for API
  readiness and web health. Docker build history contains **zero new server
  builds** across the deployment.

Private server evidence and rollback snapshots:
`/srv/aisw-backups/local-images-20261112T011817Z`.
Private imported release:
`/srv/aisw-releases/8f1ab4a45a383d90803837820999f5163c2a00a4`.
These contain runtime/environment snapshots and must not be committed.

## Capacity verification

Completed **10:28:16 KST**. The stop request through final HTTPS verification took
**112.25 seconds**; the public outage was not continuously sampled.

- Existing instance changed from `e2-standard-2` to
  **`e2-custom-medium-6144`**. Its instance ID, persistent disk source/device/
  auto-delete setting, reserved public IP, network tags and service-account
  configuration are unchanged. No VM or disk was deleted/recreated.
- Guest `MemTotal`: **6,217,330,688 bytes** (nominal 6GiB instance, approximately
  5.79GiB usable). Snapshot `free` reported **881,614,848 bytes** in use and
  **5,335,715,840 bytes** available. These are point-in-time observations.
- Existing `/swapfile` remains **2GiB**, with zero swap used at verification.
- DB, backend, frontend and Nginx report healthy; worker and certificate renewer
  are running (these two have no healthcheck). All six retain the expected image
  ID and exact pre-release environment/mount/port configuration.
- PostgreSQL retains `172.18.0.2:5432`. Backend resolves `db` to `.2` and opens
  TCP successfully. Both private environment files retain their original hashes.
- Both `https://www.aisw-campus.com` and `https://34.50.35.119` pass API readiness
  and web health checks after the actual VM restart.
- New-boot kernel logs contain no OOM-kill messages; every container has
  `OOMKilled=false`. This is startup verification, not a sustained load test or
  a guarantee against future OOM. Unknown historical peaks remain unclassified.

The local resize controller retains original VM/address snapshots and its
completed result under ignored `.codex-tmp/local-release/`. Server post-boot
runtime/memory checks are saved as `post-resize.json` in the private backup
directory above. Recovery was reviewed for transitional VM states and transient
API failures; no recovery was needed in the successful deployment/resize.

The pre-existing Ops Agent metrics/logging export permission errors were not
modified. No IAM roles, monitoring provider or background automation was added.
