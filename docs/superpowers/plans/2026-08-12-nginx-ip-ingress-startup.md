# Nginx Public-IP Ingress Startup Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the production Nginx container render its IP-based TLS configuration, listen on ports 80/443, and publish those ports through Docker while preserving the existing trusted internal proxy boundary.

**Architecture:** Let the pinned official Nginx image keep its default command so `/docker-entrypoint.sh` performs template rendering. Start the certificate-reload watcher from an executable `/docker-entrypoint.d` hook, and attach only Nginx to a second ordinary bridge network for host port publication while backend and frontend remain reachable through the fixed-IP internal ingress network.

**Tech Stack:** Docker Compose, official Nginx Alpine image, POSIX shell, PyYAML, pytest.

---

### Task 1: Encode the startup and network contract as failing tests

**Files:**
- Modify: `backend/tests/test_ip_production_deployment.py`
- Test: `backend/tests/test_ip_production_deployment.py`

**Step 1: Add assertions for the public-network boundary**

Extend `test_ip_overlay_exposes_only_nginx_and_uses_exact_proxy_peer` so it proves all of the following from the parsed Compose model:

```python
nginx = services["nginx"]
assert "command" not in nginx
assert "ip_public" in nginx["networks"]
assert overlay["networks"]["ip_ingress"]["internal"] is True
assert overlay["networks"]["ip_public"]["driver"] == "bridge"
assert overlay["networks"]["ip_public"].get("internal") is not True
assert "ip_public" not in services["backend"]["networks"]
assert "ip_public" not in services["frontend-web"]["networks"]
```

Keep the existing fixed `ip_ingress` proxy IP, port-publication, PostgreSQL non-publication, and loopback fallback assertions.

**Step 2: Add assertions for the official-entrypoint hook**

In `test_nginx_contract_preserves_acme_and_proxies_api_over_https`, read `deploy/nginx/40-start-certificate-watch.sh`, parse `docker-compose.ip.yml`, and assert:

```python
starter = _read("deploy/nginx/40-start-certificate-watch.sh")
nginx = _compose("docker-compose.ip.yml")["services"]["nginx"]
assert starter.splitlines() == [
    "#!/bin/sh",
    "set -eu",
    "sh /usr/local/bin/watch-certificates.sh &",
]
assert (
    "./deploy/nginx/40-start-certificate-watch.sh:"
    "/docker-entrypoint.d/40-start-certificate-watch.sh:ro"
) in nginx["volumes"]
assert (
    "./deploy/nginx/watch-certificates.sh:"
    "/usr/local/bin/watch-certificates.sh:ro"
) in nginx["volumes"]
```

Also retain the existing assertions that the watcher hashes certificates and reloads Nginx.

**Step 3: Run the focused test and confirm RED**

Run from `backend/`:

```powershell
.\.venv\Scripts\python.exe -m pytest tests/test_ip_production_deployment.py -q
```

Expected: failure because the live Nginx service still has a `command`, `ip_public` and its entrypoint hook do not exist, and the hook file is missing.

**Step 4: Commit only after the implementation makes these tests green**

Do not commit the RED-only state separately; Task 2 will supply the production files covered by these assertions.

### Task 2: Restore the official Nginx entrypoint startup path

**Files:**
- Create: `deploy/nginx/40-start-certificate-watch.sh`
- Modify: `docker-compose.ip.yml`
- Test: `backend/tests/test_ip_production_deployment.py`

**Step 1: Create the ordered entrypoint hook**

Create `deploy/nginx/40-start-certificate-watch.sh` with exactly:

```sh
#!/bin/sh
set -eu
sh /usr/local/bin/watch-certificates.sh &
```

Mark it executable in Git so the official entrypoint runs it:

```powershell
git add deploy/nginx/40-start-certificate-watch.sh
git update-index --chmod=+x deploy/nginx/40-start-certificate-watch.sh
git ls-files --stage deploy/nginx/40-start-certificate-watch.sh
```

Expected staged mode: `100755`.

**Step 2: Remove the command override and mount the hook**

Delete the live `services.nginx.command` block from `docker-compose.ip.yml`. Add this read-only volume beside the existing watcher mount:

```yaml
- ./deploy/nginx/40-start-certificate-watch.sh:/docker-entrypoint.d/40-start-certificate-watch.sh:ro
```

Do not change `nginx-bootstrap`, the image digest, the certificate volumes, or the HTTPS loopback health check.

**Step 3: Add the public bridge only to live Nginx**

Change the live Nginx network membership to:

```yaml
networks:
  ip_ingress:
    ipv4_address: ${IP_INGRESS_PROXY_IP:-172.30.251.14}
  ip_public:
```

Define the network at the bottom of the overlay:

```yaml
ip_public:
  driver: bridge
```

Do not attach backend, frontend, database, worker, Certbot, or renewer services to `ip_public`.

**Step 4: Validate both shell scripts**

Run from the repository root with Git Bash:

```powershell
& 'C:\Program Files\Git\bin\bash.exe' -n deploy/nginx/40-start-certificate-watch.sh
& 'C:\Program Files\Git\bin\bash.exe' -n deploy/nginx/watch-certificates.sh
```

Expected: both commands exit 0 with no output.

**Step 5: Run the focused deployment tests and confirm GREEN**

Run from `backend/`:

```powershell
.\.venv\Scripts\python.exe -m pytest tests/test_ip_production_deployment.py -q
```

Expected: all IP-production deployment tests pass.

### Task 3: Verify the repository deployment contract

**Files:**
- Verify: `docker-compose.ip.yml`
- Verify: `deploy/nginx/40-start-certificate-watch.sh`
- Verify: `backend/tests/test_ip_production_deployment.py`

