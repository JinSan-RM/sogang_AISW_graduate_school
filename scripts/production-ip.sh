#!/usr/bin/env bash
set -Eeuo pipefail

action="${1:-Config}"
env_file="${2:-.env.production}"
worker_env_file="${3:-.env.production.worker}"
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
repo_root="$(cd -- "$script_dir/.." && pwd -P)"
compose_base_file="$repo_root/docker-compose.yml"
compose_production_file="$repo_root/docker-compose.production.example.yml"
compose_ip_file="$repo_root/docker-compose.ip.yml"
bootstrap_started=false

fail() {
  printf 'ERROR: %s\n' "$1" >&2
  exit 1
}

resolve_required_file() {
  local value="$1"
  local label="$2"
  local candidate
  if [[ "$value" = /* ]]; then
    candidate="$value"
  else
    candidate="$repo_root/$value"
  fi
  [[ -f "$candidate" ]] || fail "$label file does not exist: $candidate"
  printf '%s/%s\n' "$(cd -- "$(dirname -- "$candidate")" && pwd -P)" "$(basename -- "$candidate")"
}

dotenv_value() {
  local key="$1"
  local source_file="${2:-$resolved_env_file}"
  awk -v wanted="$key" '
    {
      sub(/\r$/, "")
      line = $0
      sub(/^[[:space:]]*/, "", line)
      if (line == "" || line ~ /^#/) next
      sub(/^export[[:space:]]+/, "", line)
      separator = index(line, "=")
      if (separator < 2) next
      name = substr(line, 1, separator - 1)
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", name)
      if (name != wanted) next
      value = substr(line, separator + 1)
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", value)
      if (length(value) >= 2) {
        first = substr(value, 1, 1)
        last = substr(value, length(value), 1)
        if ((first == "\"" && last == "\"") || (first == "\047" && last == "\047")) {
          value = substr(value, 2, length(value) - 2)
        }
      }
      result = value
      found = 1
    }
    END { if (found) printf "%s", result }
  ' "$source_file"
}

dotenv_has_key() {
  local key="$1"
  local source_file="${2:-$resolved_env_file}"
  awk -v wanted="$key" '
    {
      sub(/\r$/, "")
      line = $0
      sub(/^[[:space:]]*/, "", line)
      if (line == "" || line ~ /^#/) next
      sub(/^export[[:space:]]+/, "", line)
      separator = index(line, "=")
      if (separator < 2) next
      name = substr(line, 1, separator - 1)
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", name)
      if (name == wanted) found = 1
    }
    END { exit(found ? 0 : 1) }
  ' "$source_file"
}

effective_value() {
  local key="$1"
  local default_value="${2:-}"
  if [[ -v "$key" ]]; then
    printf '%s' "${!key}"
  elif dotenv_has_key "$key"; then
    dotenv_value "$key"
  else
    printf '%s' "$default_value"
  fi
}

require_value() {
  local key="$1"
  local value
  value="$(effective_value "$key")"
  [[ -n "$value" ]] || fail "$key is required in the production environment."
  [[ "$value" != *$'\n'* && "$value" != *$'\r'* ]] || fail "$key must be a single-line value."
  printf '%s' "$value"
}

is_global_ipv4() {
  local value="$1"
  local a b c d
  [[ "$value" =~ ^([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})$ ]] || return 1
  a="${BASH_REMATCH[1]}"; b="${BASH_REMATCH[2]}"; c="${BASH_REMATCH[3]}"; d="${BASH_REMATCH[4]}"
  (( a <= 255 && b <= 255 && c <= 255 && d <= 255 )) || return 1
  (( a != 0 && a != 10 && a != 127 && a < 224 )) || return 1
  (( !(a == 100 && b >= 64 && b <= 127) )) || return 1
  (( !(a == 169 && b == 254) )) || return 1
  (( !(a == 172 && b >= 16 && b <= 31) )) || return 1
  (( !(a == 192 && b == 168) )) || return 1
  (( !(a == 192 && b == 0 && (c == 0 || c == 2)) )) || return 1
  (( !(a == 198 && (b == 18 || b == 19 || b == 51)) )) || return 1
  (( !(a == 203 && b == 0 && c == 113) )) || return 1
  (( !(a == 255 && b == 255 && c == 255 && d == 255) )) || return 1
}

compose() {
  docker compose "${compose_args[@]}" "$@"
}

cleanup() {
  if [[ "$bootstrap_started" == true ]]; then
    compose --profile certificate stop nginx-bootstrap >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

command -v docker >/dev/null 2>&1 || fail "Docker CLI is not installed or unavailable on PATH."
resolved_env_file="$(resolve_required_file "$env_file" "Production environment")"
resolved_worker_env_file="$(resolve_required_file "$worker_env_file" "Production worker environment")"

for shared_key in \
  APP_ENVIRONMENT \
  SEED_DEMO_DATA \
  DATABASE_URL \
  ACCOUNT_DELETION_RECEIPT_RETENTION_DAYS \
  EXPO_PUSH_ENABLED \
  OPERATIONS_ALERT_WEBHOOK_URL \
  OPERATIONS_ALERT_TIMEOUT_SECONDS; do
  production_shared_value="$(dotenv_value "$shared_key" "$resolved_env_file")"
  worker_shared_value="$(dotenv_value "$shared_key" "$resolved_worker_env_file")"
  [[ -n "$production_shared_value" ]] || fail "$shared_key is missing from the production environment."
  [[ -n "$worker_shared_value" ]] || fail "$shared_key is missing from the production worker environment."
  [[ "$production_shared_value" == "$worker_shared_value" ]] || \
    fail "Production and worker $shared_key values must match."
done

public_ip="$(require_value PUBLIC_IP)"
is_global_ipv4 "$public_ip" || fail "PUBLIC_IP must be an explicit globally routable IPv4 address."
tls_contact_email="$(require_value TLS_CONTACT_EMAIL)"
[[ "$tls_contact_email" =~ ^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$ ]] || \
  fail "TLS_CONTACT_EMAIL must be a valid monitored email address."
[[ "${tls_contact_email,,}" != *"replace-with"* && "${tls_contact_email,,}" != *.invalid ]] || \
  fail "TLS_CONTACT_EMAIL must not contain a placeholder value."

cloudflare_enabled="$(effective_value CLOUDFLARE_ENABLED false)"
[[ "${cloudflare_enabled,,}" == false ]] || fail "CLOUDFLARE_ENABLED must be false for public-IP ingress."
[[ "${RATE_LIMIT_TRUST_PROXY:-$(effective_value RATE_LIMIT_TRUST_PROXY)}" == true ]] || \
  fail "RATE_LIMIT_TRUST_PROXY must be true for public-IP ingress."
proxy_ip="$(require_value IP_INGRESS_PROXY_IP)"
trusted_proxy_ips="$(require_value RATE_LIMIT_TRUSTED_PROXY_IPS)"
[[ "$trusted_proxy_ips" == "$proxy_ip/32" ]] || \
  fail "RATE_LIMIT_TRUSTED_PROXY_IPS must be exactly IP_INGRESS_PROXY_IP/32."
[[ "$(require_value ALLOWED_HOSTS)" == "$public_ip" ]] || fail "ALLOWED_HOSTS must be exactly PUBLIC_IP."
[[ "$(require_value PUBLIC_API_URL)" == "https://$public_ip/api" ]] || \
  fail "PUBLIC_API_URL must be https://PUBLIC_IP/api."
[[ "$(require_value SUPPORT_URL)" == "https://$public_ip/legal/support" ]] || \
  fail "SUPPORT_URL must be https://PUBLIC_IP/legal/support."
[[ "$(require_value PRIVACY_POLICY_URL)" == "https://$public_ip/legal/privacy" ]] || \
  fail "PRIVACY_POLICY_URL must be https://PUBLIC_IP/legal/privacy."
[[ "$(require_value ACCOUNT_DELETION_URL)" == "https://$public_ip/legal/account-deletion" ]] || \
  fail "ACCOUNT_DELETION_URL must be https://PUBLIC_IP/legal/account-deletion."
escaped_ip="${public_ip//./\\.}"
[[ "$(require_value CORS_ORIGIN_REGEX)" == "^https://$escaped_ip$" ]] || \
  fail "CORS_ORIGIN_REGEX must match only https://PUBLIC_IP."

export PRODUCTION_ENV_FILE="$resolved_env_file"
export PRODUCTION_WORKER_ENV_FILE="$resolved_worker_env_file"
export CLOUDFLARE_ENABLED=false
export PUBLIC_IP="$public_ip"
export IP_INGRESS_PROXY_IP="$proxy_ip"
export RATE_LIMIT_TRUST_PROXY=true
export RATE_LIMIT_TRUSTED_PROXY_IPS="$trusted_proxy_ips"

compose_args=(
  --env-file "$resolved_env_file"
  -f "$compose_base_file"
  -f "$compose_production_file"
  -f "$compose_ip_file"
)

validate_config() {
  compose config --quiet
}

validate_runtime() {
  compose build backend
  compose run --rm --no-deps backend python -c \
    'from app.config import settings; settings.validate_runtime()'
}

challenge_file() {
  compose --profile certificate run --rm --no-deps --entrypoint /bin/sh certbot \
    -ceu 'mkdir -p /var/www/certbot/.well-known/acme-challenge; printf ready > /var/www/certbot/.well-known/acme-challenge/aisw-preflight'
}

ensure_challenge_server() {
  local running
  running="$(compose ps --status running --quiet nginx)"
  challenge_file >/dev/null
  if [[ -z "$running" ]]; then
    compose --profile certificate up -d nginx-bootstrap
    bootstrap_started=true
  fi
  for _ in $(seq 1 30); do
    if [[ "$(curl --fail --silent --show-error --max-time 3 "http://$public_ip/.well-known/acme-challenge/aisw-preflight" 2>/dev/null || true)" == ready ]]; then
      return 0
    fi
    sleep 1
  done
  fail "HTTP-01 preflight did not reach the public IP on port 80."
}

issue_certificate() {
  local service="$1"
  local cert_name="$2"
  shift 2
  ensure_challenge_server
  compose --profile certificate run --rm --no-deps "$service" certonly \
    --non-interactive \
    --agree-tos \
    --no-eff-email \
    --email "$tls_contact_email" \
    --preferred-profile shortlived \
    --webroot \
    --webroot-path /var/www/certbot \
    --ip-address "$public_ip" \
    --cert-name "$cert_name" \
    "$@"
}

require_live_certificate() {
  compose --profile certificate run --rm --no-deps --entrypoint /bin/sh certbot \
    -ceu 'test -s "/etc/letsencrypt/live/$PUBLIC_IP/fullchain.pem" && test -s "/etc/letsencrypt/live/$PUBLIC_IP/privkey.pem"' || \
    fail "A live certificate for PUBLIC_IP is required. Run Issue first."
}

smoke() {
  local temporary certificate_text
  command -v curl >/dev/null 2>&1 || fail "curl is required for the external smoke test."
  command -v openssl >/dev/null 2>&1 || fail "openssl is required for certificate verification."
  temporary="$(mktemp)"
  certificate_text="${temporary}.txt"
  trap 'rm -f -- "$temporary" "$certificate_text"; cleanup' RETURN

  printf '' | openssl s_client -connect "$public_ip:443" -servername "$public_ip" -showcerts 2>/dev/null > "$temporary"
  openssl x509 -in "$temporary" -noout -checkend 86400 >/dev/null || \
    fail "The public certificate expires in less than 24 hours or could not be parsed."
  openssl x509 -in "$temporary" -noout -text > "$certificate_text"
  grep -Fq "IP Address:$public_ip" "$certificate_text" || fail "The public certificate SAN does not contain PUBLIC_IP."

  local path
  for path in /health /health/ready /healthz /legal/privacy; do
    curl --fail --proto '=https' --tlsv1.2 --silent --show-error --max-time 15 \
      "https://$public_ip$path" >/dev/null
  done
  rm -f -- "$temporary" "$certificate_text"
  trap - RETURN
  printf 'Public HTTPS, certificate SAN, API readiness, and web deep-link smoke checks passed.\n'
}

case "$action" in
  Config)
    validate_config
    validate_runtime
    printf 'Public-IP Compose and production runtime configuration are valid for %s.\n' "$public_ip"
    ;;
  IssueStaging)
    validate_config
    issue_certificate certbot-staging "staging-$public_ip" --staging
    printf 'Staging IP certificate issuance passed; the browser must not use this test certificate.\n'
    ;;
  Issue)
    validate_config
    issue_certificate certbot "$public_ip"
    printf 'Live short-lived IP certificate issued for %s.\n' "$public_ip"
    ;;
  Up)
    validate_config
    require_live_certificate
    compose --profile certificate stop nginx-bootstrap >/dev/null 2>&1 || true
    bootstrap_started=false
    docker compose --env-file "$resolved_env_file" -f "$compose_base_file" -f "$compose_production_file" \
      --profile cloudflare stop cloudflared >/dev/null 2>&1 || true
    compose up -d --build --force-recreate --wait --wait-timeout 300
    running_connector="$(docker compose --env-file "$resolved_env_file" -f "$compose_base_file" \
      -f "$compose_production_file" --profile cloudflare ps --status running --quiet cloudflared)"
    [[ -z "$running_connector" ]] || fail "CLOUDFLARE_ENABLED=false but cloudflared is running."
    smoke
    ;;
  Renew)
    validate_config
    require_live_certificate
    compose --profile certificate run --rm --no-deps certbot renew --quiet \
      --preferred-profile shortlived --webroot --webroot-path /var/www/certbot
    compose exec nginx nginx -t
    compose exec nginx nginx -s reload
    smoke
    ;;
  Ps)
    compose --profile certificate ps -a
    ;;
  Logs)
    compose --profile certificate logs --tail 150 backend frontend-web nginx certificate-renewer certbot nginx-bootstrap
    ;;
  Smoke)
    smoke
    ;;
  *)
    fail "Action must be one of: Config, IssueStaging, Issue, Up, Renew, Ps, Logs, Smoke."
    ;;
esac
