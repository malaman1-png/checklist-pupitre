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

function checkPassword(req: NextRequest): boolean {
  const authHeader = req.headers.get("x-admin-password") || ""
  const envPassword = process.env.ADMIN_PASSWORD
  if (!envPassword) return false
  return authHeader === envPassword
}

// Generic admin write endpoint
// Body: { action, table, data?, match?, id? }
//   action: "insert" | "update" | "upsert" | "delete" | "deleteMatch"
//   table: one of ADMIN_TABLES
//   data: row data for insert/update/upsert
//   match: { column: value } for update/delete filtering
//   id: shorthand for match on id column
export async function POST(req: NextRequest) {
  if (!checkPassword(req)) {
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

  const supabase = createAdminClient()

  try {
    let result: any

    switch (action) {
      case "insert": {
        result = await supabase.from(table).insert(data).select()
        break
      }
      case "update": {
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
        result = await supabase.from(table).upsert(data).select()
        break
      }
      case "delete": {
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
        let dq = supabase.from(table).delete()
        for (const [col, val] of Object.entries(match)) {
          dq = dq.eq(col, val)
        }
        result = await dq.select()
        break
      }
      case "deleteAll": {
        // Delete all rows (for bulk replace patterns like display_order)
        result = await supabase.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000")
        break
      }
      case "ping": {
        return NextResponse.json({ ok: true })
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
