# Server signup and email verification deployment

This runbook is the production gate for signup, password-reset, and account-
deletion email verification. A passing local test is not sufficient.

## Required architecture

```text
mobile/web app
  -> https://api.<stable-domain>/api
  -> Cloudflare edge
  -> Compose cloudflared connector on the server
  -> private Docker origin network -> backend:8000
  -> FastAPI -> durable PostgreSQL

FastAPI server
  -> SMTP provider on outbound TCP 587 (STARTTLS) or 465 (implicit TLS)
  -> recipient mailbox
```

Cloudflare Tunnel covers inbound HTTPS only. It does not relay SMTP. Every host
that can run the backend must have DNS access, a valid CA trust store, correct
time, and outbound access to the configured SMTP endpoint and port.

## Stable public endpoint

- Use a named tunnel and a domain controlled by the operator. Do not ship an
  app with a Quick Tunnel `*.trycloudflare.com` URL.
- Keep the same public API hostname when moving the backend to another server.
  Installed native apps have the API URL embedded at build time.
- Do not publish PostgreSQL, port 8000, or port 8080 directly to the Internet.
- Set the origin `Host` header to the exact first `ALLOWED_HOSTS` value.
- The documented Docker origin is plain HTTP because TLS terminates at
  Cloudflare. Do not configure `noTLSVerify` as a workaround for a different
  HTTPS origin.

The repository supports a remotely managed Named Tunnel through the optional
Compose `cloudflare` profile. Complete these one-time steps in the Cloudflare
dashboard before setting the flag to `true`:

1. Create a remotely managed Named Tunnel and record its connector token.
2. Create the published API hostname with service URL
   `http://backend:8000`. Set its HTTP Host Header to the exact API hostname.
3. If the web build is public, create its hostname with service URL
   `http://frontend-web:8080`.
4. Store only the raw one-line token in the host path configured by
   `CLOUDFLARE_TUNNEL_TOKEN_FILE`. Prefer a path outside the checkout and limit
   it to the deployment operator. Do not put the token in `.env.production`, a
   Compose command, a commit, or logs.
5. Confirm the chosen `CLOUDFLARE_TUNNEL_SUBNET` does not overlap Docker, LAN,
   or VPN networks on the target host.

`--token-file` is the remotely managed mode: published hostname routes remain
in Cloudflare, not in a local `ingress:` YAML. Do not mix this mode with a local
credentials JSON configuration.

The Compose secret is a read-only host-file mount, not an encrypted secret
store. An external secrets manager remains preferable. The connector image is
digest-pinned, runs unprivileged and read-only, publishes no host port, and has
a health check. It shares an internal origin network with the app and a
separate egress network for outbound Cloudflare connectivity.

Do not run an OS `cloudflared` service and the Compose connector at the same
time. Cloudflare can distribute requests to both as tunnel replicas, but the OS
process cannot resolve `backend` or `frontend-web`, causing intermittent
failures. `CLOUDFLARE_ENABLED=false` stops only the Compose connector; it does
not disable a separate reverse proxy, OS service, router rule, or firewall
exposure. The development desktop must not remain in the production path.

The public app endpoints must receive JSON responses without an interactive
Cloudflare Access login, JavaScript challenge, or HTML CAPTCHA. In particular,
exclude the required public auth endpoints from interactive challenges:

- `/api/auth/register/request-verification`
- `/api/auth/register/verify-email`
- `/api/auth/password-reset/request`
- `/api/auth/password-reset/verify`
- `/api/auth/account-deletion/request`
- `/api/auth/account-deletion/verify`

Keep Cloudflare abuse controls compatible with the API's JSON clients and the
application-level subject/IP rate limits.

## Production identity and persistence

Create `.env.production` from `.env.production.example`. At minimum:

