#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js"

function fail(message) {
  console.error(`[clone-config-data][ERROR] ${message}`)
  process.exit(1)
}

function log(message) {
  console.log(`[clone-config-data] ${message}`)
}

const required = [
  "SUPABASE_PROD_URL",
  "SUPABASE_PROD_SERVICE_ROLE_KEY",
  "SUPABASE_PREPROD_URL",
  "SUPABASE_PREPROD_SERVICE_ROLE_KEY",
]

for (const key of required) {
  if (!process.env[key] || process.env[key].trim() === "") {
    fail(`Variable manquante: ${key}`)
  }
}

const sourceUrl = process.env.SUPABASE_PROD_URL
const sourceKey = process.env.SUPABASE_PROD_SERVICE_ROLE_KEY
const targetUrl = process.env.SUPABASE_PREPROD_URL
const targetKey = process.env.SUPABASE_PREPROD_SERVICE_ROLE_KEY
const includeRuntime = process.env.INCLUDE_RUNTIME_DATA === "1"

if (sourceUrl === targetUrl) {
  fail("Source=Target (Supabase URL identique). Stop.")
}

const source = createClient(sourceUrl, sourceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const target = createClient(targetUrl, targetKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const configInsertOrder = [
  "settings",
  "types",
  "materiel",
  "artists",
  "fixed_acts",
  "modular_acts",
  "display_order",
  "son_items",
  "light_items",
  "always_items",
  "artist_items",
  "fixed_act_items",
  "modular_act_variants",
  "transport_global_exclusions",
  "transport_global_replacements",
  "transport_global_additions",
  "transport_act_exclusions",
  "transport_act_replacements",
  "transport_act_additions",
  "act_versions",
  "act_version_items",
]

const runtimeInsertOrder = [
  "projects",
  "project_fixed_acts",
  "project_modular_acts",
  "checklist_items",
]

const insertOrder = includeRuntime
  ? [...configInsertOrder, ...runtimeInsertOrder]
  : configInsertOrder
const deleteOrder = [...insertOrder].reverse()

const PAGE_SIZE = 1000
const INSERT_CHUNK = 300
const DUMMY_ID = "00000000-0000-0000-0000-000000000000"

async function fetchAllRows(client, table) {
  const rows = []
  let from = 0
  while (true) {
    const { data, error } = await client
      .from(table)
      .select("*")
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1)
    if (error) {
      throw new Error(`Lecture ${table}: ${error.message}`)
    }
    if (!data || data.length === 0) break
    rows.push(...data)
    if (data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }
  return rows
}

async function deleteAllRows(client, table) {
  const { error } = await client
    .from(table)
    .delete()
    .neq("id", DUMMY_ID)
  if (error) {
    throw new Error(`Nettoyage ${table}: ${error.message}`)
  }
}

async function insertRows(client, table, rows) {
  for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
    const chunk = rows.slice(i, i + INSERT_CHUNK).map((row) => {
      if (table === "settings") {
        // Legacy prod rows may still carry admin_password.
        // Preprod schema (024_secure_admin_password.sql) drops this column.
        const { admin_password, ...safeRow } = row
        return safeRow
      }
      return row
    })
    const { error } = await client.from(table).insert(chunk)
    if (error) {
      throw new Error(`Insertion ${table}: ${error.message}`)
    }
  }
}

async function main() {
  log(`Mode: ${includeRuntime ? "CONFIG + RUNTIME" : "CONFIG ONLY"}`)
  log("Lecture des donnees source...")

  const sourceData = {}
  for (const table of insertOrder) {
    const rows = await fetchAllRows(source, table)
    sourceData[table] = rows
    log(`Source ${table}: ${rows.length}`)
  }

  log("Nettoyage base preprod (tables cible)...")
  for (const table of deleteOrder) {
    await deleteAllRows(target, table)
  }

  log("Insertion donnees source -> preprod...")
  for (const table of insertOrder) {
    const rows = sourceData[table] || []
    if (rows.length === 0) continue
    await insertRows(target, table, rows)
  }

  log("Clone termine avec succes.")
  log(`Tables copiees: ${insertOrder.length}`)
}

main().catch((err) => fail(err?.message || String(err)))
