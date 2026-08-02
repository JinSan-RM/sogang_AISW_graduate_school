#!/usr/bin/env bash
set -Eeuo pipefail

action="${1:-Up}"
env_file="${2:-.env.production}"
worker_env_file="${3:-.env.production.worker}"
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
repo_root="$(cd -- "$script_dir/.." && pwd -P)"
compose_file="$repo_root/docker-compose.production.example.yml"

fail() {
  printf 'ERROR: %s\n' "$1" >&2
  exit 1
}

resolve_required_file() {
  local path="$1"
  local label="$2"
  local candidate
  if [[ "$path" = /* ]]; then
    candidate="$path"
  else
    candidate="$repo_root/$path"
  fi
  [[ -f "$candidate" ]] || fail "$label file does not exist: $candidate"
  printf '%s/%s\n' "$(cd -- "$(dirname -- "$candidate")" && pwd -P)" "$(basename -- "$candidate")"
}

dotenv_value() {
  local key="$1"
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
  ' "$resolved_env_file"
}

dotenv_has_key() {
  local key="$1"
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
  ' "$resolved_env_file"
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

compose() {
  docker compose "$@"
}

command -v docker >/dev/null 2>&1 || fail "Docker CLI is not installed or is not available on PATH."
resolved_env_file="$(resolve_required_file "$env_file" "Production environment")"
resolved_worker_env_file="$(resolve_required_file "$worker_env_file" "Production worker environment")"

enabled_text="$(effective_value CLOUDFLARE_ENABLED false)"
enabled_text="${enabled_text,,}"
[[ "$enabled_text" == "true" || "$enabled_text" == "false" ]] || \
  fail "CLOUDFLARE_ENABLED must be exactly true or false."

export PRODUCTION_ENV_FILE="$resolved_env_file"
export PRODUCTION_WORKER_ENV_FILE="$resolved_worker_env_file"
export CLOUDFLARE_ENABLED="$enabled_text"

base_args=(--env-file "$resolved_env_file" -f "$compose_file")
desired_args=("${base_args[@]}")

if [[ "$enabled_text" == "true" ]]; then
  desired_args+=(--profile cloudflare)

  if [[ "$action" == "Config" || "$action" == "Up" ]]; then
    token_setting="$(effective_value CLOUDFLARE_TUNNEL_TOKEN_FILE)"
    [[ -n "$token_setting" ]] || fail "CLOUDFLARE_TUNNEL_TOKEN_FILE is required when CLOUDFLARE_ENABLED=true."
    token_file="$(resolve_required_file "$token_setting" "Cloudflare tunnel token")"
    declare -a token_lines=()
    mapfile -t token_lines < "$token_file"
    [[ ${#token_lines[@]} -eq 1 && -n "${token_lines[0]%$'\r'}" ]] || \
      fail "Cloudflare tunnel token file must contain one non-empty token line."
    export CLOUDFLARE_TUNNEL_TOKEN_FILE="$token_file"

    trust_proxy="$(effective_value RATE_LIMIT_TRUST_PROXY)"
    trust_proxy="${trust_proxy,,}"
    [[ "$trust_proxy" == "true" ]] || fail "RATE_LIMIT_TRUST_PROXY must be true when CLOUDFLARE_ENABLED=true."
    tunnel_ip="$(effective_value CLOUDFLARE_TUNNEL_IP 172.30.250.14)"
    trusted_peers="$(effective_value RATE_LIMIT_TRUSTED_PROXY_IPS)"
    [[ "$trusted_peers" == "$tunnel_ip/32" ]] || \
      fail "RATE_LIMIT_TRUSTED_PROXY_IPS must be exactly CLOUDFLARE_TUNNEL_IP/32 when Cloudflare is enabled."
    export CLOUDFLARE_TUNNEL_IP="$tunnel_ip"
    export RATE_LIMIT_TRUST_PROXY=true
    export RATE_LIMIT_TRUSTED_PROXY_IPS="$trusted_peers"
  fi
fi

case "$action" in
  Config)
    compose "${desired_args[@]}" config --quiet
    printf 'Production Compose configuration is valid. Cloudflare enabled: %s\n' "$enabled_text"
    ;;
  Up)
    compose "${desired_args[@]}" config --quiet
    compose "${base_args[@]}" --profile cloudflare stop cloudflared
    compose "${desired_args[@]}" up -d --build --force-recreate --wait --wait-timeout 180 backend
    compose "${desired_args[@]}" up -d --build --wait --wait-timeout 180
    if [[ "$enabled_text" == "true" ]]; then
      compose "${desired_args[@]}" ps cloudflared
    else
      running_connector="$(compose "${base_args[@]}" --profile cloudflare ps --status running --quiet cloudflared)"
      [[ -z "$running_connector" ]] || fail "CLOUDFLARE_ENABLED=false but the Compose cloudflared connector is still running."
      printf 'Production stack is healthy. Compose Cloudflare connector is stopped.\n'
    fi
    ;;
  Ps)
    compose "${base_args[@]}" --profile cloudflare ps -a
    printf 'Configured Cloudflare enabled state: %s\n' "$enabled_text"
    ;;
  Logs)
    compose "${base_args[@]}" --profile cloudflare logs --tail 100 backend notification-worker cloudflared
    ;;
  *)
    fail "Action must be one of: Config, Up, Ps, Logs."
    ;;
esac
