# Nginx Public-IP Ingress Startup Design

Date: 2026-08-12

## Problem

The GCP production stack restores its database and media correctly, issues a
live IP-address certificate, and starts healthy database, backend, frontend,
worker, and certificate-renewer services. The live Nginx service remains
unhealthy.

Runtime evidence shows two independent ingress defects:

1. `docker-compose.ip.yml` replaces the Nginx image command with `/bin/sh -c`
   so it can start the certificate watcher. The official image entrypoint sees
   `/bin/sh` instead of `nginx` and skips its `/docker-entrypoint.d` setup. The
   mounted `default.conf.template` is therefore never rendered into
   `/etc/nginx/conf.d/default.conf`. Nginx has no server blocks or listen
   sockets, and its loopback HTTPS health check receives `Connection refused`.
2. The live Nginx service is attached only to the `internal: true` `ip_ingress`
   network. Docker records the requested 80/443 bindings in
   `HostConfig.PortBindings`, but runtime `NetworkSettings.Ports` contains null
   mappings. The certificate bootstrap service worked because it used the
   ordinary non-internal default network.

The certificate, Nginx process, Nginx base configuration, backend health, and
frontend health are all valid. No database or application change is needed.

## Decision

Restore the official Nginx startup contract and separate public port transport
from trusted origin transport.

### Official entrypoint and certificate watcher

- Remove the live Nginx `command` override. The pinned image's default
  `nginx -g 'daemon off;'` command then reaches `/docker-entrypoint.sh` as an
  Nginx command, allowing the official template processor to render
  `/etc/nginx/templates/default.conf.template`.
- Add an executable repository script named
  `deploy/nginx/40-start-certificate-watch.sh` and mount it read-only at
  `/docker-entrypoint.d/40-start-certificate-watch.sh`.
- The hook starts the existing `watch-certificates.sh` loop in the background
  and exits successfully so the official entrypoint can continue to Nginx.
- Script ordering places this hook after the image's template and worker-tuning
  scripts. The watcher initially records the certificate hash without
  reloading; after renewal it validates the Nginx configuration and reloads the
  running process.

### Network separation

- Keep Nginx on `ip_ingress` with the fixed
  `IP_INGRESS_PROXY_IP=172.30.251.14`. Backend and frontend service discovery
  continues only across this shared internal network, preserving the backend's
  exact trusted-proxy boundary.
- Add a second network, `ip_public`, to Nginx. It is a normal Compose bridge and
  is not marked internal. No backend, frontend, database, worker, or renewer
  service joins it.
- Keep host port mappings `80:80` and `443:443`. The public bridge supplies the
  host-facing attachment that the current internal-only service lacks.
- Leave `nginx-bootstrap` unchanged because it already proved its port-80 ACME
  path on a normal network.

## Security Properties

- PostgreSQL remains unpublished.
- Backend and frontend fallback ports remain bound to host loopback.
- Only Nginx publishes TCP 80 and 443.
- The public Nginx network contains no application or database peer.
- Requests reach backend/frontend through `ip_ingress`, where Nginx retains the
  exact trusted source IP.
- Certificate volumes remain read-only in Nginx; only Certbot services can
  modify them.
- The Nginx container remains read-only, drops all capabilities except its
  existing minimal startup/bind set, and retains `no-new-privileges`.

## Failure Handling

- The existing loopback HTTPS health check stays unchanged. It now proves that
  the rendered server configuration loaded and port 443 is listening.
- `production-ip.sh Up` must still wait for all services and fail if Nginx is
  unhealthy.
- `production-ip.sh Smoke` must verify the public certificate SAN and expiry,
  `/health`, `/health/ready`, `/healthz`, and the privacy deep link over the
  public IP.
- A failed Nginx recreation does not reset, restore, or mutate PostgreSQL or
  media volumes. Existing healthy application services remain available on
  their host-loopback diagnostic ports.

## Test Design

Add deployment regression coverage that fails against the current overlay and
proves the corrected startup contract:

1. The live Nginx service no longer overrides `command` with `/bin/sh`.
2. It mounts the executable certificate watcher hook into
   `/docker-entrypoint.d` while keeping the existing watcher implementation
   mount.
3. It joins both `ip_ingress` and the non-internal `ip_public` network.
4. Backend and frontend join `ip_ingress` but not `ip_public`.
5. Ports 80 and 443 and the existing loopback HTTPS health check remain.
6. The hook passes POSIX shell syntax validation and the merged Compose model
   passes `docker compose config --quiet`.

After local tests pass, the VM fast-forwards to the fix and recreates Nginx with
the exact three-file Compose model. Runtime acceptance requires:

- `/etc/nginx/conf.d/default.conf` exists;
- Nginx listens on 80 and 443;
- the Nginx health status becomes healthy;
- Docker reports live host mappings for 80 and 443;
- direct backend and frontend checks remain healthy;
- the public HTTPS smoke gate passes with the issued IP certificate.

## Rejected Alternatives

- Calling the image's internal `20-envsubst-on-templates.sh` from the current
  shell command ties deployment behavior to a private image path and continues
  bypassing the rest of the official startup contract.
- A custom all-in-one wrapper that performs `envsubst`, starts the watcher, and
  launches Nginx duplicates behavior already maintained by the official image.
- Manually generating `default.conf` or connecting a network on the VM would be
  lost on the next forced recreation and would leave the repository deployment
  definition broken.
