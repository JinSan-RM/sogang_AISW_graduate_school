#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

source_argument="${1:-/srv/aisw-import/incoming}"
expected_source_manifest="${2:-}"
env_file="${3:-.env.production}"
worker_env_file="${4:-.env.production.worker}"
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
repo_root="$(cd -- "$script_dir/.." && pwd -P)"
archive_image="postgres:16@sha256:33f923b05f64ca54ac4401c01126a6b92afe839a0aa0a52bc5aeb5cc958e5f20"

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

require_env_value() {
  local key="$1"
  local value
  value="$(dotenv_value "$key")"
  [[ -n "$value" ]] || fail "$key is required in the production environment."
  [[ "$value" != *$'\n'* && "$value" != *$'\r'* ]] || fail "$key must be a single-line value."
  printf '%s' "$value"
}

compose() {
  docker compose "${compose_args[@]}" "$@"
}

json_integer() {
  local path="$1"
  local key="$2"
  awk -v wanted="\"$key\"" '
    index($0, wanted) {
      value = $0
      sub(/^.*:[[:space:]]*/, "", value)
      sub(/,.*/, "", value)
      gsub(/[[:space:]]/, "", value)
      print value
      exit
    }
  ' "$path"
}

ensure_empty_volume() {
  local volume="$1"
  local entry_count
  [[ "$volume" =~ ^[A-Za-z0-9_.-]+$ ]] || fail "Unsafe Docker volume name: $volume"
  if ! docker volume inspect "$volume" >/dev/null 2>&1; then
    docker volume create "$volume" >/dev/null
  fi
  entry_count="$(docker run --rm --network none --read-only \
    --mount "type=volume,source=$volume,target=/target,readonly" \
    "$archive_image" sh -ceu 'find /target -mindepth 1 -maxdepth 1 -print | wc -l')"
  [[ "$entry_count" == 0 ]] || fail "Refusing to overwrite non-empty Docker volume: $volume"
}

restore_media_directory() {
  local source="$1"
  local volume="$2"
  docker run --rm --network none --read-only \
    --mount "type=bind,source=$source,target=/source,readonly" \
    --mount "type=volume,source=$volume,target=/target" \
    --tmpfs /tmp \
    "$archive_image" sh -ceu '
      tar -C /source -cf - . | tar -C /target -xf -
      chown -R 10001:10001 /target
    '
}

command -v docker >/dev/null 2>&1 || fail "Docker CLI is not installed or unavailable on PATH."
command -v sha256sum >/dev/null 2>&1 || fail "sha256sum is required."
command -v tar >/dev/null 2>&1 || fail "tar is required."
[[ "$expected_source_manifest" =~ ^[0-9a-fA-F]{64}$ ]] || \
  fail "Pass the expected 64-character source manifest SHA-256 as argument 2."

source_root="$(realpath -e -- "$source_argument")"
[[ -d "$source_root" && "$source_root" != / && "$source_root" != /srv ]] || \
  fail "The source must be an explicit private import directory."
