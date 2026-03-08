"use client"

import { useState } from "react"
import { useTypes, globalMutate } from "@/lib/hooks"
import { adminInsert, adminUpdate, adminDelete } from "@/lib/admin-api"
import { AdminHeader } from "./admin-header"
import { Plus, Trash2, Loader2, GripVertical } from "lucide-react"

export function AdminTypes({ onBack }: { onBack: () => void }) {
  const { data: types, isLoading } = useTypes()
  const [newName, setNewName] = useState("")
  const [newColor, setNewColor] = useState("#3b82f6")
  const [adding, setAdding] = useState(false)

  async function addType() {
    if (!newName.trim()) return
    setAdding(true)
    const sortOrder = types ? types.length : 0
    await adminInsert("types", {
      name: newName.trim(),
      color: newColor,
      opacity: 0.15,
      sort_order: sortOrder,
    })
    setNewName("")
    globalMutate("types|sort_order|asc")
    setAdding(false)
  }

  async function deleteType(id: string) {
    if (!confirm("Supprimer ce type ? Les materiels associes seront aussi supprimes.")) return
    await adminDelete("types", { id })
    globalMutate("types|sort_order|asc")
    globalMutate("materiel|name|asc")
  }

  async function updateType(id: string, field: string, value: string | number) {
    await adminUpdate("types", { [field]: value }, { id })
    globalMutate("types|sort_order|asc")
  }

  return (
    <div className="p-4">
      <AdminHeader title="Types" onBack={onBack} />

      {/* Add form */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Nom du type..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addType()}
          className="flex-1 rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <input
          type="color"
          value={newColor}
          onChange={(e) => setNewColor(e.target.value)}
          className="h-10 w-10 rounded-lg border border-border bg-secondary cursor-pointer"
        />
        <button
          onClick={addType}
          disabled={adding || !newName.trim()}
          className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        </button>
      </div>

      {isLoading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      <div className="flex flex-col gap-2">
        {(types as any[])?.map((t: any) => (
          <div
            key={t.id}
            className="rounded-lg border border-border bg-card p-3"
          >
            {/* Row 1: color + name + delete */}
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={t.color}
                onChange={(e) => updateType(t.id, "color", e.target.value)}
                className="h-8 w-8 rounded border border-border cursor-pointer flex-shrink-0"
              />
              <input
                type="text"
                value={t.name}
                onChange={(e) => updateType(t.id, "name", e.target.value)}
                className="flex-1 min-w-0 bg-transparent text-sm text-foreground focus:outline-none"
              />
              <button
                onClick={() => deleteType(t.id)}
                className="rounded-lg p-1 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                aria-label="Supprimer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            {/* Row 2: opacity + order */}
            <div className="flex items-center gap-2 mt-2 pl-10">
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                Opacite
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.05"
                  value={t.opacity}
                  onChange={(e) => updateType(t.id, "opacity", parseFloat(e.target.value))}
                  className="w-16 rounded border border-border bg-secondary px-2 py-1 text-xs text-foreground text-center"
                />
              </label>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                Ordre
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={t.sort_order}
                  onChange={(e) => updateType(t.id, "sort_order", parseInt(e.target.value))}
                  className="w-12 rounded border border-border bg-secondary px-2 py-1 text-xs text-foreground text-center"
                />
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