```dotenv
APP_ENVIRONMENT=production
AUTH_SECRET_KEY=<one-stable-random-secret-at-least-32-characters>
DATABASE_URL=postgresql+psycopg://<user>:<encoded-password>@db:5432/<database>
ALLOWED_HOSTS=api.<stable-domain>
PUBLIC_API_URL=https://api.<stable-domain>/api
CORS_ORIGIN_REGEX=^https://www\.<stable-domain>$

CLOUDFLARE_ENABLED=true
CLOUDFLARE_TUNNEL_TOKEN_FILE=<operator-only-token-file-outside-checkout>
CLOUDFLARE_TUNNEL_SUBNET=172.30.250.0/28
CLOUDFLARE_TUNNEL_IP=172.30.250.14
RATE_LIMIT_TRUST_PROXY=true
RATE_LIMIT_TRUSTED_PROXY_IPS=172.30.250.14/32

SMTP_HOST=<provider-host>
SMTP_PORT=587
SMTP_AUTH=password
SMTP_SECURITY=starttls
SMTP_TIMEOUT_SECONDS=10
SMTP_USERNAME=<provider-user>
SMTP_PASSWORD=<provider-secret>
SMTP_FROM_EMAIL=<provider-authorized-sender>
SMTP_REQUIRED=true

EXPO_PUBLIC_AUTH_EMAIL_TIMEOUT_MS=120000
```

Use `SMTP_PORT=465` with `SMTP_SECURITY=ssl` only when the provider specifies
implicit TLS. Plaintext SMTP is rejected in staging and production. The sender
must be authorized by the provider; configure SPF, DKIM, and DMARC for the
sending domain when the provider supports them.

Ordinary providers use `SMTP_AUTH=password` and require non-empty credentials.
Use `SMTP_AUTH=none` only for an operator-approved IP-authenticated relay and
leave both credential fields empty; this choice must be explicit so a missing
password cannot silently become an unauthenticated production connection.

Keep PostgreSQL and `AUTH_SECRET_KEY` durable across container recreation,
server restart, scale-out, backup restore, and server migration. Every backend
replica must use the same database and secret. Do not rotate the secret as part
of an ordinary deployment.

For native preview/production builds, set `EXPO_PUBLIC_API_URL` in the matching
EAS environment to the same `PUBLIC_API_URL`. The root server environment file
is not read by EAS. Missing public configuration or a Quick Tunnel URL fails
the release check. Set `EXPO_PUBLIC_AUTH_EMAIL_TIMEOUT_MS` to the same value in
the server environment and EAS; changing either embedded value requires a new
AAB/IPA. Inspect the release artifact for `localhost`, private-address, and
`trycloudflare.com` strings before distribution.

The production Compose template intentionally supports one backend service and
one notification worker. Do not use `docker compose --scale backend` with its
fixed loopback port. A later multi-replica design requires an external load
balancer, one migration owner, shared durable media, one scheduler leader,
replica-by-replica SMTP/proxy checks, and a concurrent same-email test. Shared
PostgreSQL and an identical `AUTH_SECRET_KEY` remain mandatory.

## Proxy client IP gate

In Compose-managed tunnel mode, `cloudflared` is assigned the fixed
`CLOUDFLARE_TUNNEL_IP` on a dedicated internal origin network. The backend
starts only when proxy trust contains exactly that address as `/32`:

```dotenv
RATE_LIMIT_TRUST_PROXY=true
RATE_LIMIT_TRUSTED_PROXY_IPS=172.30.250.14/32
```

After the first staging start, make requests through the Named Tunnel from two
unrelated external networks. Confirm the backend sees the configured connector
address as its direct peer, honors Cloudflare's `CF-Connecting-IP`, and applies
independent rate limits to the two clients. If the direct peer differs, stop
the connector and fix the Docker network; do not widen the allowlist.

For an external host reverse proxy with `CLOUDFLARE_ENABLED=false`, perform its
peer measurement in staging with proxy trust disabled, then configure only its
exact verified peer before production. Client-supplied forwarding headers must
be overwritten at that ingress.