source_mode="$(stat -c '%a' "$source_root")"
(( (8#$source_mode & 8#77) == 0 )) || fail "Source directory must not grant group or other permissions: $source_root"

articles="$source_root/board_articles_ver3.xlsx"
comments="$source_root/comments.xlsx"
legacy_reference="$source_root/board_articles(구분).xlsx"
raw_csv="$source_root/정보통신대학원 어플 작성글.csv"
attachment_source="$source_root/extracted/attachments_ver2/attachments"
source_manifest="$source_root/source-sha256.txt"
for required_path in "$articles" "$comments" "$legacy_reference" "$raw_csv" "$source_manifest"; do
  [[ -f "$required_path" ]] || fail "Required migration source is missing: $required_path"
done
[[ -d "$attachment_source" ]] || fail "Required attachment source is missing: $attachment_source"

manifest_entries="$(wc -l < "$source_manifest")"
[[ "$manifest_entries" == 653 ]] || fail "Source manifest must contain exactly 653 entries; found $manifest_entries."
actual_source_manifest="$(sha256sum "$source_manifest" | awk '{print $1}')"
[[ "${actual_source_manifest,,}" == "${expected_source_manifest,,}" ]] || \
  fail "Source manifest SHA-256 does not match the approved value."
(
  cd -- "$source_root"
  sha256sum --check --strict --quiet source-sha256.txt
) || fail "One or more migration source files failed SHA-256 verification."

attachment_count="$(find "$attachment_source" -maxdepth 1 -type f -print | wc -l)"
[[ "$attachment_count" == 648 ]] || fail "Expected 648 attachment source files; found $attachment_count."
[[ -z "$(find "$attachment_source" -mindepth 1 -maxdepth 1 ! -type f -print -quit)" ]] || \
  fail "Attachment source contains a symlink, directory, or special entry."
[[ -z "$(find "$attachment_source" -maxdepth 1 -type f -size 0 -print -quit)" ]] || \
  fail "Attachment source contains an empty file."

resolved_env_file="$(resolve_required_file "$env_file" "Production environment")"
resolved_worker_env_file="$(resolve_required_file "$worker_env_file" "Production worker environment")"
production_database="$(require_env_value POSTGRES_DB)"
database_url="$(require_env_value DATABASE_URL)"
production_media_volume="$(require_env_value PRODUCTION_MEDIA_VOLUME_NAME)"
production_private_media_volume="$(require_env_value PRODUCTION_PRIVATE_MEDIA_VOLUME_NAME)"
[[ "$database_url" == *"/$production_database" ]] || \
  fail "DATABASE_URL must end with /POSTGRES_DB and must not contain query parameters."

export PRODUCTION_ENV_FILE="$resolved_env_file"
export PRODUCTION_WORKER_ENV_FILE="$resolved_worker_env_file"
export CLOUDFLARE_ENABLED=false
compose_args=(
  --env-file "$resolved_env_file"
  -f "$repo_root/docker-compose.yml"
  -f "$repo_root/docker-compose.production.example.yml"
  -f "$repo_root/docker-compose.ip.yml"
)
compose config --quiet
bash "$repo_root/scripts/production-ip.sh" Config "$resolved_env_file" "$resolved_worker_env_file"

running_services="$(compose ps --status running --quiet backend notification-worker nginx certificate-renewer)"
[[ -z "$running_services" ]] || fail "Stop public application services before the one-time legacy import."

timestamp="$(date -u +%Y%m%d%H%M%S)"
review_database="aisw_migration_review_$timestamp"
review_database_url="${database_url%/$production_database}/$review_database"
output_root="$source_root/migration-output-$timestamp"
[[ ! -e "$output_root" ]] || fail "Refusing to overwrite migration output: $output_root"
install -d -m 0700 "$output_root" "$output_root/media" "$output_root/private-media" \
  "$output_root/reports" "$output_root/artifacts"

compose up -d --wait --wait-timeout 120 db
production_table_count="$(compose exec -T db sh -ceu '
  psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --tuples-only --no-align \
    --command "SELECT count(*) FROM pg_catalog.pg_tables WHERE schemaname = current_schema()"
')"
[[ "$production_table_count" == 0 ]] || \
  fail "Refusing to overwrite production database $production_database because it already has public tables."

compose exec -T -e REVIEW_DATABASE="$review_database" db sh -ceu '
  if psql --username "$POSTGRES_USER" --dbname postgres --list --tuples-only \
      | cut -d "|" -f 1 | tr -d " " | grep -Fxq "$REVIEW_DATABASE"; then
    printf "Review database already exists: %s\n" "$REVIEW_DATABASE" >&2
    exit 1
  fi
  createdb --username "$POSTGRES_USER" "$REVIEW_DATABASE"
'

compose run --rm --no-deps -e DATABASE_URL="$review_database_url" backend python -m app.migrate
compose run --rm --no-deps -e DATABASE_URL="$review_database_url" backend python -c '
from app.database import SessionLocal
from app.seed import seed_reference_data
with SessionLocal() as session:
    seed_reference_data(session)
'

compose run --rm --no-deps \
  --user "$(id -u):$(id -g)" \
  -e DATABASE_URL="$review_database_url" \
  --volume "$source_root:/migration/input:ro" \
  --volume "$output_root:/migration/output" \
  backend python scripts/import_legacy_articles.py \
    --database-url "$review_database_url" \
    --articles-xlsx /migration/input/board_articles_ver3.xlsx \
    --comments-xlsx /migration/input/comments.xlsx \
    --legacy-reference-xlsx '/migration/input/board_articles(구분).xlsx' \
    --raw-csv '/migration/input/정보통신대학원 어플 작성글.csv' \
    --attachment-source-dir /migration/input/extracted/attachments_ver2/attachments \
    --public-media-dir /migration/output/media \
    --private-media-dir /migration/output/private-media \
    --report-dir /migration/output/reports \
    --apply > "$output_root/reports/import-output.json"

compose run --rm --no-deps \
  --user "$(id -u):$(id -g)" \
  -e DATABASE_URL="$review_database_url" \
  --volume "$output_root:/migration/output" \
  backend python scripts/verify_legacy_media.py \
    --database-url "$review_database_url" \
    --public-media-dir /migration/output/media \
    --private-media-dir /migration/output/private-media \
    --report /migration/output/reports/media-verification.json \
    > "$output_root/reports/media-verification-output.json"

compose run --rm --no-deps \
  --user "$(id -u):$(id -g)" \
  -e DATABASE_URL="$review_database_url" \
  --volume "$output_root:/migration/output" \
  backend python -c '
import json
from sqlalchemy import func, select
from app.database import SessionLocal
from app.models.audit import LegacyImportRecord
from app.models.comment import Comment
from app.models.post import Post
from app.models.user import User

with SessionLocal() as session:
    counts = {
        "posts": session.scalar(select(func.count()).select_from(Post)),
        "comments": session.scalar(select(func.count()).select_from(Comment)),
        "users": session.scalar(select(func.count()).select_from(User)),
        "ledger_records": session.scalar(
            select(func.count()).select_from(LegacyImportRecord)
        ),
    }
print(json.dumps(counts, indent=2, sort_keys=True))
' > "$output_root/reports/database-counts.json"

created_attachments="$(json_integer "$output_root/reports/migration-summary.json" created_attachments)"
archived_unsupported="$(json_integer "$output_root/reports/migration-summary.json" archived_unsupported_attachments)"
verified_files="$(json_integer "$output_root/reports/media-verification.json" verified_files)"
verified_bytes="$(json_integer "$output_root/reports/media-verification.json" verified_bytes)"
post_count="$(json_integer "$output_root/reports/database-counts.json" posts)"
comment_count="$(json_integer "$output_root/reports/database-counts.json" comments)"
user_count="$(json_integer "$output_root/reports/database-counts.json" users)"
ledger_count="$(json_integer "$output_root/reports/database-counts.json" ledger_records)"
[[ "$created_attachments" == 637 ]] || fail "Expected 637 imported attachments; found $created_attachments."
[[ "$archived_unsupported" == 11 ]] || fail "Expected 11 archived unsupported attachments; found $archived_unsupported."
[[ "$verified_files" == 637 ]] || fail "Expected 637 verified media files; found $verified_files."
[[ "$verified_bytes" == 706706761 ]] || fail "Verified media byte count changed: $verified_bytes."
[[ "$post_count" == 685 ]] || fail "Expected 685 imported posts; found $post_count."
[[ "$comment_count" == 247 ]] || fail "Expected 247 imported comments; found $comment_count."
[[ "$user_count" == 197 ]] || fail "Expected 197 imported users; found $user_count."
[[ "$ledger_count" == 1923 ]] || fail "Expected 1923 migration ledger records; found $ledger_count."
media_manifest="$(awk -F'"' '/"manifest_sha256"/ {print $4; exit}' "$output_root/reports/media-verification.json")"
[[ "$media_manifest" =~ ^[0-9a-f]{64}$ ]] || fail "Media verifier did not produce a valid manifest SHA-256."

remote_review_dump="/tmp/${review_database}.dump"
local_review_dump="$output_root/artifacts/${review_database}.dump"
compose exec -T -e REVIEW_DATABASE="$review_database" -e BACKUP_PATH="$remote_review_dump" db sh -ceu '
  umask 077
  pg_dump --username "$POSTGRES_USER" --dbname "$REVIEW_DATABASE" --format=custom --file "$BACKUP_PATH"
'
compose cp "db:$remote_review_dump" "$local_review_dump"
compose exec -T -e BACKUP_PATH="$remote_review_dump" db sh -ceu 'rm -f -- "$BACKUP_PATH"'
tar -C "$output_root/media" -cf "$output_root/artifacts/public-media.tar" .
tar -C "$output_root/private-media" -cf "$output_root/artifacts/private-media.tar" .
(
  cd -- "$output_root"
  sha256sum artifacts/*.dump artifacts/*.tar reports/*.json reports/*.ndjson > artifacts/SHA256SUMS
)
chmod 600 "$output_root/artifacts"/* "$output_root/reports"/*

ensure_empty_volume "$production_media_volume"
ensure_empty_volume "$production_private_media_volume"

remote_restore_dump="/tmp/${review_database}-restore.dump"
compose cp "$local_review_dump" "db:$remote_restore_dump"
compose exec -T -e RESTORE_PATH="$remote_restore_dump" db sh -ceu '
  pg_restore --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
    --exit-on-error --single-transaction --no-owner --no-privileges "$RESTORE_PATH"
'
compose exec -T -e RESTORE_PATH="$remote_restore_dump" db sh -ceu 'rm -f -- "$RESTORE_PATH"'

restore_media_directory "$output_root/media" "$production_media_volume"
restore_media_directory "$output_root/private-media" "$production_private_media_volume"

compose run --rm --no-deps \
  -e DATABASE_URL="$database_url" \
  -e EXPECTED_MANIFEST="$media_manifest" \
  backend sh -ceu '
    python scripts/verify_legacy_media.py \
      --database-url "$DATABASE_URL" \
      --public-media-dir "$MEDIA_UPLOAD_DIR" \
      --private-media-dir "$MEDIA_PRIVATE_UPLOAD_DIR" \
      --expected-manifest-sha256 "$EXPECTED_MANIFEST"
  ' > "$output_root/reports/production-media-verification.json"

cat > "$output_root/deployment-ready.env" <<EOF
SOURCE_MANIFEST_SHA256=$actual_source_manifest
MEDIA_MANIFEST_SHA256=$media_manifest
REVIEW_DATABASE=$review_database
PRODUCTION_DATABASE=$production_database
PRODUCTION_MEDIA_VOLUME_NAME=$production_media_volume
PRODUCTION_PRIVATE_MEDIA_VOLUME_NAME=$production_private_media_volume
MIGRATION_OUTPUT=$output_root
EOF
chmod 600 "$output_root/deployment-ready.env"

printf '\nLegacy import and production restore passed.\n'
printf 'Review database: %s\n' "$review_database"
printf 'Media manifest: %s\n' "$media_manifest"
printf 'Output and coordinated backup set: %s\n' "$output_root"
printf 'Raw sources remain at: %s\n' "$source_root"
printf 'Do not delete the raw source or artifacts until browser and device checks pass.\n'
