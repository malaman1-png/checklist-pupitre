// Client-side helper for admin write operations via API route
// All writes go through /api/admin with password authentication

function getAdminPassword(): string {
  if (typeof window === "undefined") return ""
  try {
    return localStorage.getItem("admin_password") || ""
  } catch {
    return ""
  }
}

export function setAdminPassword(password: string) {
  try {
    localStorage.setItem("admin_password", password)
  } catch {}
}

interface AdminRequest {
  action: "insert" | "update" | "upsert" | "delete" | "deleteMatch" | "setPassword"
  table: string
  data?: any
  match?: Record<string, any>
  id?: string
}

interface AdminResponse {
  data?: any
  error?: string
}

export async function adminApi(req: AdminRequest): Promise<AdminResponse> {
  const res = await fetch("/api/admin", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-password": getAdminPassword(),
    },
    body: JSON.stringify(req),
  })

  const json = await res.json()
  if (!res.ok) {
    return { error: json.error || `HTTP ${res.status}` }
  }
  return json
}

// Convenience wrappers
export async function adminInsert(table: string, data: any) {
  return adminApi({ action: "insert", table, data })
}

export async function adminUpdate(table: string, data: any, match: Record<string, any>) {
  return adminApi({ action: "update", table, data, match })
}

export async function adminUpsert(table: string, data: any) {
  return adminApi({ action: "upsert", table, data })
}

export async function adminDelete(table: string, match: Record<string, any>) {
  return adminApi({ action: "deleteMatch", table, match })
}

export async function adminDeleteAll(table: string) {
  return adminApi({ action: "deleteAll" as any, table })
}

export async function adminSetPassword(password: string) {
  return adminApi({ action: "setPassword", table: "settings", data: { password } })
}