**Step 1: Run the complete backend suite**

Run from `backend/`:

```powershell
.\.venv\Scripts\python.exe -m pytest -q
```

Expected: the full suite passes with no regression.

**Step 2: Inspect the patch and executable mode**

Run from the repository root:

```powershell
git diff --check
git diff --stat
git diff -- docker-compose.ip.yml deploy/nginx/40-start-certificate-watch.sh backend/tests/test_ip_production_deployment.py
git ls-files --stage deploy/nginx/40-start-certificate-watch.sh
```

Expected: no whitespace errors, only the intended three implementation files changed, and the hook mode is `100755`.

**Step 3: Commit the tested implementation**

```powershell
git add docker-compose.ip.yml backend/tests/test_ip_production_deployment.py deploy/nginx/40-start-certificate-watch.sh
git commit -m "fix: restore nginx public IP startup"
```

**Step 4: Push the deployment branch**

```powershell
git push origin codex/gcp-ip-production
```

Expected: `origin/codex/gcp-ip-production` advances to the tested implementation commit.

### Task 4: Recreate only Nginx on the GCP VM

**Files:**
- Deploy: `/opt/aisw-app/docker-compose.ip.yml`
- Deploy: `/opt/aisw-app/deploy/nginx/40-start-certificate-watch.sh`
- Preserve: PostgreSQL and all named media/certificate volumes

**Step 1: Fast-forward the clean VM checkout**

Run on the VM:

```bash
cd /opt/aisw-app
git status --short --branch
git pull --ff-only origin codex/gcp-ip-production
git log -1 --oneline
```

Expected: clean branch at the pushed implementation commit. Stop if the checkout has unrelated changes.

**Step 2: Validate the exact merged Compose model**

```bash
compose=(
  docker compose
  --env-file .env.production
  -f docker-compose.yml
  -f docker-compose.production.example.yml
  -f docker-compose.ip.yml
)
"${compose[@]}" config --quiet
```

Expected: exit 0. This validates interpolation against the VM's real production environment without printing secrets.

**Step 3: Capture the pre-recreation safety state**

```bash
"${compose[@]}" ps
"${compose[@]}" exec -T db psql \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  --tuples-only --no-align \
  --command 'SELECT count(*) FROM posts;'
```

If the shell does not already export the database variables, load only the non-printing values before the query:

```bash
set -a
. ./.env.production
set +a
```

Expected post count: `685`; database, backend, frontend, and worker remain healthy.

**Step 4: Recreate only live Nginx**

```bash
"${compose[@]}" up --detach --no-deps --force-recreate nginx
```

This command does not recreate the database, backend, frontend, worker, or named volumes.

**Step 5: Wait for the real health gate**

```bash
nginx_container="$("${compose[@]}" ps --quiet nginx)"
for attempt in $(seq 1 24); do
  health="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$nginx_container")"
  printf 'nginx health (%s/24): %s\n' "$attempt" "$health"
  [ "$health" = healthy ] && break
  if [ "$health" = unhealthy ]; then
    docker inspect --format '{{json .State.Health.Log}}' "$nginx_container"
    "${compose[@]}" logs --tail=200 nginx
    exit 1
  fi
  sleep 5
done
test "$(docker inspect --format '{{.State.Health.Status}}' "$nginx_container")" = healthy
```

Expected: healthy within two minutes.

### Task 5: Prove rendered configuration, port publication, and public HTTPS

**Files:**
- Verify runtime container state only
- Preserve all application data and artifacts

**Step 1: Verify official template rendering and Nginx syntax**

```bash
docker exec "$nginx_container" test -s /etc/nginx/conf.d/default.conf
docker exec "$nginx_container" nginx -t
```

Expected: generated configuration exists and syntax validation succeeds.

**Step 2: Verify listeners and Docker host mappings**

```bash
docker exec "$nginx_container" sh -ceu '
  grep -Eq "(^|[[:space:]])0050[[:space:]]" /proc/net/tcp /proc/net/tcp6
  grep -Eq "(^|[[:space:]])01BB[[:space:]]" /proc/net/tcp /proc/net/tcp6
'
docker port "$nginx_container" 80/tcp
docker port "$nginx_container" 443/tcp
docker inspect --format 'Ports={{json .NetworkSettings.Ports}}' "$nginx_container"
```

Expected: ports 80 and 443 listen, `docker port` reports host mappings, and runtime port entries are non-null.

**Step 3: Run the repository's public production smoke gate**

```bash
bash scripts/production-ip.sh Smoke
bash scripts/production-ip.sh Ps
```

Expected: the issued IP certificate, certificate SAN/expiry, `/health`, `/health/ready`, frontend `/healthz`, and legal deep links all pass over `https://34.50.35.119`.

**Step 4: Reconfirm imported data after ingress recreation**

```bash
"${compose[@]}" exec -T db psql \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  --tuples-only --no-align \
  --command 'SELECT (SELECT count(*) FROM posts), (SELECT count(*) FROM comments), (SELECT count(*) FROM users), (SELECT count(*) FROM media_assets);'
```

Expected: `685|247|196|637`. This is a read-only proof that Nginx recreation did not affect the restored production database.

**Step 5: Stop on any acceptance failure without resetting data**

If any runtime check fails, collect only:

```bash
"${compose[@]}" ps
"${compose[@]}" logs --tail=200 nginx
docker inspect "$nginx_container" --format '{{json .State.Health}}'
```

Do not run `down -v`, delete named volumes, repeat the legacy import, or replace the production database. Diagnose and correct only the ingress layer.
