#!/usr/bin/env bash
set -euo pipefail

log() { printf '[sync-railway-vars] %s\n' "$*"; }
fail() { printf '[sync-railway-vars][ERROR] %s\n' "$*" >&2; exit 1; }

SERVICE="${RAILWAY_PREPROD_SERVICE:-preprod}"
ENVIRONMENT="${RAILWAY_PREPROD_ENVIRONMENT:-production}"

required=(
  SUPABASE_PREPROD_URL
  SUPABASE_PREPROD_ANON_KEY
  SUPABASE_PREPROD_SERVICE_ROLE_KEY
  ADMIN_PASSWORD_PREPROD
)

for v in "${required[@]}"; do
  [[ -n "${!v:-}" ]] || fail "Variable manquante: ${v}"
done

log "Sync variables vers Railway service=${SERVICE} env=${ENVIRONMENT}"
railway variable set \
  --service "${SERVICE}" \
  --environment "${ENVIRONMENT}" \
  --skip-deploys \
  "NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_PREPROD_URL}" \
  "NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_PREPROD_ANON_KEY}" \
  "SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_PREPROD_SERVICE_ROLE_KEY}" \
  "ADMIN_PASSWORD=${ADMIN_PASSWORD_PREPROD}" \
  >/dev/null

log "Variables Railway preprod synchronisees."

