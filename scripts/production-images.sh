#!/usr/bin/env bash
# Shared by the production entrypoints. This file contains no runtime secrets.

production_image_reference_valid() {
  local value="$1"
  if [[ "$value" == sha256:* ]]; then
    [[ "$value" =~ ^sha256:[a-f0-9]{64}$ ]]
  else
    [[ "$value" =~ ^([a-z0-9]+([._-][a-z0-9]+)*(:[0-9]+)?/)*[a-z0-9]+([._-][a-z0-9]+)*(:[A-Za-z0-9_][A-Za-z0-9_.-]{0,127})?(@sha256:[a-f0-9]{64})?$ ]]
  fi
}

production_load_image_profile() {
  local profile="${PRODUCTION_IMAGES_ENV_FILE:-$repo_root/deploy/production-images.env}"
  local line key value
  local -A seen=()
  if [[ "$profile" != /* ]]; then profile="$repo_root/$profile"; fi
  if [[ -e "$profile" ]]; then
    [[ -f "$profile" ]] || fail "Production image profile must be a regular file."
    while IFS= read -r line || [[ -n "$line" ]]; do
      line="${line%$'\r'}"
      line="${line#"${line%%[![:space:]]*}"}"
      line="${line%"${line##*[![:space:]]}"}"
      [[ -z "$line" || "$line" == \#* ]] && continue
      [[ "$line" == *=* ]] || fail "Invalid production image profile entry."
      key="${line%%=*}"
      value="${line#*=}"
      case "$key" in
        PRODUCTION_BACKEND_IMAGE|PRODUCTION_WORKER_IMAGE|PRODUCTION_FRONTEND_IMAGE) ;;
        *) fail "Production image profile contains an unsupported key." ;;
      esac
      [[ ! -v "seen[$key]" ]] || fail "Production image profile contains a duplicate image key."
      seen[$key]=1
      production_image_reference_valid "$value" || fail "Invalid image reference for $key in production image profile."
      if [[ ! -v "$key" ]]; then export "$key=$value"; fi
    done < "$profile"
  elif [[ -v PRODUCTION_IMAGES_ENV_FILE ]]; then
    fail "Configured production image profile does not exist."
  fi
  for key in PRODUCTION_BACKEND_IMAGE PRODUCTION_WORKER_IMAGE PRODUCTION_FRONTEND_IMAGE; do
    if [[ -v "$key" ]]; then
      production_image_reference_valid "${!key}" || fail "Invalid image reference for $key."
      export "$key"
    fi
  done
}

production_require_local_images() {
  local images image
  images="$("$@")" || fail "Unable to resolve required production images."
  [[ -n "$images" ]] || fail "Production Compose did not resolve any images."
  while IFS= read -r image; do
    [[ -z "$image" ]] && continue
    docker image inspect "$image" >/dev/null 2>&1 || \
      fail "A required production image is not available locally. Import the verified local build before deploying."
  done <<< "$images"
}
