# Fixed production database address

> **For agentic workers:** Use the implementation and verification steps below. This is the user's explicitly authorized WP1/WP9 operational configuration change.

**Goal:** Keep the production PostgreSQL container at `172.18.0.2:5432` for the existing SSH-tunnel client.

**Architecture:** Keep the existing default bridge and private database access. Declare its existing `172.18.0.0/16` subnet and gateway `172.18.0.1`, assign DB `.2`, and put automatic allocations in `172.18.128.0/17` so they cannot claim `.2` during restart or recreation. No schema or application changes.

**Constraints:** Preserve exact running images, private environment values, durable volumes, published ports, database name/credentials, ingress and application revision. The worker currently owns `.2`; the default network therefore needs a coordinated replacement. Never remove volumes. Capture a checked database backup and recoverable original runtime configuration before downtime.

- [x] Add the static default-network settings to `docker-compose.production.example.yml`, keeping other production networks unchanged. Add documented configurable values to `.env.production.example` and a targeted safety check for the static IP/pool separation.
- [x] Validate the merged production Compose configuration against existing runtime, and independently review the network change and recovery procedure.
- [x] Back up the database and original config privately. Stop writers, recreate only the required containers/network using the exact previous images and existing volumes, then check DB `.2`, port `5432`, app DNS/TCP, health and both HTTPS origins. On failure restore the original configuration/network and previous runtime.
- [x] Recreate DB once more with the persisted configuration and verify it remains `.2`. Record actual downtime, preservation checks and evidence in the deployment runbook and `CODEX.md`.

Verification is configuration parsing, a checked PostgreSQL backup, live network/container inspection, restart/recreation persistence, and read-only HTTP/database connectivity checks. Frontend and schema tests are outside this configuration-only change.

Completed: targeted tests 19 passed; isolated Docker stop/reconnect/restart rehearsal and independent review passed. The live DB was recreated twice using the persisted network settings and exact original image/environment. All 40 table counts, runtime mounts, ports and other service container identities were preserved. Both HTTPS origins passed readiness/web checks; maintenance lasted 43.08 seconds. Evidence: `docs/qa/STATIC_PRODUCTION_DB_IP_2026-11-12.md`.
