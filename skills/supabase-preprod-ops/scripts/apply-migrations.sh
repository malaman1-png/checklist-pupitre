#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
SQL_DIR="${ROOT_DIR}/scripts"

log() { printf '[apply-migrations] %s\n' "$*"; }
fail() { printf '[apply-migrations][ERROR] %s\n' "$*" >&2; exit 1; }

DB_URL="${SUPABASE_PREPROD_DB_URL:-}"
PROD_SUPABASE_URL="${PROD_SUPABASE_URL:-https://xixvpyvbvtluciyqfhzw.supabase.co}"
TARGET_SUPABASE_URL="${SUPABASE_PREPROD_URL:-}"

[[ -n "${DB_URL}" ]] || fail "SUPABASE_PREPROD_DB_URL manquant."
[[ -d "${SQL_DIR}" ]] || fail "Dossier scripts introuvable: ${SQL_DIR}"

# Safety guard: never target known prod project.
if [[ "${TARGET_SUPABASE_URL}" == "${PROD_SUPABASE_URL}" ]]; then
  fail "SUPABASE_PREPROD_URL pointe vers la prod. Stop."
fi

if ! command -v psql >/dev/null 2>&1; then
  fail "psql absent. Installe le client PostgreSQL puis relance."
fi

log "Application des migrations (whitelist stricte) depuis ${SQL_DIR}"
files=(
  "${SQL_DIR}/001_create_tables.sql"
  "${SQL_DIR}/003_create_artists.sql"
  "${SQL_DIR}/004_add_project_artists.sql"
  "${SQL_DIR}/005_create_always_items.sql"
  "${SQL_DIR}/006_simplify_modular_acts.sql"
  "${SQL_DIR}/007_add_artist_key_to_checklist.sql"
  "${SQL_DIR}/008_fix_checklist_materiel_fk.sql"
  "${SQL_DIR}/009_create_display_order.sql"
  "${SQL_DIR}/010_add_transport_mode.sql"
  "${SQL_DIR}/011_create_transport_rules.sql"
  "${SQL_DIR}/012_create_transport_act_rules.sql"
  "${SQL_DIR}/013_fix_transport_act_rules.sql"
  "${SQL_DIR}/014_enable_realtime.sql"
  "${SQL_DIR}/015_add_batch_id.sql"
  "${SQL_DIR}/016_add_son_light_labels.sql"
  "${SQL_DIR}/017_enable_rls.sql"
  "${SQL_DIR}/018_act_versions.sql"
  "${SQL_DIR}/018_add_mobile_back_confirm.sql"
  "${SQL_DIR}/019_projects_name_default.sql"
  "${SQL_DIR}/019_rls_act_versions.sql"
  "${SQL_DIR}/023_add_touch_tap_slop.sql"
  "${SQL_DIR}/024_secure_admin_password.sql"
  "${SQL_DIR}/025_add_etincelle_v1.sql"
)

for f in "${files[@]}"; do
  [[ -f "${f}" ]] || fail "Migration manquante dans la whitelist: ${f}"
done

for f in "${files[@]}"; do
  log "-> $(basename "$f")"
  psql "${DB_URL}" -v ON_ERROR_STOP=1 -f "$f" >/dev/null
done

log "Migrations appliquees avec succes."
