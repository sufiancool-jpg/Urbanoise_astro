#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <build_hook_url> [secret]"
  exit 1
fi

HOOK_URL="$1"
SECRET="${2:-}"

JSON_PAYLOAD='{"event":"manual.test","source":"local-script","timestamp":"'"$(date -u +"%Y-%m-%dT%H:%M:%SZ")"'"}'

if [[ -n "$SECRET" ]]; then
  curl -sS -X POST \
    -H "Content-Type: application/json" \
    -H "X-Urbanoise-Webhook-Secret: $SECRET" \
    -d "$JSON_PAYLOAD" \
    "$HOOK_URL"
else
  curl -sS -X POST \
    -H "Content-Type: application/json" \
    -d "$JSON_PAYLOAD" \
    "$HOOK_URL"
fi

echo
echo "Build hook ping sent."
