#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VERIFY_SQL="${SCRIPT_DIR}/verify-preprod.sql"

log() { printf '[bootstrap-preprod] %s\n' "$*"; }
fail() { printf '[bootstrap-preprod][ERROR] %s\n' "$*" >&2; exit 1; }

cd "${ROOT_DIR}"

# Load local env file if present
if [[ -f "${ROOT_DIR}/.env.preprod" ]]; then
  # shellcheck disable=SC1091
  set -a
  source "${ROOT_DIR}/.env.preprod"
  set +a
fi

# Defaults
PREPROD_BRANCH="${PREPROD_BRANCH:-codex/etincelle-v1}"
RAILWAY_PREPROD_SERVICE="${RAILWAY_PREPROD_SERVICE:-preprod}"
RAILWAY_PREPROD_ENVIRONMENT="${RAILWAY_PREPROD_ENVIRONMENT:-production}"
RAILWAY_PREPROD_URL="${RAILWAY_PREPROD_URL:-https://preprod-production.up.railway.app}"
PROD_RAILWAY_SERVICE="${PROD_RAILWAY_SERVICE:-web}"
PROD_SUPABASE_URL="${PROD_SUPABASE_URL:-https://xixvpyvbvtluciyqfhzw.supabase.co}"

# Required vars for isolated preprod DB
required=(
  SUPABASE_PREPROD_URL
  SUPABASE_PREPROD_ANON_KEY
  SUPABASE_PREPROD_SERVICE_ROLE_KEY
  SUPABASE_PREPROD_DB_URL
  ADMIN_PASSWORD_PREPROD
)

for v in "${required[@]}"; do
  if [[ -z "${!v:-}" ]]; then
    fail "Action manuelle requise: creer .env.preprod avec ${v} puis relancer."
  fi
done

[[ "${SUPABASE_PREPROD_URL}" != "${PROD_SUPABASE_URL}" ]] || fail "Preprod Supabase pointe sur la prod. Stop."
[[ "${RAILWAY_PREPROD_SERVICE}" != "${PROD_RAILWAY_SERVICE}" ]] || fail "Service Railway preprod=prod. Stop."

if ! command -v railway >/dev/null 2>&1; then
  fail "railway CLI absent."
fi
if ! command -v psql >/dev/null 2>&1; then
  fail "Action manuelle requise: installer psql puis relancer bootstrap-preprod.sh."
fi
if ! command -v curl >/dev/null 2>&1; then
  fail "curl absent."
fi

current_branch="$(git rev-parse --abbrev-ref HEAD)"
if [[ "${current_branch}" != "${PREPROD_BRANCH}" ]]; then
  fail "Branche courante=${current_branch}. Passe sur ${PREPROD_BRANCH} puis relance."
fi

log "1/5 Apply migrations"
"${SCRIPT_DIR}/apply-migrations.sh"

log "2/5 Verify database"
psql "${SUPABASE_PREPROD_DB_URL}" -v ON_ERROR_STOP=1 -f "${VERIFY_SQL}" >/dev/null

log "3/5 Sync Railway variables"
"${SCRIPT_DIR}/sync-railway-vars.sh"

log "4/5 Deploy Railway preprod service"
railway up --service "${RAILWAY_PREPROD_SERVICE}" --environment "${RAILWAY_PREPROD_ENVIRONMENT}" --detach -m "preprod bootstrap $(date +%Y-%m-%dT%H:%M:%S)" >/dev/null

log "5/5 Verify URL"
curl -fsS "${RAILWAY_PREPROD_URL}" >/dev/null

printf '\n========== PREPROD SUMMARY ==========\n'
printf 'Projet Supabase cible : %s\n' "${SUPABASE_PREPROD_URL}"
printf 'Service Railway cible : %s\n' "${RAILWAY_PREPROD_SERVICE}"
printf 'URL preprod           : %s\n' "${RAILWAY_PREPROD_URL}"
printf 'Prod inchangee        : oui\n'
printf '====================================\n'

