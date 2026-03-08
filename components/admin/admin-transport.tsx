"use client"

import { useState } from "react"
import { ArrowLeft, Plus, Trash2, ArrowRight } from "lucide-react"
import { AdminTransportActs } from "@/components/admin/admin-transport-act"
import {
  useTransportExclusions,
  useTransportReplacements,
  useTransportAdditions,
  useMateriel,
  globalMutate,
} from "@/lib/hooks"
import { adminInsert, adminDelete } from "@/lib/admin-api"

export function AdminTransport({ onBack }: { onBack: () => void }) {
  const { data: exclusions } = useTransportExclusions()
  const { data: replacements } = useTransportReplacements()
  const { data: additions } = useTransportAdditions()
  const { data: materiel } = useMateriel()

  // Exclusions state
  const [exclMatId, setExclMatId] = useState("")
  // Replacements state
  const [replOrigId, setReplOrigId] = useState("")
  const [replNewId, setReplNewId] = useState("")
  // Additions state
  const [addMatId, setAddMatId] = useState("")
  const [addQty, setAddQty] = useState(1)

  async function addExclusion() {
    if (!exclMatId) return
    await adminInsert("transport_global_exclusions", { materiel_id: exclMatId })
    setExclMatId("")
    globalMutate("transport_excl")
  }

  async function removeExclusion(id: string) {
    await adminDelete("transport_global_exclusions", { id })
    globalMutate("transport_excl")
  }

  async function addReplacement() {
    if (!replOrigId || !replNewId || replOrigId === replNewId) return
    await adminInsert("transport_global_replacements", {
      from_materiel_id: replOrigId,
      to_materiel_id: replNewId,
    })
    setReplOrigId("")
    setReplNewId("")
    globalMutate("transport_repl")
  }

  async function removeReplacement(id: string) {
    await adminDelete("transport_global_replacements", { id })
    globalMutate("transport_repl")
  }

  async function addAddition() {
    if (!addMatId) return
    await adminInsert("transport_global_additions", {
      materiel_id: addMatId,
      qty: addQty,
    })
    setAddMatId("")
    setAddQty(1)
    globalMutate("transport_add")
  }

  async function removeAddition(id: string) {
    await adminDelete("transport_global_additions", { id })
    globalMutate("transport_add")
  }

  const matList = (materiel as any[]) || []

  return (
    <div className="p-4 overflow-hidden max-w-full">
      <header className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors" aria-label="Retour">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-foreground truncate">Transport TRAIN</h1>
      </header>

      <p className="text-xs text-muted-foreground mb-6">
        Ces regles s'appliquent automatiquement quand le mode TRAIN/MONOROUE est choisi.
      </p>

      {/* Exclusions */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-foreground mb-3">Exclusions</h2>
        <p className="text-xs text-muted-foreground mb-3">Materiel retire de la checklist en mode train.</p>

        <div className="flex flex-col gap-2 mb-3">
          {(exclusions as any[] || []).map((e: any) => (
            <div key={e.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
              <span className="text-sm text-foreground">{e.materiel?.name || "?"}</span>
              <button onClick={() => removeExclusion(e.id)} className="text-muted-foreground hover:text-destructive" aria-label="Supprimer">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <select
            value={exclMatId}
            onChange={(e) => setExclMatId(e.target.value)}
            className="flex-1 rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground"
          >
            <option value="">Materiel a exclure...</option>
            {matList.map((m: any) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          <button onClick={addExclusion} disabled={!exclMatId} className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* Replacements */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-foreground mb-3">Remplacements</h2>
        <p className="text-xs text-muted-foreground mb-3">En mode train, remplacer un objet par un autre.</p>

        <div className="flex flex-col gap-2 mb-3">
          {(replacements as any[] || []).map((r: any) => (
            <div key={r.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
              <div className="flex items-center gap-2 text-sm min-w-0 flex-1 mr-2">
                <span className="text-foreground truncate">{r.original?.name || "?"}</span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <span className="text-primary font-medium truncate">{r.replacement?.name || "?"}</span>
              </div>
              <button onClick={() => removeReplacement(r.id)} className="text-muted-foreground hover:text-destructive" aria-label="Supprimer">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <select
            value={replOrigId}
            onChange={(e) => setReplOrigId(e.target.value)}
            className="w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground"
          >
            <option value="">Original...</option>
            {matList.map((m: any) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <select
              value={replNewId}
              onChange={(e) => setReplNewId(e.target.value)}
              className="flex-1 rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground"
            >
              <option value="">Remplacement...</option>
              {matList.map((m: any) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <button onClick={addReplacement} disabled={!replOrigId || !replNewId || replOrigId === replNewId} className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50 flex-shrink-0">
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Additions */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-foreground mb-3">Ajouts</h2>
        <p className="text-xs text-muted-foreground mb-3">Materiel ajoute automatiquement en mode train.</p>

        <div className="flex flex-col gap-2 mb-3">
          {(additions as any[] || []).map((a: any) => (
            <div key={a.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
              <span className="text-sm text-foreground">
                {a.materiel?.name || "?"} <span className="text-muted-foreground">x{a.qty}</span>
              </span>
              <button onClick={() => removeAddition(a.id)} className="text-muted-foreground hover:text-destructive" aria-label="Supprimer">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <select
            value={addMatId}
            onChange={(e) => setAddMatId(e.target.value)}
            className="flex-1 rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground"
          >
            <option value="">Materiel a ajouter...</option>
            {matList.map((m: any) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            value={addQty}
            onChange={(e) => setAddQty(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-16 rounded-lg border border-border bg-secondary px-2 py-2 text-sm text-foreground text-center"
          />
          <button onClick={addAddition} disabled={!addMatId} className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* Per-act rules */}
      <AdminTransportActs />
    </div>
  )
}
