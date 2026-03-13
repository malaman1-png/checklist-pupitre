"use client"

import { useEffect, useMemo, useState } from "react"
import {
  useArtists,
  useEtincelleArtistItems,
  useEtincelleSoundItems,
  useEtincelleVersionItems,
  useEtincelleVersions,
  useMateriel,
  useTypes,
  globalMutate,
  supabase,
} from "@/lib/hooks"
import { adminDelete, adminInsert, adminUpdate } from "@/lib/admin-api"
import { AdminHeader } from "@/components/admin/admin-header"
import { sortTypesForEtincelle } from "@/lib/type-order"
import { ArrowRightLeft, ChevronDown, ChevronUp, Copy, GripVertical, Loader2, Plus, Search, Trash2 } from "lucide-react"

export function AdminEtincelle({ onBack }: { onBack: () => void }) {
  const { data: versions } = useEtincelleVersions()
  const { data: soundItems, isLoading: soundLoading } = useEtincelleSoundItems()
  const { data: materiel } = useMateriel()
  const { data: types } = useTypes()
  const { data: artists } = useArtists()

  const [newSoundMaterielId, setNewSoundMaterielId] = useState("")
  const [newSoundQty, setNewSoundQty] = useState(1)
  const [copying, setCopying] = useState(false)
  const [copyStatus, setCopyStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null)
  const [typeOrderRows, setTypeOrderRows] = useState<Array<{ id: string; name: string; pupitreOrder: number }>>([])
  const [savingTypeOrder, setSavingTypeOrder] = useState(false)
  const [typeOrderStatus, setTypeOrderStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null)
  const [draggingTypeId, setDraggingTypeId] = useState<string | null>(null)
  const [dragOverTypeId, setDragOverTypeId] = useState<string | null>(null)

  const sortedVersions = useMemo(() => {
    return ([...(versions as any[] || [])] as any[]).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
  }, [versions])

  const sortedTypesForEtincelle = useMemo(() => {
    return sortTypesForEtincelle((types as any[]) || [])
  }, [types])

  useEffect(() => {
    const rows = sortedTypesForEtincelle.map((t: any) => ({
      id: t.id,
      name: t.name || "Sans categorie",
      pupitreOrder: Number.isFinite(Number(t.sort_order)) ? Number(t.sort_order) : 0,
    }))
    setTypeOrderRows(rows)
  }, [sortedTypesForEtincelle])

  async function addSoundItem() {
    if (!newSoundMaterielId) return
    await adminInsert("etincelle_sound_items", { materiel_id: newSoundMaterielId, quantity: newSoundQty })
    setNewSoundMaterielId("")
    setNewSoundQty(1)
    globalMutate("etincelle_sound_items_with_materiel")
  }

  async function updateSoundQty(id: string, quantity: number) {
    if (quantity < 1) return
    await adminUpdate("etincelle_sound_items", { quantity }, { id })
    globalMutate("etincelle_sound_items_with_materiel")
  }

  async function deleteSoundItem(id: string) {
    await adminDelete("etincelle_sound_items", { id })
    globalMutate("etincelle_sound_items_with_materiel")
  }

  async function duplicateCourteToLongue() {
    const shortVersion = sortedVersions.find((v: any) => v.slug === "courte-20min")
    const longVersion = sortedVersions.find((v: any) => v.slug === "longue-30min")
    if (!shortVersion || !longVersion) {
      setCopyStatus({ kind: "error", text: "Versions courte/longue introuvables." })
      return
    }

    setCopying(true)
    setCopyStatus(null)
    try {
      const [{ data: sourceItems, error: sourceErr }, { data: longBackup, error: backupErr }] = await Promise.all([
        supabase
          .from("etincelle_version_items")
          .select("materiel_id, quantity")
          .eq("version_id", shortVersion.id),
        supabase
          .from("etincelle_version_items")
          .select("materiel_id, quantity")
          .eq("version_id", longVersion.id),
      ])

      if (sourceErr) throw new Error(sourceErr.message || "Lecture version courte impossible.")
      if (backupErr) throw new Error(backupErr.message || "Lecture version longue impossible.")

      const delRes = await adminDelete("etincelle_version_items", { version_id: longVersion.id })
      if (delRes.error) throw new Error(delRes.error)

      const rowsToInsert = (sourceItems || []).map((item: any) => ({
        version_id: longVersion.id,
        materiel_id: item.materiel_id,
        quantity: item.quantity,
      }))

      if (rowsToInsert.length > 0) {
        const insertRes = await adminInsert("etincelle_version_items", rowsToInsert)
        if (insertRes.error) {
          const rollbackRows = (longBackup || []).map((item: any) => ({
            version_id: longVersion.id,
            materiel_id: item.materiel_id,
            quantity: item.quantity,
          }))
          if (rollbackRows.length > 0) {
            await adminInsert("etincelle_version_items", rollbackRows)
          }
          throw new Error(insertRes.error)
        }
      }

      setCopyStatus({ kind: "ok", text: "Version longue synchronisee depuis la version courte." })
      globalMutate(`etincelle_version_items_${shortVersion.id}`)
      globalMutate(`etincelle_version_items_${longVersion.id}`)
    } catch (err: any) {
      setCopyStatus({ kind: "error", text: err?.message || "Duplication impossible." })
    } finally {
      setCopying(false)
    }
  }

  function reorderTypeRows(fromId: string, toId: string) {
    if (!fromId || !toId || fromId === toId) return
    setTypeOrderRows((prev) => {
      const fromIndex = prev.findIndex((row) => row.id === fromId)
      const toIndex = prev.findIndex((row) => row.id === toId)
      if (fromIndex < 0 || toIndex < 0) return prev
      const next = [...prev]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return next
    })
    setTypeOrderStatus(null)
  }

  function clearDragState() {
    setDraggingTypeId(null)
    setDragOverTypeId(null)
  }

  function findTypeIdFromTouch(clientX: number, clientY: number): string | null {
    const target = document.elementFromPoint(clientX, clientY)
    const rowEl = target?.closest("[data-type-order-id]") as HTMLElement | null
    return rowEl?.dataset.typeOrderId || null
  }

  function handleTouchMove(event: React.TouchEvent<HTMLButtonElement>) {
    if (!draggingTypeId) return
    const touch = event.touches[0]
    if (!touch) return
    const overId = findTypeIdFromTouch(touch.clientX, touch.clientY)
    if (overId) setDragOverTypeId(overId)
    event.preventDefault()
  }

  function handleTouchEnd() {
    if (draggingTypeId && dragOverTypeId && draggingTypeId !== dragOverTypeId) {
      reorderTypeRows(draggingTypeId, dragOverTypeId)
    }
    clearDragState()
  }

  function handleMouseDrop(targetTypeId: string) {
    if (!draggingTypeId || draggingTypeId === targetTypeId) {
      clearDragState()
      return
    }
    reorderTypeRows(draggingTypeId, targetTypeId)
    clearDragState()
  }

  async function saveEtincelleTypeOrder() {
    if (typeOrderRows.length === 0) return
    setSavingTypeOrder(true)
    setTypeOrderStatus(null)
    try {
      for (let i = 0; i < typeOrderRows.length; i += 1) {
        const row = typeOrderRows[i]
        const res = await adminUpdate("types", { etincelle_sort_order: i }, { id: row.id })
        if (res?.error) {
          if (res.error.includes("etincelle_sort_order")) {
            throw new Error("Colonne etincelle_sort_order absente. Execute le script SQL 026.")
          }
          throw new Error(res.error)
        }
      }
      globalMutate("types|sort_order|asc")
      setTypeOrderStatus({ kind: "ok", text: "Ordre des categories Etincelle enregistre." })
    } catch (err: any) {
      setTypeOrderStatus({ kind: "error", text: err?.message || "Enregistrement impossible." })
    } finally {
      setSavingTypeOrder(false)
    }
  }

  return (
    <div className="p-4">
      <AdminHeader title="Etincelle" onBack={onBack} />

      <section className="rounded-xl border border-border bg-card p-4 mb-4">
        <h2 className="text-sm font-semibold text-foreground mb-1">Ordre categories Etincelle</h2>
        <p className="text-xs text-muted-foreground mb-1">Specifique Etincelle. N'impacte pas l'ordre Pupitre.</p>
        <p className="text-xs text-muted-foreground mb-3">Glisse les lignes via la poignee a gauche pour reordonner.</p>
        <div className="flex flex-col gap-1.5 mb-3">
          {typeOrderRows.map((row, idx) => (
            <div
              key={row.id}
              data-type-order-id={row.id}
              onDragOver={(event) => {
                event.preventDefault()
                if (draggingTypeId && draggingTypeId !== row.id) {
                  setDragOverTypeId(row.id)
                }
              }}
              onDrop={(event) => {
                event.preventDefault()
                handleMouseDrop(row.id)
              }}
              className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 transition-colors ${
                dragOverTypeId === row.id && draggingTypeId !== row.id
                  ? "border-primary bg-primary/10"
                  : "border-border bg-secondary/30"
              }`}
            >
              <button
                type="button"
                draggable
                onDragStart={(event) => {
                  setDraggingTypeId(row.id)
                  setDragOverTypeId(row.id)
                  event.dataTransfer.effectAllowed = "move"
                  event.dataTransfer.setData("text/plain", row.id)
                }}
                onDragEnd={clearDragState}
                onTouchStart={() => {
                  setDraggingTypeId(row.id)
                  setDragOverTypeId(row.id)
                }}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={clearDragState}
                className="rounded p-1 text-muted-foreground hover:text-foreground touch-none"
                aria-label={`Deplacer ${row.name}`}
              >
                <GripVertical className="h-4 w-4" />
              </button>
              <span className="w-6 text-center text-xs text-muted-foreground">{idx + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-foreground">{row.name}</p>
                <p className="text-[11px] text-muted-foreground">Ordre Pupitre: {row.pupitreOrder}</p>
              </div>
            </div>
          ))}
        </div>
        {typeOrderStatus && (
          <p
            className={`mb-3 rounded-lg border px-3 py-2 text-xs ${
              typeOrderStatus.kind === "ok"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : "border-destructive/40 bg-destructive/10 text-destructive"
            }`}
          >
            {typeOrderStatus.text}
          </p>
        )}
        <button
          onClick={saveEtincelleTypeOrder}
          disabled={savingTypeOrder || typeOrderRows.length === 0}
          className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {savingTypeOrder ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer ordre Etincelle"}
        </button>
      </section>

      <section className="rounded-xl border border-border bg-card p-4 mb-4">
        <div className="flex items-center justify-between gap-3 mb-2">
          <h2 className="text-sm font-semibold text-foreground">Versions (acte VERSIONS)</h2>
          <button
            onClick={duplicateCourteToLongue}
            disabled={copying}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary px-2.5 py-1.5 text-xs text-foreground hover:bg-secondary/80 disabled:opacity-60"
          >
            {copying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
            Dupliquer courte vers longue
          </button>
        </div>
        <p className="text-xs text-muted-foreground mb-3">Version longue: base de la courte + materiel supplementaire.</p>
        {copyStatus && (
          <p
            className={`mb-3 rounded-lg border px-3 py-2 text-xs ${
              copyStatus.kind === "ok"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : "border-destructive/40 bg-destructive/10 text-destructive"
            }`}
          >
            {copyStatus.text}
          </p>
        )}

        <div className="flex flex-col gap-3">
          {sortedVersions.map((version: any) => (
            <EtincelleVersionCard
              key={version.id}
              version={version}
              materiel={(materiel as any[]) || []}
              types={sortedTypesForEtincelle}
            />
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4 mb-4">
        <h2 className="text-sm font-semibold text-foreground mb-2">Technique - Sound system</h2>
        <div className="flex gap-2 mb-3">
          <select
            value={newSoundMaterielId}
            onChange={(e) => setNewSoundMaterielId(e.target.value)}
            className="flex-1 rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground"
          >
            <option value="">Materiel...</option>
            {(materiel as any[])?.map((m: any) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            value={newSoundQty}
            onChange={(e) => setNewSoundQty(Math.max(1, Number(e.target.value)))}
            className="w-16 rounded-lg border border-border bg-secondary px-2 py-2 text-sm text-foreground text-center"
          />
          <button
            onClick={addSoundItem}
            disabled={!newSoundMaterielId}
            className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {soundLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {(soundItems as any[])?.map((item: any) => (
              <div key={item.id} className="flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2">
                <span className="flex-1 text-sm text-foreground">{item.materiel?.name || "?"}</span>
                <input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) => updateSoundQty(item.id, Math.max(1, Number(e.target.value)))}
                  className="w-14 rounded border border-border bg-card px-2 py-1 text-xs text-foreground text-center"
                />
                <button
                  onClick={() => deleteSoundItem(item.id)}
                  className="rounded p-1 text-muted-foreground hover:text-destructive transition-colors"
                  aria-label="Supprimer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold text-foreground mb-2">Artistes - liste Etincelle</h2>
        <p className="text-xs text-muted-foreground mb-3">Noms globaux, materiel specifique Etincelle.</p>
        <div className="flex flex-col gap-2">
          {(artists as any[] || []).map((artist: any) => (
            <EtincelleArtistCard key={artist.id} artist={artist} materiel={(materiel as any[]) || []} />
          ))}
        </div>
      </section>
    </div>
  )
}

function EtincelleVersionCard({ version, materiel, types }: { version: any; materiel: any[]; types: any[] }) {
  const { data: items, isLoading } = useEtincelleVersionItems(version.id)
  const [panelOpen, setPanelOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<"categories" | "search">("categories")
  const [expandedTypeId, setExpandedTypeId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [addingMaterielId, setAddingMaterielId] = useState<string | null>(null)
  const [addingTypeId, setAddingTypeId] = useState<string | null>(null)
  const [qtyDrafts, setQtyDrafts] = useState<Record<string, string>>({})

  const existingMaterielIds = useMemo(() => {
    return new Set(((items as any[]) || []).map((item: any) => item.materiel_id))
  }, [items])

  const sortedTypes = useMemo(() => sortTypesForEtincelle(types || []), [types])

  const typeNameById = useMemo(() => {
    const map = new Map<string, string>()
    sortedTypes.forEach((type: any) => {
      map.set(type.id, type.name || "Sans categorie")
    })
    map.set("__none__", "Sans categorie")
    return map
  }, [sortedTypes])

  const materielByType = useMemo(() => {
    const map = new Map<string, any[]>()
    materiel.forEach((m: any) => {
      const key = m.type_id || "__none__"
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(m)
    })
    map.forEach((list) => {
      list.sort((a: any, b: any) => String(a.name || "").localeCompare(String(b.name || ""), "fr"))
    })
    return map
  }, [materiel])

  const typeSections = useMemo(() => {
    const sections: Array<{ id: string; name: string; items: any[] }> = []
    sortedTypes.forEach((type: any) => {
      const list = materielByType.get(type.id) || []
      if (list.length > 0) {
        sections.push({ id: type.id, name: type.name || "Sans categorie", items: list })
      }
    })
    const uncategorized = materielByType.get("__none__") || []
    if (uncategorized.length > 0) {
      sections.push({ id: "__none__", name: "Sans categorie", items: uncategorized })
    }
    return sections
  }, [materielByType, sortedTypes])

  const searchResults = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase()
    if (!normalized) return []
    return materiel
      .filter((m: any) => {
        const itemName = String(m.name || "").toLowerCase()
        const typeName = String(typeNameById.get(m.type_id || "__none__") || "").toLowerCase()
        return itemName.includes(normalized) || typeName.includes(normalized)
      })
      .sort((a: any, b: any) => {
        const aName = String(a.name || "").toLowerCase()
        const bName = String(b.name || "").toLowerCase()
        const aStarts = aName.startsWith(normalized) ? 0 : 1
        const bStarts = bName.startsWith(normalized) ? 0 : 1
        if (aStarts !== bStarts) return aStarts - bStarts
        return aName.localeCompare(bName, "fr")
      })
      .slice(0, 80)
  }, [materiel, searchTerm, typeNameById])

  const sortedItems = useMemo(() => {
    const list = [...(((items as any[]) || []) as any[])]
    list.sort((a: any, b: any) => {
      const byCreated = String(a.created_at || "").localeCompare(String(b.created_at || ""))
      if (byCreated !== 0) return byCreated
      return String(a.id || "").localeCompare(String(b.id || ""))
    })
    return list
  }, [items])

  async function addSingleItem(materielId: string) {
    if (!materielId || existingMaterielIds.has(materielId)) return
    setAddingMaterielId(materielId)
    try {
      await adminInsert("etincelle_version_items", {
        version_id: version.id,
        materiel_id: materielId,
        quantity: 1,
      })
      globalMutate(`etincelle_version_items_${version.id}`)
    } finally {
      setAddingMaterielId(null)
    }
  }

  async function addWholeCategory(typeId: string) {
    const source = materielByType.get(typeId) || []
    const rows = source
      .filter((m: any) => !existingMaterielIds.has(m.id))
      .map((m: any) => ({
        version_id: version.id,
        materiel_id: m.id,
        quantity: 1,
      }))
    if (rows.length === 0) return
    setAddingTypeId(typeId)
    try {
      await adminInsert("etincelle_version_items", rows)
      globalMutate(`etincelle_version_items_${version.id}`)
    } finally {
      setAddingTypeId(null)
    }
  }

  async function updateQty(id: string, quantity: number) {
    if (quantity < 1) return
    await adminUpdate("etincelle_version_items", { quantity }, { id })
    globalMutate(`etincelle_version_items_${version.id}`)
  }

  async function commitQtyChange(id: string, currentQty: number) {
    const draft = qtyDrafts[id]
    if (draft === undefined) return
    const parsed = Math.max(1, Number(draft))
    const nextQty = Number.isFinite(parsed) ? parsed : 1

    if (nextQty === currentQty) {
      setQtyDrafts((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      return
    }

    try {
      await updateQty(id, nextQty)
    } finally {
      setQtyDrafts((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
    }
  }

  async function deleteItem(id: string) {
    await adminDelete("etincelle_version_items", { id })
    globalMutate(`etincelle_version_items_${version.id}`)
  }

  return (
    <div className="rounded-lg border border-border bg-secondary/30 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-foreground">{version.name}</span>
        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          <ArrowRightLeft className="h-3 w-3" />
          {version.slug}
        </span>
      </div>

      <div className="mb-2">
        <button
          onClick={() => setPanelOpen((prev) => !prev)}
          className="flex w-full items-center justify-between rounded border border-border bg-card px-2 py-2 text-left text-xs text-foreground hover:bg-secondary/40"
        >
          <span className="font-medium">Ajouter du materiel</span>
          {panelOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>

        {panelOpen && (
          <div className="mt-2 rounded border border-border bg-card/80 p-2">
            <div className="mb-2 grid grid-cols-2 gap-1 rounded border border-border bg-secondary/40 p-1">
              <button
                onClick={() => setActiveTab("categories")}
                className={`rounded px-2 py-1 text-[11px] font-medium transition-colors ${
                  activeTab === "categories"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Categories
              </button>
              <button
                onClick={() => setActiveTab("search")}
                className={`rounded px-2 py-1 text-[11px] font-medium transition-colors ${
                  activeTab === "search"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Recherche
              </button>
            </div>

            {activeTab === "categories" ? (
              <div className="flex flex-col gap-1.5">
                {typeSections.map((section) => {
                  const total = section.items.length
                  const alreadyAdded = section.items.filter((m: any) => existingMaterielIds.has(m.id)).length
                  const isExpanded = expandedTypeId === section.id
                  return (
                    <div key={section.id} className="rounded border border-border/70 bg-secondary/25">
                      <div className="flex items-center gap-1 p-1.5">
                        <button
                          onClick={() => setExpandedTypeId((prev) => (prev === section.id ? null : section.id))}
                          className="flex flex-1 items-center justify-between rounded px-1.5 py-1 text-left text-xs text-foreground hover:bg-card/70"
                        >
                          <span className="font-medium">{section.name}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {alreadyAdded}/{total}
                          </span>
                        </button>
                        <button
                          onClick={() => addWholeCategory(section.id)}
                          disabled={alreadyAdded === total || addingTypeId === section.id}
                          className="rounded border border-border bg-card px-2 py-1 text-[11px] text-foreground hover:bg-secondary disabled:opacity-50"
                        >
                          {addingTypeId === section.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            "Tout ajouter"
                          )}
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-border/60 p-1.5">
                          <div className="flex flex-col gap-1">
                            {section.items.map((m: any) => {
                              const already = existingMaterielIds.has(m.id)
                              const isAdding = addingMaterielId === m.id
                              return (
                                <div
                                  key={m.id}
                                  className="flex items-center gap-2 rounded border border-border/60 bg-card/70 px-2 py-1.5"
                                >
                                  <span className="flex-1 text-xs text-foreground">{m.name}</span>
                                  {already ? (
                                    <span className="rounded border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                                      Deja ajoute
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => addSingleItem(m.id)}
                                      disabled={isAdding}
                                      className="rounded border border-border bg-secondary px-2 py-1 text-[11px] text-foreground hover:bg-secondary/70 disabled:opacity-50"
                                    >
                                      {isAdding ? <Loader2 className="h-3 w-3 animate-spin" /> : "Ajouter"}
                                    </button>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div>
                <div className="mb-2 flex items-center gap-2 rounded border border-border bg-secondary/25 px-2 py-1.5">
                  <Search className="h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Rechercher un materiel ou categorie..."
                    className="w-full bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
                  />
                </div>
                {!searchTerm.trim() ? (
                  <p className="px-1 py-1 text-[11px] text-muted-foreground">
                    Tape un nom pour ajouter rapidement sans parcourir toute la liste.
                  </p>
                ) : searchResults.length === 0 ? (
                  <p className="px-1 py-1 text-[11px] text-muted-foreground">Aucun resultat.</p>
                ) : (
                  <div className="max-h-56 overflow-y-auto pr-0.5">
                    <div className="flex flex-col gap-1">
                      {searchResults.map((m: any) => {
                        const already = existingMaterielIds.has(m.id)
                        const isAdding = addingMaterielId === m.id
                        return (
                          <div
                            key={m.id}
                            className="flex items-center gap-2 rounded border border-border/60 bg-card/70 px-2 py-1.5"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs text-foreground">{m.name}</p>
                              <p className="truncate text-[10px] text-muted-foreground">
                                {typeNameById.get(m.type_id || "__none__")}
                              </p>
                            </div>
                            {already ? (
                              <span className="rounded border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                                Deja ajoute
                              </span>
                            ) : (
                              <button
                                onClick={() => addSingleItem(m.id)}
                                disabled={isAdding}
                                className="rounded border border-border bg-secondary px-2 py-1 text-[11px] text-foreground hover:bg-secondary/70 disabled:opacity-50"
                              >
                                {isAdding ? <Loader2 className="h-3 w-3 animate-spin" /> : "Ajouter"}
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-3">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {sortedItems.map((item: any) => (
            <div key={item.id} className="flex items-center gap-2 rounded bg-card px-2 py-1.5">
              <span className="flex-1 text-xs text-foreground">{item.materiel?.name || "?"}</span>
              <input
                type="number"
                min={1}
                value={qtyDrafts[item.id] ?? String(item.quantity)}
                onChange={(e) => {
                  setQtyDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))
                }}
                onBlur={() => {
                  commitQtyChange(item.id, Number(item.quantity) || 1)
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    ;(e.currentTarget as HTMLInputElement).blur()
                  }
                }}
                className="w-12 rounded border border-border bg-secondary px-1.5 py-1 text-xs text-foreground text-center"
              />
              <button
                onClick={() => deleteItem(item.id)}
                className="rounded p-1 text-muted-foreground hover:text-destructive transition-colors"
                aria-label="Supprimer"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function EtincelleArtistCard({ artist, materiel }: { artist: any; materiel: any[] }) {
  const { data: items, isLoading } = useEtincelleArtistItems(artist.id)
  const [newMaterielId, setNewMaterielId] = useState("")
  const [newQty, setNewQty] = useState(1)

  async function addItem() {
    if (!newMaterielId) return
    await adminInsert("etincelle_artist_items", {
      artist_id: artist.id,
      materiel_id: newMaterielId,
      qty: newQty,
    })
    setNewMaterielId("")
    setNewQty(1)
    globalMutate(`etincelle_artist_items_${artist.id}`)
  }

  async function updateQty(id: string, qty: number) {
    if (qty < 1) return
    await adminUpdate("etincelle_artist_items", { qty }, { id })
    globalMutate(`etincelle_artist_items_${artist.id}`)
  }

  async function deleteItem(id: string) {
    await adminDelete("etincelle_artist_items", { id })
    globalMutate(`etincelle_artist_items_${artist.id}`)
  }

  return (
    <div className="rounded-lg border border-border bg-secondary/30 p-3">
      <h3 className="text-sm font-semibold text-foreground mb-2">{artist.name}</h3>
      <div className="flex gap-2 mb-2">
        <select
          value={newMaterielId}
          onChange={(e) => setNewMaterielId(e.target.value)}
          className="flex-1 rounded border border-border bg-card px-2 py-1.5 text-xs text-foreground"
        >
          <option value="">Ajouter materiel...</option>
          {materiel.map((m: any) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
        <input
          type="number"
          min={1}
          value={newQty}
          onChange={(e) => setNewQty(Math.max(1, Number(e.target.value)))}
          className="w-14 rounded border border-border bg-card px-2 py-1.5 text-xs text-foreground text-center"
        />
        <button
          onClick={addItem}
          disabled={!newMaterielId}
          className="rounded bg-primary px-2 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-3">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {(items as any[])?.map((item: any) => (
            <div key={item.id} className="flex items-center gap-2 rounded bg-card px-2 py-1.5">
              <span className="flex-1 text-xs text-foreground">{item.materiel?.name || "?"}</span>
              <input
                type="number"
                min={1}
                value={item.qty}
                onChange={(e) => updateQty(item.id, Math.max(1, Number(e.target.value)))}
                className="w-12 rounded border border-border bg-secondary px-1.5 py-1 text-xs text-foreground text-center"
              />
              <button
                onClick={() => deleteItem(item.id)}
                className="rounded p-1 text-muted-foreground hover:text-destructive transition-colors"
                aria-label="Supprimer"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
