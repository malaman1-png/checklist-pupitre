import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

// Allowed admin tables (whitelist to prevent abuse)
const ADMIN_TABLES = new Set([
  "settings",
  "types",
  "materiel",
  "artists",
  "artist_items",
  "fixed_acts",
  "fixed_act_items",
  "modular_acts",
  "modular_act_variants",
  "son_items",
  "light_items",
  "always_items",
  "display_order",
  "transport_global_additions",
  "transport_global_exclusions",
  "transport_global_replacements",
  "transport_act_additions",
  "transport_act_exclusions",
  "transport_act_replacements",
  "act_versions",
  "act_version_items",
])

const ADMIN_SECRETS_MISSING_MSG =
  "La table admin_secrets n'existe pas en base. Execute le script SQL de migration securite."

async function checkPassword(req: NextRequest): Promise<boolean> {
  const authHeader = req.headers.get("x-admin-password") || ""
  if (!authHeader) return false

  // 1) Primary password from DB (single source of truth across devices)
  // Stored in dedicated admin_secrets table, not in public settings.
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("admin_secrets")
      .select("admin_password")
      .limit(1)
      .single()

    // If DB secret exists, enforce it strictly and ignore env fallback.
    if (!error && data?.admin_password) {
      return authHeader === data.admin_password
    }
  } catch {
    // Ignore and fallback to env below
  }

  // 2) Env password fallback only when DB secret is unavailable.
  const envPassword = process.env.ADMIN_PASSWORD
  if (envPassword && authHeader === envPassword) return true

  return false
}

// Generic admin write endpoint
// Body: { action, table, data?, match?, id? }
//   action: "insert" | "update" | "upsert" | "delete" | "deleteMatch"
//   table: one of ADMIN_TABLES
//   data: row data for insert/update/upsert
//   match: { column: value } for update/delete filtering
//   id: shorthand for match on id column
export async function POST(req: NextRequest) {
  if (!(await checkPassword(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { action, table, data, match, id } = body

  if (!ADMIN_TABLES.has(table)) {
    return NextResponse.json({ error: `Table "${table}" not allowed` }, { status: 403 })
  }

  try {
    let result: any

    switch (action) {
      case "setPassword": {
        const newPassword = data?.password
        if (typeof newPassword !== "string" || newPassword.trim().length < 4) {
          return NextResponse.json(
            { error: "Le mot de passe doit contenir au moins 4 caracteres." },
            { status: 400 }
          )
        }

        const supabase = createAdminClient()
        const { data: row, error: rowErr } = await supabase
          .from("admin_secrets")
          .select("id")
          .limit(1)
          .maybeSingle()

        if (rowErr) {
          const msg = rowErr.message || ""
          if (msg.includes("admin_secrets")) {
            return NextResponse.json({ error: ADMIN_SECRETS_MISSING_MSG }, { status: 400 })
          }
          return NextResponse.json({ error: msg }, { status: 500 })
        }

        const pwRes = row?.id
          ? await supabase
              .from("admin_secrets")
              .update({ admin_password: newPassword.trim(), updated_at: new Date().toISOString() })
              .eq("id", row.id)
              .select()
          : await supabase
              .from("admin_secrets")
              .insert({ admin_password: newPassword.trim() })
              .select()

        if (pwRes.error) return NextResponse.json({ error: pwRes.error.message }, { status: 500 })
        return NextResponse.json({ ok: true })
      }
      case "ping": {
        // Simple password check used for Control Room login.
        // Ne touche pas à Supabase pour éviter d'exiger la clé service en prod.
        return NextResponse.json({ ok: true })
      }
      case "insert": {
        const supabase = createAdminClient()
        result = await supabase.from(table).insert(data).select()
        break
      }
      case "update": {
        const supabase = createAdminClient()
        let q = supabase.from(table).update(data)
        if (id) q = q.eq("id", id)
        else if (match) {
          for (const [col, val] of Object.entries(match)) {
            q = q.eq(col, val)
          }
        }
        result = await q.select()
        break
      }
      case "upsert": {
        const supabase = createAdminClient()
        result = await supabase.from(table).upsert(data).select()
        break
      }
      case "delete": {
        const supabase = createAdminClient()
        let q = supabase.from(table).delete()
        if (id) q = q.eq("id", id)
        else if (match) {
          for (const [col, val] of Object.entries(match)) {
            q = q.eq(col, val)
          }
        } else {
          return NextResponse.json({ error: "delete requires id or match" }, { status: 400 })
        }
        result = await q.select()
        break
      }
      case "deleteMatch": {
        // Delete with flexible matching (multiple eq conditions)
        if (!match || Object.keys(match).length === 0) {
          return NextResponse.json({ error: "deleteMatch requires match object" }, { status: 400 })
        }
        const supabase = createAdminClient()
        let dq = supabase.from(table).delete()
        for (const [col, val] of Object.entries(match)) {
          dq = dq.eq(col, val)
        }
        result = await dq.select()
        break
      }
      case "deleteAll": {
        // Delete all rows (for bulk replace patterns like display_order)
        const supabase = createAdminClient()
        result = await supabase.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000")
        break
      }
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 })
    }

    return NextResponse.json({ data: result.data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Server error" }, { status: 500 })
  }
}