Never use `0.0.0.0/0`, `::/0`, or an entire private network unless every host
in that network is an operator-controlled ingress. The backend trusts
`CF-Connecting-IP` only when the direct peer is in this allowlist. Production
startup refuses `RATE_LIMIT_TRUST_PROXY=false`, because otherwise every user
behind the tunnel would share one IP rate-limit bucket.

## Deploy and preflight

Run from the target server, not the development desktop:

```powershell
./scripts/production-compose.ps1 -Action Config
./scripts/production-compose.ps1 -Action Up
./scripts/production-compose.ps1 -Action Ps

$composeArgs = @(
  '--env-file', '.env.production',
  '-f', 'docker-compose.yml',
  '-f', 'docker-compose.production.example.yml'
)

docker compose @composeArgs exec backend python scripts/send_test_email.py --check-only
docker compose @composeArgs exec backend python scripts/send_test_email.py controlled-test@sogang.ac.kr
```

Linux servers use `bash scripts/production-compose.sh Config`, `Up`, and `Ps`.
The helper selects the profile from `CLOUDFLARE_ENABLED`, validates the token
file and exact `/32`, recreates the backend before starting the connector, and
waits for service health. With `false`, it stops a connector left by an earlier
`true` deployment.

`--check-only` verifies DNS, TCP, certificate validation, TLS negotiation, and
SMTP authentication without sending a message. The second command proves
provider acceptance and inbox delivery using an approved controlled mailbox.
Run both after moving to a new server because providers and hosting networks
can block or restrict SMTP egress.

The release client waits up to the configured 120-second default for auth-email
requests. If that deadline is reached, it keeps the code-entry path available
with an explicit "delivery uncertain" message and permits a later retry; it
does not claim that a message was delivered. This recovers the case where the
SMTP provider accepted mail just before the HTTP response was lost.

From a network outside the server and outside the operator's LAN:

```powershell
curl.exe --fail --show-error --silent https://api.<stable-domain>/health/ready
curl.exe --fail --show-error --silent -X OPTIONS `
  -H "Origin: https://www.<stable-domain>" `
  -H "Access-Control-Request-Method: POST" `
  https://api.<stable-domain>/api/auth/register/request-verification
```

Confirm a valid public certificate, JSON API responses, approved CORS headers,
and no Cloudflare HTML challenge.

## End-to-end signup and restart test

Use a new controlled `@sogang.ac.kr` address:

1. Request a registration code from the release app over mobile data or an
   unrelated external network.
2. Confirm that the response contains `email_sent: true` but no code, and that
   the inbox receives exactly the code associated with that address.
3. Restart or recreate only the backend container before entering the code.
4. Verify the code, complete registration, sign out, and sign in again.
5. Confirm that a wrong code is rate-limited, the verified registration token
   cannot be reused, and a second account cannot use the same email.
6. Confirm auth responses include `Cache-Control: no-store` and that an SMTP
   outage returns JSON code `EMAIL_DELIVERY_UNAVAILABLE` with HTTP 503.

Repeat the recovery check with a host reboot and a Compose connector restart
before launch. Confirm the dashboard reports exactly the intended connector
and the helper reports it healthy. Use graceful container shutdown for routine
deployments. If a process
is killed between token persistence and SMTP acceptance, the request can have
an ambiguous result; allow the documented cooldown to expire and request a new
code rather than bypassing verification.

The restart between steps 2 and 3 proves that verification state is in durable
PostgreSQL rather than process memory. A successful login after registration
proves password/session compatibility with the deployed secret.

## Server migration

Before cutover, back up and restore PostgreSQL and both media volumes using
`OPERATIONS.md`. Copy secrets through the approved secret manager, preserving
`AUTH_SECRET_KEY`. Move the named tunnel route to the new server while keeping
the public hostname unchanged, then rerun every preflight and signup step above.
Do not retire the old server until external signup, login, SMTP delivery, and
rollback checks pass.

If SMTP preflight fails, keep signup closed and record the exact DNS, TCP, TLS,
authentication, or provider rejection. Do not switch production to plaintext
SMTP or expose verification codes in API responses as a workaround.
