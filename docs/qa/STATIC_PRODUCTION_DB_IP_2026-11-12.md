# Production database fixed address — 2026-11-12

WP1/WP9. The user explicitly requested `172.18.0.2` with the existing database
port, using a DBeaver/DataGrip SSH tunnel. This operation changes production
network configuration only; application revision, schema and credentials remain.

## Applied configuration

- Existing VM: `sogang-aisw-app`, `asia-northeast3-b`, SSH `34.50.35.119:22`.
- Database: **`172.18.0.2:5432`** on `aisw-production_default`.
- Bridge subnet/gateway: `172.18.0.0/16`, `172.18.0.1`.
- Automatic allocation pool: `172.18.128.0/17`, excluding the DB's fixed address.
- Backend and notification worker continue using `db:5432`.
- No host database port was published; existing SSH/database credentials apply.
- Durable configuration is in `docker-compose.production.example.yml`; all
  existing production wrappers include it. Four overridable defaults are
  documented in `.env.production.example`.

Before the change, DB was `.4` and the notification worker occupied `.2`.
The checked migration stopped default-network peers, backed up the DB, replaced
only the default bridge, recreated DB and reconnected peers with their original
service aliases. Original backend, worker, frontend, Nginx and certificate-renewer
containers were retained. Nginx was reloaded after reconnection.

## Verification

- Targeted tests: **19 passed** (`--noconftest` pure configuration tests; no
  application fixtures or production database access from pytest).
- Initial missing-configuration check: 3 expected failures, 1 pass; adding the
  static IP and disjoint dynamic pool made the checks pass.
- Isolated Docker rehearsal passed: stop, disconnect, replace network,
  reconnect stopped containers, resume, and retain static IP after restart.
- Independent review identified two recovery-path issues; both were corrected
  and re-reviewed before execution. No remaining blocker was reported.
- Production merged Compose comparison found only the intended DB/default
  network changes. Actual DB volume name and mount target were checked before
  downtime.
- DB backup: 2,272,619 bytes, SHA-256 recorded privately; `pg_restore --file=/dev/null`
  successfully decoded the complete custom archive without modifying a DB.
- **Two distinct actual DB container recreations** retained `172.18.0.2` using
  the persisted Compose network settings. Exact original image/environment were
  supplied through a private runtime override; it contains no network override.
- All **40 public-table row counts** matched while application writers remained
  stopped. No migration, data restore or content edit was performed.
- Every running service retained its exact image ID, environment values, volume
  and bind mounts, and published ports. Both private env files retain their
  pre-operation SHA-256 values.
- Host TCP to `172.18.0.2:5432` and SQL `SELECT 1` passed. Backend resolves `db`
  to `172.18.0.2` and opens TCP to port `5432`.
- Both `https://www.aisw-campus.com` and `https://34.50.35.119` returned 200 for
  `/health/ready` and `/healthz`. All healthchecked containers are healthy;
  worker and certificate renewer are running.
- Writer stop through final verification: **43.08 seconds**. No VM reboot was
  performed; restart behavior was rehearsed and recreation tested directly.

Private root-only server backup/evidence:
`/srv/aisw-backups/static-db-20261112T003716Z`.
It contains the original Compose/env/runtime snapshots, database archive/hash,
table counts, replacement container IDs, apply log and final result. It must not
be committed or copied into public artifacts.

Server source remains application revision `68ae289` on
`codex/heic-jpeg-display`, with the intended production Compose modification.
Local configuration/docs/tests are on `codex/static-production-db-ip`; no
GitHub push or application build was part of this operation. The pre-existing
operator env backup and unrelated local untracked files were preserved.
