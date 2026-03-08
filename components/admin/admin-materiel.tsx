"use client"

import { useState } from "react"
import { useMateriel, useTypes, globalMutate } from "@/lib/hooks"
import { adminInsert, adminUpdate, adminDelete } from "@/lib/admin-api"
import { AdminHeader } from "./admin-header"
import { Plus, Trash2, Loader2, Pencil, Check, X } from "lucide-react"

export function AdminMateriel({ onBack }: { onBack: () => void }) {
  const { data: materiel, isLoading } = useMateriel()
  const { data: types } = useTypes()
  const [newName, setNewName] = useState("")
  const [newTypeId, setNewTypeId] = useState("")
  const [newCalcMode, setNewCalcMode] = useState("MAX")
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editCalcMode, setEditCalcMode] = useState("MAX")
  const [editTypeId, setEditTypeId] = useState("")

  async function addMateriel() {
    if (!newName.trim() || !newTypeId) return
    setAdding(true)
    await adminInsert("materiel", {
      name: newName.trim(),
      type_id: newTypeId,
      calc_mode: newCalcMode,
    })
    setNewName("")
    globalMutate("materiel|name|asc")
    setAdding(false)
  }

  async function deleteMateriel(id: string) {
    if (!confirm("Supprimer cet objet ?")) return
    await adminDelete("materiel", { id })
    globalMutate("materiel|name|asc")
  }

  async function updateMateriel(id: string, field: string, value: string) {
    await adminUpdate("materiel", { [field]: value }, { id })
    globalMutate("materiel|name|asc")
  }

  function startEditing(item: any) {
    setEditingId(item.id)
    setEditName(item.name)
    setEditCalcMode(item.calc_mode)
    setEditTypeId(item.type_id || "")
  }

  async function saveEdit() {
    if (!editingId || !editName.trim() || !editTypeId) return
    await adminUpdate("materiel", { name: editName.trim(), calc_mode: editCalcMode, type_id: editTypeId }, { id: editingId })
    setEditingId(null)
    globalMutate("materiel|name|asc")
  }

  function cancelEdit() {
    setEditingId(null)
  }

  // Group by type
  const grouped: Record<string, { type: any; items: any[] }> = {}
  if (materiel && types) {
    for (const m of materiel as any[]) {
      const t = (types as any[]).find((t: any) => t.id === m.type_id)
      const key = m.type_id || "none"
      if (!grouped[key]) {
        grouped[key] = { type: t, items: [] }
      }
      grouped[key].items.push(m)
    }
  }

  return (
    <div className="p-4">
      <AdminHeader title="Materiel" onBack={onBack} />

      {/* Add form */}
      <div className="flex flex-col gap-2 mb-4 rounded-lg border border-border bg-card p-3">
        <input
          type="text"
          placeholder="Nom de l'objet..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="flex gap-2">
          <select
            value={newTypeId}
            onChange={(e) => setNewTypeId(e.target.value)}
            className="flex-1 rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground"
          >
            <option value="">Type...</option>
            {(types as any[])?.map((t: any) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={newCalcMode === "SUM"}
              onChange={(e) => setNewCalcMode(e.target.checked ? "SUM" : "MAX")}
              className="accent-primary"
            />
            <span className="text-xs">SUM</span>
          </label>
          <button
            onClick={addMateriel}
            disabled={adding || !newName.trim() || !newTypeId}
            className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      <div className="flex flex-col gap-4">
        {Object.entries(grouped).map(([key, group]) => (
          <section key={key}>
            <div
              className="rounded-t-lg px-3 py-2"
              style={{
                backgroundColor: group.type
                  ? `${group.type.color}${Math.round((group.type.opacity ?? 0.15) * 255).toString(16).padStart(2, "0")}`
                  : "hsl(var(--secondary))",
              }}
            >
              <h3
                className="text-xs font-bold uppercase tracking-wider"
                style={{
                  color: group.type?.color || "hsl(var(--muted-foreground))",
                  opacity: group.type?.opacity || 1,
                }}
              >
                {group.type?.name || "Sans type"}
              </h3>
            </div>
            <div className="border border-t-0 border-border rounded-b-lg overflow-hidden">
              {group.items.map((m: any, idx: number) => (
                <div
                  key={m.id}
                  className={`flex items-center gap-2 px-3 py-2 bg-card ${idx > 0 ? "border-t border-border" : ""}`}
                >
                  {editingId === m.id ? (
                    <div className="flex flex-col gap-2 w-full">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full rounded border border-border bg-secondary px-2 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit()
                          if (e.key === "Escape") cancelEdit()
                        }}
                      />
                      <div className="flex items-center gap-2">
                        <select
                          value={editTypeId}
                          onChange={(e) => setEditTypeId(e.target.value)}
                          className="flex-1 min-w-0 rounded border border-border bg-secondary px-2 py-1 text-xs text-foreground"
                        >
                          <option value="">Type...</option>
                          {(types as any[])?.map((t: any) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => setEditCalcMode(editCalcMode === "MAX" ? "SUM" : "MAX")}
                          className="text-xs rounded bg-secondary px-2 py-1 text-foreground font-medium border border-border flex-shrink-0"
                        >
                          {editCalcMode}
                        </button>
                        <button
                          onClick={saveEdit}
                          className="rounded p-1 text-success hover:text-success/80 transition-colors flex-shrink-0"
                          aria-label="Valider"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="rounded p-1 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                          aria-label="Annuler"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span className="flex-1 min-w-0 text-sm text-foreground truncate">{m.name}</span>
                      <span className="text-xs rounded bg-secondary px-2 py-0.5 text-muted-foreground flex-shrink-0">
                        {m.calc_mode}
                      </span>
                      <button
                        onClick={() => startEditing(m)}
                        className="rounded p-1 text-muted-foreground hover:text-primary transition-colors"
                        aria-label="Modifier"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteMateriel(m.id)}
                        className="rounded p-1 text-muted-foreground hover:text-destructive transition-colors"
                        aria-label="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
