"use client"

import { useState } from "react"
import {
  useModularActs,
  useModularActVariants,
  useMateriel,
  globalMutate,
} from "@/lib/hooks"
import { adminInsert, adminUpdate, adminDelete } from "@/lib/admin-api"
import { AdminHeader } from "./admin-header"
import { Plus, Trash2, Loader2, ChevronDown, ChevronUp } from "lucide-react"

export function AdminModularActs({ onBack }: { onBack: () => void }) {
  const { data: acts, isLoading } = useModularActs()
  const [newName, setNewName] = useState("")
  const [adding, setAdding] = useState(false)
  const [expandedAct, setExpandedAct] = useState<string | null>(null)

  async function addAct() {
    if (!newName.trim()) return
    setAdding(true)
    await adminInsert("modular_acts", { name: newName.trim() })
    setNewName("")
    globalMutate("modular_acts|name|asc")
    setAdding(false)
  }

  async function deleteAct(id: string) {
    if (!confirm("Supprimer cet acte modulable et tout son materiel ?")) return
    await adminDelete("modular_act_variants", { modular_act_id: id })
    await adminDelete("modular_acts", { id })
    globalMutate("modular_acts|name|asc")
  }

  return (
    <div className="p-4">
      <AdminHeader title="Actes modulables" onBack={onBack} />

      <p className="text-xs text-muted-foreground mb-4">
        {"Saisissez le materiel PAR ARTISTE. La quantite sera multipliee par le nombre d'artistes choisi lors de la creation de checklist."}
      </p>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Nom de l'acte (ex: TETRA)..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addAct()}
          className="flex-1 rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          onClick={addAct}
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
        {(acts as any[])?.map((act: any) => (
          <div key={act.id} className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-2 p-3">
              <button
                onClick={() => setExpandedAct(expandedAct === act.id ? null : act.id)}
                className="flex-1 flex items-center gap-2 text-left"
              >
                {expandedAct === act.id ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="text-sm font-medium text-foreground">{act.name}</span>
              </button>
              <button
                onClick={() => deleteAct(act.id)}
                className="rounded p-1 text-muted-foreground hover:text-destructive transition-colors"
                aria-label="Supprimer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            {expandedAct === act.id && <ModularItemsEditor actId={act.id} />}
          </div>
        ))}
      </div>
    </div>
  )
}

function ModularItemsEditor({ actId }: { actId: string }) {
  const { data: items, isLoading } = useModularActVariants(actId)
  const { data: materiel } = useMateriel()
  const [newMaterielId, setNewMaterielId] = useState("")
  const [newQty, setNewQty] = useState(1)

  async function addItem() {
    if (!newMaterielId) return
    await adminInsert("modular_act_variants", {
      modular_act_id: actId,
      materiel_id: newMaterielId,
      quantity: newQty,
    })
    setNewMaterielId("")
    setNewQty(1)
    globalMutate(`modular_act_variants_${actId}`)
  }

  async function deleteItem(id: string) {
    await adminDelete("modular_act_variants", { id })
    globalMutate(`modular_act_variants_${actId}`)
  }

  async function updateQty(id: string, qty: number) {
    await adminUpdate("modular_act_variants", { quantity: qty }, { id })
    globalMutate(`modular_act_variants_${actId}`)
  }

  return (
    <div className="border-t border-border p-3">
      <p className="text-xs text-muted-foreground mb-2">Quantites par artiste :</p>

      {/* Add item */}
      <div className="flex gap-2 mb-3">
        <select
          value={newMaterielId}
          onChange={(e) => setNewMaterielId(e.target.value)}
          className="flex-1 rounded border border-border bg-secondary px-2 py-1 text-sm text-foreground"
        >
          <option value="">Objet...</option>
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
          className="w-14 rounded border border-border bg-secondary px-2 py-1 text-sm text-foreground text-center"
        />
        <button
          onClick={addItem}
          disabled={!newMaterielId}
          className="rounded bg-primary px-2 py-1 text-sm text-primary-foreground disabled:opacity-50"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>

      {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mx-auto" />}

      {/* List items */}
      <div className="flex flex-col gap-1">
        {(items as any[])?.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-2">Aucun objet</p>
        )}
        {(items as any[])?.map((v: any) => (
          <div key={v.id} className="flex items-center gap-2 text-sm">
            <span className="flex-1 min-w-0 text-foreground truncate">{v.materiel?.name || "?"}</span>
            <span className="text-xs text-muted-foreground flex-shrink-0">x</span>
            <input
              type="number"
              min="1"
              value={v.quantity}
              onChange={(e) => updateQty(v.id, parseInt(e.target.value) || 1)}
              className="w-12 rounded border border-border bg-secondary px-1 py-0.5 text-xs text-foreground text-center flex-shrink-0"
            />
            <button
              onClick={() => deleteItem(v.id)}
              className="rounded p-0.5 text-muted-foreground hover:text-destructive flex-shrink-0"
              aria-label="Supprimer"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
