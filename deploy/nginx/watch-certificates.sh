#!/bin/sh
set -eu

certificate="/etc/letsencrypt/live/${PUBLIC_IP}/fullchain.pem"
interval="${CERTIFICATE_WATCH_INTERVAL_SECONDS:-300}"
previous=""

while :; do
    if [ -r "$certificate" ]; then
        current="$(sha256sum "$certificate" | awk '{print $1}')"
        if [ -n "$previous" ] && [ "$current" != "$previous" ]; then
            nginx -t
            nginx -s reload
        fi
        previous="$current"
    fi
    sleep "$interval"
done
