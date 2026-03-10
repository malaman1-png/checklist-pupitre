"use client"

import { useState, useEffect } from "react"
import {
  useSettings,
  useSonItems,
  useLightItems,
  useFixedActs,
  useModularActs,
  useMateriel,
  useDisplayOrder,
  globalMutate,
  supabase,
} from "@/lib/hooks"
import { adminUpdate, adminInsert, adminDelete, adminDeleteAll } from "@/lib/admin-api"
import { AdminHeader } from "./admin-header"
import { ChevronUp, ChevronDown, Plus, Trash2, Check } from "lucide-react"

interface AdminKitchenProps {
  onBack: () => void
}

export function AdminKitchen({ onBack }: AdminKitchenProps) {
  const { data: settings } = useSettings()
  const { data: sonItems } = useSonItems()
  const { data: lightItems } = useLightItems()
  const { data: fixedActs } = useFixedActs()
  const { data: modularActs } = useModularActs()
  const { data: materiel } = useMateriel()
  const { data: displayOrder } = useDisplayOrder()
  const materielList = (materiel as any[]) || []

  // Load ALL act items (we'll filter by act later)
  // Source de vérité: fixed_act_items table (fixed_act_id, materiel_id, quantity)
  const [allFixedActItems, setAllFixedActItems] = useState<any[]>([])
  // Source de vérité: modular_act_variants table (modular_act_id, materiel_id, quantity)
  const [allModularActItems, setAllModularActItems] = useState<any[]>([])

  useEffect(() => {
    async function loadAllActItems() {
      const { data: fixedItems } = await supabase
        .from("fixed_act_items")
        .select("*, materiel(*)")
      const { data: modularItems } = await supabase
        .from("modular_act_variants")
        .select("*, materiel(*)")
      setAllFixedActItems(fixedItems || [])
      setAllModularActItems(modularItems || [])

      // Load all versions + their items
      const { data: allVersions } = await supabase
        .from("act_versions")
        .select("*")
        .order("sort_order")
      if (allVersions && allVersions.length > 0) {
        const grouped: Record<string, any[]> = {}
        for (const v of allVersions) {
          const key = `${v.act_type}:${v.act_id}`
          if (!grouped[key]) grouped[key] = []
          grouped[key].push(v)
        }
        setActVersions(grouped)

        const { data: allVItems } = await supabase
          .from("act_version_items")
          .select("*, materiel(*)")
        const vItemsGrouped: Record<string, any[]> = {}
        for (const item of allVItems || []) {
          if (!vItemsGrouped[item.version_id]) vItemsGrouped[item.version_id] = []
          vItemsGrouped[item.version_id].push(item)
        }
        setVersionItems(vItemsGrouped)
      }
    }
    loadAllActItems()
  }, [])

  const labelSon = (settings as any)?.label_son || "SON"
  const labelLight = (settings as any)?.label_light || "LIGHT"

  // Local state for inline editing
  const [editingSonLabel, setEditingSonLabel] = useState(false)
  const [editingLightLabel, setEditingLightLabel] = useState(false)
  const [sonLabelDraft, setSonLabelDraft] = useState(labelSon)
  const [lightLabelDraft, setLightLabelDraft] = useState(labelLight)

  // Material selection for SON
  const [sonNewMatId, setSonNewMatId] = useState("")
  const [sonNewQty, setSonNewQty] = useState(1)

  // Material selection for LIGHT
  const [lightNewMatId, setLightNewMatId] = useState("")
  const [lightNewQty, setLightNewQty] = useState(1)

  // Acts order (fixed + modular combined)
  type ActItem = { type: "fixed" | "modular"; id: string; name: string; order: number }
  const [acts, setActs] = useState<ActItem[]>([])
  const [editingAct, setEditingAct] = useState<string | null>(null)
  const [actNameDraft, setActNameDraft] = useState("")

  // New act creation
  const [newActName, setNewActName] = useState("")
  const [newActType, setNewActType] = useState<"fixed" | "modular">("fixed")

  // Material selection for acts
  const [actMatSelection, setActMatSelection] = useState<{ actType: string; actId: string; matId: string; qty: number } | null>(null)

  // Versions management
  const [expandedActVersions, setExpandedActVersions] = useState<string | null>(null)
  const [actVersions, setActVersions] = useState<Record<string, any[]>>({})
  const [versionItems, setVersionItems] = useState<Record<string, any[]>>({})
  const [newVersionName, setNewVersionName] = useState("")
  const [editingVersion, setEditingVersion] = useState<string | null>(null)
  const [versionNameDraft, setVersionNameDraft] = useState("")
  const [versionMatSelection, setVersionMatSelection] = useState<{ versionId: string; matId: string; qty: number } | null>(null)
  const [kitchenError, setKitchenError] = useState<string | null>(null)

  // Rebuild acts list when data changes
  useEffect(() => {
    if (!fixedActs || !modularActs || !displayOrder) return

    const orderMap: Record<string, number> = {}
    for (const d of displayOrder as any[]) {
      orderMap[d.item_key] = d.sort_order
    }

    const combined: ActItem[] = []
    for (const fa of fixedActs as any[]) {
      combined.push({
        type: "fixed",
        id: fa.id,
        name: fa.name,
        order: orderMap[`fixed:${fa.id}`] ?? 999,
      })
    }
    for (const ma of modularActs as any[]) {
      combined.push({
        type: "modular",
        id: ma.id,
        name: ma.name,
        order: orderMap[`modular:${ma.id}`] ?? 999,
      })
    }
    combined.sort((a, b) => a.order - b.order)
    setActs(combined)
  }, [fixedActs, modularActs, displayOrder])

  // Save SON label
  async function saveSonLabel() {
    if (!settings) return
    await adminUpdate("settings", { label_son: sonLabelDraft.trim() || "SON" }, { id: (settings as any).id })
    globalMutate("settings_singleton")
    setEditingSonLabel(false)
  }

  // Save LIGHT label
  async function saveLightLabel() {
    if (!settings) return
    await adminUpdate("settings", { label_light: lightLabelDraft.trim() || "LIGHT" }, { id: (settings as any).id })
    globalMutate("settings_singleton")
    setEditingLightLabel(false)
  }

  // Add SON material
  async function addSonMaterial() {
    if (!sonNewMatId) return
    await adminInsert("son_items", { materiel_id: sonNewMatId, quantity: sonNewQty })
    globalMutate("son_items")
    setSonNewMatId("")
    setSonNewQty(1)
  }

  // Delete SON material
  async function deleteSonMaterial(id: string) {
    await adminDelete("son_items", { id })
    globalMutate("son_items")
  }

  // Update SON material quantity
  async function updateSonQty(id: string, qty: number) {
    await adminUpdate("son_items", { quantity: qty }, { id })
    globalMutate("son_items")
  }

  // Add LIGHT material
  async function addLightMaterial() {
    if (!lightNewMatId) return
    await adminInsert("light_items", { materiel_id: lightNewMatId, quantity: lightNewQty })
    globalMutate("light_items")
    setLightNewMatId("")
    setLightNewQty(1)
  }

  // Delete LIGHT material
  async function deleteLightMaterial(id: string) {
    await adminDelete("light_items", { id })
    globalMutate("light_items")
  }

  // Update LIGHT material quantity
  async function updateLightQty(id: string, qty: number) {
    await adminUpdate("light_items", { quantity: qty }, { id })
    globalMutate("light_items")
  }

  // Move act up/down
  async function moveAct(index: number, direction: "up" | "down") {
    const newActs = [...acts]
    const targetIndex = direction === "up" ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= newActs.length) return
    ;[newActs[index], newActs[targetIndex]] = [newActs[targetIndex], newActs[index]]
    setActs(newActs)

    // Save order to DB
    await adminDeleteAll("display_order")
    const rows = [
      { item_key: "system:son", sort_order: -2 },
      { item_key: "system:light", sort_order: -1 },
      ...newActs.map((act, idx) => ({
        item_key: `${act.type}:${act.id}`,
        sort_order: idx,
      })),
    ]
    await adminInsert("display_order", rows)
    globalMutate("display_order")
  }

  // Start editing act
  function startEditAct(act: ActItem) {
    setEditingAct(act.id)
    setActNameDraft(act.name)
  }

  // Save act edits
  async function saveActEdit(act: ActItem) {
    const table = act.type === "fixed" ? "fixed_acts" : "modular_acts"
    await adminUpdate(table, { name: actNameDraft.trim() }, { id: act.id })
    globalMutate(act.type === "fixed" ? "fixed_acts" : "modular_acts")
    setEditingAct(null)
  }

  // Add new act
  async function addAct() {
    if (!newActName.trim()) return
    const table = newActType === "fixed" ? "fixed_acts" : "modular_acts"
    await adminInsert(table, { name: newActName.trim() })
    // Force reload from DB
    if (newActType === "fixed") {
      const { data } = await supabase.from("fixed_acts").select("*")
      globalMutate("fixed_acts|name|asc", data)
    } else {
      const { data } = await supabase.from("modular_acts").select("*")
      globalMutate("modular_acts|name|asc", data)
    }
    setNewActName("")
  }

  // Toggle act type (fixed <-> modular)
  async function toggleActType(act: ActItem) {
    if (!confirm(`Basculer l'acte "${act.name}" de ${act.type === "fixed" ? "fixe" : "modulable"} a ${act.type === "fixed" ? "modulable" : "fixe"} ?`)) return

    // 1. Get all materials for this act
    const materials = getActMaterials(act)

    // 2. Create new act in target table via admin API (bypasses RLS)
    const targetTable = act.type === "fixed" ? "modular_acts" : "fixed_acts"
    await adminInsert(targetTable, { name: act.name })

    // 3. Read back the newly created act to get its ID
    const { data: allNewActs } = await supabase
      .from(targetTable)
      .select("*")
      .eq("name", act.name)
      .order("created_at", { ascending: false })
      .limit(1)
    
    const newAct = allNewActs?.[0]
    if (!newAct) {
      alert("Erreur lors de la creation du nouvel acte")
      return
    }

    // 4. Copy all materials to target table
    const targetItemsTable = act.type === "fixed" ? "modular_act_variants" : "fixed_act_items"
    const targetIdField = act.type === "fixed" ? "modular_act_id" : "fixed_act_id"
    
    for (const mat of materials) {
      await adminInsert(targetItemsTable, {
        [targetIdField]: newAct.id,
        materiel_id: mat.materiel_id,
        quantity: mat.quantity,
      })
    }

    // 5. Copy versions too
    const oldVersions = actVersions[`${act.type}:${act.id}`] || []
    for (const v of oldVersions) {
      await adminInsert("act_versions", {
        act_type: act.type === "fixed" ? "modular" : "fixed",
        act_id: newAct.id,
        name: v.name,
        slug: v.slug,
        sort_order: v.sort_order,
      })
      // Get the new version ID
      const { data: newVers } = await supabase
        .from("act_versions")
        .select("*")
        .eq("act_id", newAct.id)
        .eq("slug", v.slug)
        .limit(1)
      const newVer = newVers?.[0]
      if (newVer) {
        const oldItems = versionItems[v.id] || []
        for (const item of oldItems) {
          await adminInsert("act_version_items", {
            version_id: newVer.id,
            materiel_id: item.materiel_id,
            quantity: item.quantity,
          })
        }
      }
      // Delete old version items + version
      await adminDelete("act_version_items", { version_id: v.id })
      await adminDelete("act_versions", { id: v.id })
    }

    // 6. Update display_order to keep the same position
    const { data: currentOrder } = await supabase.from("display_order").select("*")
    const updatedOrder = (currentOrder || []).map((row: any) => {
      if (row.item_key === `${act.type}:${act.id}`) {
        return { ...row, item_key: `${act.type === "fixed" ? "modular" : "fixed"}:${newAct.id}` }
      }
      return row
    })
    await adminDeleteAll("display_order")
    await adminInsert("display_order", updatedOrder)

    // 7. Delete old act and items
    if (act.type === "fixed") {
      await adminDelete("fixed_act_items", { fixed_act_id: act.id })
      await adminDelete("fixed_acts", { id: act.id })
    } else {
      await adminDelete("modular_act_variants", { modular_act_id: act.id })
      await adminDelete("modular_acts", { id: act.id })
    }

    // 8. Force reload all data from DB
    const { data: freshFixed } = await supabase.from("fixed_acts").select("*")
    globalMutate("fixed_acts|name|asc", freshFixed)
    const { data: freshModular } = await supabase.from("modular_acts").select("*")
    globalMutate("modular_acts|name|asc", freshModular)
    const { data: freshOrder } = await supabase.from("display_order").select("*")
    globalMutate("display_order", freshOrder)
    const { data: fixedItems } = await supabase.from("fixed_act_items").select("*, materiel(*)")
    const { data: modularItems } = await supabase.from("modular_act_variants").select("*, materiel(*)")
    setAllFixedActItems(fixedItems || [])
    setAllModularActItems(modularItems || [])
    // Reload versions
    const { data: allVersions } = await supabase.from("act_versions").select("*").order("sort_order")
    if (allVersions) {
      const grouped: Record<string, any[]> = {}
      for (const v of allVersions) {
        const key = `${v.act_type}:${v.act_id}`
        if (!grouped[key]) grouped[key] = []
        grouped[key].push(v)
      }
      setActVersions(grouped)
    }
  }

  // Delete act
  async function deleteAct(act: ActItem) {
    if (!confirm(`Supprimer l'acte "${act.name}" ?`)) return
    if (act.type === "fixed") {
      await adminDelete("fixed_act_items", { fixed_act_id: act.id })
      await adminDelete("fixed_acts", { id: act.id })
      // Also delete associated versions + version items
      const versions = actVersions[`fixed:${act.id}`] || []
      for (const v of versions) {
        await adminDelete("act_version_items", { version_id: v.id })
        await adminDelete("act_versions", { id: v.id })
      }
      // Reload from DB to ensure UI reflects actual state
      const { data: freshFixed } = await supabase.from("fixed_acts").select("*")
      globalMutate("fixed_acts|name|asc", freshFixed)
      const { data: freshItems } = await supabase.from("fixed_act_items").select("*, materiel(*)")
      setAllFixedActItems(freshItems || [])
    } else {
      await adminDelete("modular_act_variants", { modular_act_id: act.id })
      await adminDelete("modular_acts", { id: act.id })
      const versions = actVersions[`modular:${act.id}`] || []
      for (const v of versions) {
        await adminDelete("act_version_items", { version_id: v.id })
        await adminDelete("act_versions", { id: v.id })
      }
      const { data: freshModular } = await supabase.from("modular_acts").select("*")
      globalMutate("modular_acts|name|asc", freshModular)
      const { data: freshItems } = await supabase.from("modular_act_variants").select("*, materiel(*)")
      setAllModularActItems(freshItems || [])
    }
  }

  // Add material to act
  async function addActMaterial(act: ActItem) {
    if (!actMatSelection || !actMatSelection.matId) return
    if (act.type === "fixed") {
      await adminInsert("fixed_act_items", {
        fixed_act_id: act.id,
        materiel_id: actMatSelection.matId,
        quantity: actMatSelection.qty,
      })
      // Reload items
      const { data } = await supabase.from("fixed_act_items").select("*, materiel(*)")
      setAllFixedActItems(data || [])
    } else {
      await adminInsert("modular_act_variants", {
        modular_act_id: act.id,
        materiel_id: actMatSelection.matId,
        quantity: actMatSelection.qty,
      })
      // Reload items
      const { data } = await supabase.from("modular_act_variants").select("*, materiel(*)")
      setAllModularActItems(data || [])
    }
    setActMatSelection(null)
  }

  // Delete material from act
  async function deleteActMaterial(act: ActItem, itemId: string) {
    if (act.type === "fixed") {
      await adminDelete("fixed_act_items", { id: itemId })
      const { data } = await supabase.from("fixed_act_items").select("*, materiel(*)")
      setAllFixedActItems(data || [])
    } else {
      await adminDelete("modular_act_variants", { id: itemId })
      const { data } = await supabase.from("modular_act_variants").select("*, materiel(*)")
      setAllModularActItems(data || [])
    }
  }

  // Update material quantity for act
  async function updateActMaterialQty(act: ActItem, itemId: string, qty: number) {
    if (act.type === "fixed") {
      await adminUpdate("fixed_act_items", { quantity: qty }, { id: itemId })
      const { data } = await supabase.from("fixed_act_items").select("*, materiel(*)")
      setAllFixedActItems(data || [])
    } else {
      await adminUpdate("modular_act_variants", { quantity: qty }, { id: itemId })
      const { data } = await supabase.from("modular_act_variants").select("*, materiel(*)")
      setAllModularActItems(data || [])
    }
  }

  // Get materials for act
  function getActMaterials(act: ActItem) {
    if (act.type === "fixed") {
      return allFixedActItems.filter((item: any) => item.fixed_act_id === act.id)
    } else {
      return allModularActItems.filter((item: any) => item.modular_act_id === act.id)
    }
  }

  // Load versions for an act
  async function loadVersions(act: ActItem) {
    const { data } = await supabase
      .from("act_versions")
      .select("*")
      .eq("act_type", act.type)
      .eq("act_id", act.id)
      .order("sort_order")
    const key = `${act.type}:${act.id}`
    setActVersions((prev) => ({ ...prev, [key]: data || [] }))
    
    // Load items for each version
    for (const version of data || []) {
      const { data: items } = await supabase
        .from("act_version_items")
        .select("*, materiel(*)")
        .eq("version_id", version.id)
      setVersionItems((prev) => ({ ...prev, [version.id]: items || [] }))
    }
  }

  // Toggle versions panel
  async function toggleVersionsPanel(act: ActItem) {
    const key = `${act.type}:${act.id}`
    if (expandedActVersions === key) {
      setExpandedActVersions(null)
    } else {
      setExpandedActVersions(key)
      await loadVersions(act)
    }
  }

  // Add new version
  async function addVersion(act: ActItem) {
    if (!newVersionName.trim()) return
    setKitchenError(null)
    const slug = newVersionName.trim().toLowerCase().replace(/\s+/g, "-")
    const key = `${act.type}:${act.id}`
    const existingVersions = actVersions[key] || []
    const res = await adminInsert("act_versions", {
      act_type: act.type,
      act_id: act.id,
      name: newVersionName.trim(),
      slug,
      sort_order: existingVersions.length,
    })
    if (res.error) {
      setKitchenError(`Erreur ajout version: ${res.error}`)
      return
    }
    setNewVersionName("")
    await loadVersions(act)
  }

  // Delete version
  async function deleteVersion(act: ActItem, versionId: string) {
    if (!confirm("Supprimer cette version ?")) return
    await adminDelete("act_version_items", { version_id: versionId })
    await adminDelete("act_versions", { id: versionId })
    await loadVersions(act)
  }

  // Save version name edit
  async function saveVersionEdit(act: ActItem, versionId: string) {
    const slug = versionNameDraft.trim().toLowerCase().replace(/\s+/g, "-")
    await adminUpdate("act_versions", { name: versionNameDraft.trim(), slug }, { id: versionId })
    setEditingVersion(null)
    await loadVersions(act)
  }

  // Add material to version
  async function addVersionMaterial() {
    if (!versionMatSelection || !versionMatSelection.matId) return
    setKitchenError(null)
    const res = await adminInsert("act_version_items", {
      version_id: versionMatSelection.versionId,
      materiel_id: versionMatSelection.matId,
      quantity: versionMatSelection.qty,
    })
    if (res.error) {
      setKitchenError(`Erreur ajout materiel version: ${res.error}`)
      return
    }
    const { data } = await supabase
      .from("act_version_items")
      .select("*, materiel(*)")
      .eq("version_id", versionMatSelection.versionId)
    setVersionItems((prev) => ({ ...prev, [versionMatSelection.versionId]: data || [] }))
    setVersionMatSelection(null)
  }

  // Delete material from version
  async function deleteVersionMaterial(versionId: string, itemId: string) {
    await adminDelete("act_version_items", { id: itemId })
    const { data } = await supabase
      .from("act_version_items")
      .select("*, materiel(*)")
      .eq("version_id", versionId)
    setVersionItems((prev) => ({ ...prev, [versionId]: data || [] }))
  }

  // Update version material quantity
  async function updateVersionMaterialQty(versionId: string, itemId: string, qty: number) {
    await adminUpdate("act_version_items", { quantity: qty }, { id: itemId })
    const { data } = await supabase
      .from("act_version_items")
      .select("*, materiel(*)")
      .eq("version_id", versionId)
    setVersionItems((prev) => ({ ...prev, [versionId]: data || [] }))
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      <div className="px-4 pt-4">
        <AdminHeader title="La cuisine" onBack={onBack} />
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col gap-6 max-w-4xl mx-auto">
          {/* Error banner */}
          {kitchenError && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center justify-between">
              <span>{kitchenError}</span>
              <button onClick={() => setKitchenError(null)} className="text-destructive hover:text-destructive/80 font-bold ml-2">X</button>
            </div>
          )}
          {/* Technique section */}
          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Technique</h2>

            {/* SON */}
            <div className="mb-6 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-medium text-muted-foreground">Nom :</span>
                {editingSonLabel ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="text"
                      value={sonLabelDraft}
                      onChange={(e) => setSonLabelDraft(e.target.value)}
                      className="flex-1 rounded border border-border bg-background px-2 py-1 text-sm"
                      autoFocus
                    />
                    <button
                      onClick={saveSonLabel}
                      className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground hover:bg-primary/90"
                    >
                      <Check className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setEditingSonLabel(true)
                      setSonLabelDraft(labelSon)
                    }}
                    className="text-sm font-semibold text-blue-600 hover:underline"
                  >
                    {labelSon}
                  </button>
                )}
              </div>

              {/* SON Materials */}
              <div className="space-y-2">
                {(sonItems as any[])?.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-2 rounded bg-background/50 px-2 py-1.5">
                    <span className="flex-1 min-w-0 text-sm text-foreground truncate">
                      {materielList.find((m: any) => m.id === item.materiel_id)?.name || "?"}
                    </span>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateSonQty(item.id, parseInt(e.target.value) || 1)}
                      className="w-16 flex-shrink-0 rounded border border-border bg-background px-2 py-1 text-xs text-center"
                      min={1}
                    />
                    <button
                      onClick={() => deleteSonMaterial(item.id)}
                      className="rounded p-1 text-destructive hover:bg-destructive/10 flex-shrink-0"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={sonNewMatId}
                    onChange={(e) => setSonNewMatId(e.target.value)}
                    className="min-w-0 flex-1 basis-full sm:basis-0 rounded border border-border bg-background px-2 py-1 text-sm"
                  >
                    <option value="">-- Ajouter materiel --</option>
                    {(materiel as any[])?.map((m: any) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={sonNewQty}
                    onChange={(e) => setSonNewQty(parseInt(e.target.value) || 1)}
                    className="w-16 shrink-0 rounded border border-border bg-background px-2 py-1 text-xs text-center"
                    min={1}
                  />
                  <button
                    onClick={addSonMaterial}
                    className="shrink-0 rounded bg-primary px-2 py-1 text-xs text-primary-foreground hover:bg-primary/90"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* LIGHT */}
            <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-medium text-muted-foreground">Nom :</span>
                {editingLightLabel ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="text"
                      value={lightLabelDraft}
                      onChange={(e) => setLightLabelDraft(e.target.value)}
                      className="flex-1 rounded border border-border bg-background px-2 py-1 text-sm"
                      autoFocus
                    />
                    <button
                      onClick={saveLightLabel}
                      className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground hover:bg-primary/90"
                    >
                      <Check className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setEditingLightLabel(true)
                      setLightLabelDraft(labelLight)
                    }}
                    className="text-sm font-semibold text-amber-600 hover:underline"
                  >
                    {labelLight}
                  </button>
                )}
              </div>

              {/* LIGHT Materials */}
              <div className="space-y-2">
                {(lightItems as any[])?.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-2 rounded bg-background/50 px-2 py-1.5">
                    <span className="flex-1 min-w-0 text-sm text-foreground truncate">
                      {materielList.find((m: any) => m.id === item.materiel_id)?.name || "?"}
                    </span>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateLightQty(item.id, parseInt(e.target.value) || 1)}
                      className="w-16 flex-shrink-0 rounded border border-border bg-background px-2 py-1 text-xs text-center"
                      min={1}
                    />
                    <button
                      onClick={() => deleteLightMaterial(item.id)}
                      className="rounded p-1 text-destructive hover:bg-destructive/10 flex-shrink-0"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={lightNewMatId}
                    onChange={(e) => setLightNewMatId(e.target.value)}
                    className="min-w-0 flex-1 basis-full sm:basis-0 rounded border border-border bg-background px-2 py-1 text-sm"
                  >
                    <option value="">-- Ajouter materiel --</option>
                    {(materiel as any[])?.map((m: any) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={lightNewQty}
                    onChange={(e) => setLightNewQty(parseInt(e.target.value) || 1)}
                    className="w-16 shrink-0 rounded border border-border bg-background px-2 py-1 text-xs text-center"
                    min={1}
                  />
                  <button
                    onClick={addLightMaterial}
                    className="shrink-0 rounded bg-primary px-2 py-1 text-xs text-primary-foreground hover:bg-primary/90"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Acts section */}
          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Actes</h2>
            <div className="space-y-3">
              {acts.map((act, index) => {
                const actMats = getActMaterials(act)
                const isEditing = editingAct === act.id
                const actKey = `${act.type}:${act.id}`
                const versions = actVersions[actKey] || []
                const hasVersions = versions.length > 0
                return (
                  <div key={`${act.type}:${act.id}`} className="rounded-lg border border-border bg-background p-3">
                    {/* Row 1: arrows + name/edit + type badge */}
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex flex-col gap-1 flex-shrink-0">
                        <button
                          onClick={() => moveAct(index, "up")}
                          disabled={index === 0}
                          className="rounded p-0.5 hover:bg-secondary disabled:opacity-30"
                        >
                          <ChevronUp className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => moveAct(index, "down")}
                          disabled={index === acts.length - 1}
                          className="rounded p-0.5 hover:bg-secondary disabled:opacity-30"
                        >
                          <ChevronDown className="h-3 w-3" />
                        </button>
                      </div>

                      {isEditing ? (
                        <div className="flex-1 min-w-0 flex items-center gap-2">
                          <input
                            type="text"
                            value={actNameDraft}
                            onChange={(e) => setActNameDraft(e.target.value)}
                            className="flex-1 min-w-0 rounded border border-border bg-background px-2 py-1 text-sm"
                            autoFocus
                          />
                          <button
                            onClick={() => saveActEdit(act)}
                            className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground hover:bg-primary/90 flex-shrink-0"
                          >
                            <Check className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => startEditAct(act)} className="flex-1 min-w-0 text-left">
                          <span className="text-sm font-semibold text-foreground hover:underline truncate block">{act.name}</span>
                        </button>
                      )}

                      <button
                        onClick={() => toggleActType(act)}
                        className={`rounded-full px-2 py-0.5 text-xs font-medium transition-colors hover:opacity-80 flex-shrink-0 ${
                          act.type === "fixed"
                            ? "bg-purple-500/15 text-purple-500"
                            : "bg-emerald-500/15 text-emerald-500"
                        }`}
                        title="Cliquer pour basculer fixe/modulable"
                      >
                        {act.type === "fixed" ? "Fixe" : "Mod."}
                      </button>

                      <button
                        onClick={() => deleteAct(act)}
                        className="rounded p-1 text-destructive hover:bg-destructive/10 flex-shrink-0"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>

                    {/* Materials OR Versions */}
                    <div className="mt-2 pl-6">
                      {/* Show base materials ONLY if no versions exist */}
                      {!hasVersions && (
                        <div className="space-y-2">
                          {actMats.map((item: any) => (
                            <div key={item.id} className="flex items-center gap-1.5 rounded bg-muted/30 px-2 py-1.5">
                              <span className="flex-1 min-w-0 text-xs text-foreground truncate">
                                {materielList.find((m: any) => m.id === item.materiel_id)?.name || "?"}
                              </span>
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateActMaterialQty(act, item.id, parseInt(e.target.value) || 1)}
                                className="w-16 rounded border border-border bg-background px-2 py-1 text-xs text-center"
                                min={1}
                              />
                              <button
                                onClick={() => deleteActMaterial(act, item.id)}
                                className="rounded p-1 text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                          {actMatSelection && actMatSelection.actId === act.id ? (
                            <div className="flex flex-col gap-1.5">
                              <select
                                value={actMatSelection.matId}
                                onChange={(e) =>
                                  setActMatSelection({ ...actMatSelection, matId: e.target.value })
                                }
                                className="w-full rounded border border-border bg-background px-2 py-1 text-xs"
                              >
                                <option value="">-- Selectionner --</option>
                                {(materiel as any[])?.map((m: any) => (
                                  <option key={m.id} value={m.id}>
                                    {m.name}
                                  </option>
                                ))}
                              </select>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  value={actMatSelection.qty}
                                  onChange={(e) =>
                                    setActMatSelection({ ...actMatSelection, qty: parseInt(e.target.value) || 1 })
                                  }
                                  className="w-16 rounded border border-border bg-background px-2 py-1 text-xs text-center"
                                  min={1}
                                />
                                <button
                                  onClick={() => addActMaterial(act)}
                                  className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground hover:bg-primary/90"
                                >
                                  <Check className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() =>
                                setActMatSelection({ actType: act.type, actId: act.id, matId: "", qty: 1 })
                              }
                              className="rounded bg-secondary px-2 py-1 text-xs text-foreground hover:bg-secondary/80"
                            >
                              <Plus className="h-3 w-3 inline mr-1" />
                              Ajouter materiel
                            </button>
                          )}
                        </div>
                      )}

                      {/* Versions */}
                      <div className={hasVersions ? "" : "mt-3"}>
                        <button
                          onClick={() => toggleVersionsPanel(act)}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          {expandedActVersions === actKey ? "Masquer" : hasVersions ? `Versions (${versions.length})` : "Ajouter des versions"}
                        </button>

                        {expandedActVersions === actKey && (
                          <div className="mt-2 space-y-2 rounded-lg border border-border bg-muted/30 p-3">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Versions</h4>

                            {/* Existing versions */}
                            {versions.map((version: any) => {
                              const versionMats = versionItems[version.id] || []
                              const isEditingVer = editingVersion === version.id
                              return (
                                <div key={version.id} className="rounded bg-background p-2 border border-border">
                                  <div className="flex items-center gap-2 mb-2">
                                    {isEditingVer ? (
                                      <>
                                        <input
                                          type="text"
                                          value={versionNameDraft}
                                          onChange={(e) => setVersionNameDraft(e.target.value)}
                                          className="flex-1 rounded border border-border bg-background px-2 py-1 text-xs"
                                          autoFocus
                                        />
                                        <button
                                          onClick={() => saveVersionEdit(act, version.id)}
                                          className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground"
                                        >
                                          <Check className="h-3 w-3" />
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <button
                                          onClick={() => {
                                            setEditingVersion(version.id)
                                            setVersionNameDraft(version.name)
                                          }}
                                          className="flex-1 text-left"
                                        >
                                          <span className="text-xs font-medium text-foreground hover:underline">
                                            {version.name}
                                          </span>
                                        </button>
                                        <button
                                          onClick={() => deleteVersion(act, version.id)}
                                          className="rounded p-1 text-destructive hover:bg-destructive/10"
                                        >
                                          <Trash2 className="h-2.5 w-2.5" />
                                        </button>
                                      </>
                                    )}
                                  </div>

                                  {/* Version materials */}
                                  <div className="space-y-1 pl-2">
                                    {versionMats.map((item: any) => (
                                      <div key={item.id} className="flex items-center gap-1.5 rounded bg-muted/50 px-2 py-1">
                                        <span className="flex-1 min-w-0 text-[11px] text-foreground truncate">
                                          {item.materiel?.name || "?"}
                                        </span>
                                        <input
                                          type="number"
                                          value={item.quantity}
                                          onChange={(e) => updateVersionMaterialQty(version.id, item.id, parseInt(e.target.value) || 1)}
                                          className="w-12 rounded border border-border bg-background px-1 py-0.5 text-[11px] text-center flex-shrink-0"
                                          min={1}
                                        />
                                        <button
                                          onClick={() => deleteVersionMaterial(version.id, item.id)}
                                          className="rounded p-0.5 text-destructive hover:bg-destructive/10 flex-shrink-0"
                                        >
                                          <Trash2 className="h-2.5 w-2.5" />
                                        </button>
                                      </div>
                                    ))}
                                    {versionMatSelection && versionMatSelection.versionId === version.id ? (
                                      <div className="flex flex-col gap-1.5">
                                        <select
                                          value={versionMatSelection.matId}
                                          onChange={(e) =>
                                            setVersionMatSelection({ ...versionMatSelection, matId: e.target.value })
                                          }
                                          className="w-full rounded border border-border bg-background px-2 py-1 text-[11px]"
                                        >
                                          <option value="">-- Selectionner --</option>
                                          {(materiel as any[])?.map((m: any) => (
                                            <option key={m.id} value={m.id}>
                                              {m.name}
                                            </option>
                                          ))}
                                        </select>
                                        <div className="flex items-center gap-1.5">
                                          <input
                                            type="number"
                                            value={versionMatSelection.qty}
                                            onChange={(e) =>
                                              setVersionMatSelection({ ...versionMatSelection, qty: parseInt(e.target.value) || 1 })
                                            }
                                            className="w-14 rounded border border-border bg-background px-1 py-0.5 text-[11px] text-center"
                                            min={1}
                                          />
                                          <button
                                            onClick={addVersionMaterial}
                                            className="rounded bg-primary px-2 py-1 text-[11px] text-primary-foreground"
                                          >
                                            <Check className="h-2.5 w-2.5" />
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() =>
                                          setVersionMatSelection({ versionId: version.id, matId: "", qty: 1 })
                                        }
                                        className="rounded bg-secondary px-2 py-0.5 text-[11px] text-foreground hover:bg-secondary/80"
                                      >
                                        <Plus className="h-2.5 w-2.5 inline mr-1" />
                                        Ajouter
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )
                            })}

                            {/* Add new version */}
                            <div className="flex items-center gap-2 pt-2 border-t border-border">
                              <input
                                type="text"
                                value={newVersionName}
                                onChange={(e) => setNewVersionName(e.target.value)}
                                placeholder="Nom de la version..."
                                className="flex-1 rounded border border-border bg-background px-2 py-1 text-xs"
                              />
                              <button
                                onClick={() => addVersion(act)}
                                disabled={!newVersionName.trim()}
                                className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Add new act */}
            <div className="flex flex-col gap-2 pt-3 border-t border-border mt-3">
              <input
                type="text"
                value={newActName}
                onChange={(e) => setNewActName(e.target.value)}
                placeholder="Nom du nouvel acte..."
                className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
              />
              <div className="flex items-center gap-2">
                <select
                  value={newActType}
                  onChange={(e) => setNewActType(e.target.value as "fixed" | "modular")}
                  className="flex-1 rounded border border-border bg-background px-2 py-1.5 text-xs"
                >
                  <option value="fixed">Fixe</option>
                  <option value="modular">Modulable</option>
                </select>
                <button
                  onClick={addAct}
                  disabled={!newActName.trim()}
                  className="rounded bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
