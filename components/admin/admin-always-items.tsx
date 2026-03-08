"use client"

import { useState } from "react"
import { useAlwaysItems, useMateriel, globalMutate } from "@/lib/hooks"
import { adminInsert, adminUpdate, adminDelete } from "@/lib/admin-api"
import { AdminHeader } from "./admin-header"
import { Plus, Trash2, Loader2 } from "lucide-react"

export function AdminAlwaysItems({ onBack }: { onBack: () => void }) {
  const { data: items, isLoading } = useAlwaysItems()
  const { data: materiel } = useMateriel()
  const [newMaterielId, setNewMaterielId] = useState("")
  const [newQty, setNewQty] = useState(1)
  const [adding, setAdding] = useState(false)

  async function addItem() {
    if (!newMaterielId) return
    setAdding(true)
    await adminInsert("always_items", {
      materiel_id: newMaterielId,
      qty: newQty,
    })
    setNewMaterielId("")
    setNewQty(1)
    globalMutate("always_items_with_materiel")
    setAdding(false)
  }

  async function deleteItem(id: string) {
    await adminDelete("always_items", { id })
    globalMutate("always_items_with_materiel")
  }

  async function updateQty(id: string, qty: number) {
    if (qty < 1) return
    await adminUpdate("always_items", { qty }, { id })
    globalMutate("always_items_with_materiel")
  }

  return (
    <div className="p-4">
      <AdminHeader title="Materiel pris d'office" onBack={onBack} />

      {/* Add form */}
      <div className="flex flex-col gap-2 mb-4 rounded-lg border border-border bg-card p-3">
        <select
          value={newMaterielId}
          onChange={(e) => setNewMaterielId(e.target.value)}
          className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground"
        >
          <option value="">Materiel...</option>
          {(materiel as any[])?.map((m: any) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <input
            type="number"
            min={1}
            value={newQty}
            onChange={(e) => setNewQty(Number(e.target.value))}
            className="w-16 rounded-lg border border-border bg-secondary px-2 py-2 text-sm text-foreground text-center"
          />
          <button
            onClick={addItem}
            disabled={adding || !newMaterielId}
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

      {items && (items as any[]).length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">
          Aucun materiel pris d{"'"}office
        </p>
      )}

      <div className="flex flex-col gap-2">
        {(items as any[])?.map((item: any) => (
          <div
            key={item.id}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2"
          >
            <span className="flex-1 min-w-0 text-sm text-foreground truncate">
              {item.materiel?.name || "?"}
            </span>
            <input
              type="number"
              min={1}
              value={item.qty}
              onChange={(e) => updateQty(item.id, Number(e.target.value))}
              className="w-14 rounded border border-border bg-secondary px-2 py-1 text-sm text-foreground text-center"
            />
            <button
              onClick={() => deleteItem(item.id)}
              className="rounded p-1 text-muted-foreground hover:text-destructive transition-colors"
              aria-label="Supprimer"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
