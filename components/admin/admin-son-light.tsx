"use client"

import { useState } from "react"
import { useSonItems, useLightItems, useMateriel, useSettings, globalMutate } from "@/lib/hooks"
import { adminInsert, adminUpdate, adminDelete } from "@/lib/admin-api"
import { AdminHeader } from "./admin-header"
import { Plus, Trash2, Loader2 } from "lucide-react"

interface AdminSonLightProps {
  mode: "son" | "light"
  onBack: () => void
}

export function AdminSonLight({ mode, onBack }: AdminSonLightProps) {
  const table = mode === "son" ? "son_items" : "light_items"
  const swrKey = mode === "son" ? "son_items_with_materiel" : "light_items_with_materiel"
  const hook = mode === "son" ? useSonItems : useLightItems
  const { data: items, isLoading } = hook()
  const { data: materiel } = useMateriel()
  const { data: settings } = useSettings()
  const title = mode === "son" ? ((settings as any)?.label_son || "SON") : ((settings as any)?.label_light || "LIGHT")

  const [newMaterielId, setNewMaterielId] = useState("")
  const [newQty, setNewQty] = useState(1)
  const [adding, setAdding] = useState(false)

  async function addItem() {
    if (!newMaterielId) return
    setAdding(true)
    await adminInsert(table, {
      materiel_id: newMaterielId,
      quantity: newQty,
    })
    setNewMaterielId("")
    setNewQty(1)
    globalMutate(swrKey)
    setAdding(false)
  }

  async function deleteItem(id: string) {
    await adminDelete(table, { id })
    globalMutate(swrKey)
  }

  async function updateQty(id: string, qty: number) {
    await adminUpdate(table, { quantity: qty }, { id })
    globalMutate(swrKey)
  }

  return (
    <div className="p-4">
      <AdminHeader title={title} onBack={onBack} />

      {/* Add form */}
      <div className="flex gap-2 mb-4">
        <select
          value={newMaterielId}
          onChange={(e) => setNewMaterielId(e.target.value)}
          className="flex-1 rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground"
        >
          <option value="">Choisir un objet...</option>
          {(materiel as any[])?.map((m: any) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <input
          type="number"
          min="1"
          value={newQty}
          onChange={(e) => setNewQty(parseInt(e.target.value) || 1)}
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

      {isLoading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      <div className="flex flex-col gap-1">
        {(items as any[])?.map((item: any) => (
          <div
            key={item.id}
            className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
          >
            <span className="flex-1 min-w-0 text-sm text-foreground truncate">
              {item.materiel?.name || "?"}
            </span>
            <input
              type="number"
              min="1"
              value={item.quantity}
              onChange={(e) => updateQty(item.id, parseInt(e.target.value) || 1)}
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

      {!isLoading && items && (items as any[]).length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">
          Aucun objet. Ajoutez-en avec le formulaire ci-dessus.
        </p>
      )}
    </div>
  )
}
