"use client"

import { useState, useEffect, useCallback } from "react"
import {
  useProject,
  useFixedActs,
  useModularActs,
  useMateriel,
  useTypes,
  useSonItems,
  useLightItems,
  useArtists,
  useAlwaysItems,
  useDisplayOrder,
  useTransportExclusions,
  useTransportReplacements,
  useTransportAdditions,
  useSettings,
  supabase,
  globalMutate,
} from "@/lib/hooks"

import { ArrowLeft, Loader2, Sparkles, X, UserPlus } from "lucide-react"
import { buildChecklistTitle } from "@/lib/format-utils"

interface ProjectConfigProps {
  projectId: string
  onBack: () => void
  onGenerated: () => void
}

export function ProjectConfig({ projectId, onBack, onGenerated }: ProjectConfigProps) {
  const { data: project } = useProject(projectId)
  
  const { data: fixedActs } = useFixedActs()
  const { data: modularActs } = useModularActs()
  const { data: allMateriel } = useMateriel()
  const { data: types } = useTypes()
  const { data: sonItems } = useSonItems()
  const { data: lightItems } = useLightItems()
  const { data: artists } = useArtists()
  const { data: alwaysItems } = useAlwaysItems()
  const { data: displayOrder } = useDisplayOrder()
  const { data: transportExclusions } = useTransportExclusions()
  const { data: transportReplacements } = useTransportReplacements()
  const { data: transportAdditions } = useTransportAdditions()
  const { data: settings } = useSettings()

  const labelSon = (settings as any)?.label_son || "SON"
  const labelLight = (settings as any)?.label_light || "LIGHT"

  // Build display order map for sorting sections
  const orderMap: Record<string, number> = {}
  if (displayOrder) {
    for (const row of displayOrder as any[]) {
      orderMap[row.item_key] = row.sort_order
    }
  }

  const [selectedArtistIds, setSelectedArtistIds] = useState<string[]>([])
  const [customArtists, setCustomArtists] = useState<string[]>([])
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [customName, setCustomName] = useState("")
  // Max artists for modular acts
  const maxArtists = selectedArtistIds.length + customArtists.length

  const [transportMode, setTransportMode] = useState<"car" | "train_mono">("car")
  const [includeSon, setIncludeSon] = useState(true)
  const [includeLight, setIncludeLight] = useState(true)
  const [selectedFixed, setSelectedFixed] = useState<Set<string>>(new Set())
  const [modularChoices, setModularChoices] = useState<Record<string, number>>({})
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)

  // Version selection: actId -> versionId
  const [fixedVersionChoices, setFixedVersionChoices] = useState<Record<string, string>>({})
  const [modularVersionChoices, setModularVersionChoices] = useState<Record<string, string>>({})
  // All versions grouped by "type:actId"
  const [allActVersions, setAllActVersions] = useState<Record<string, any[]>>({})

  useEffect(() => {
    supabase
      .from("act_versions")
      .select("*")
      .order("sort_order")
      .then(({ data }) => {
        if (!data) return
        const grouped: Record<string, any[]> = {}
        for (const v of data) {
          const key = `${v.act_type}:${v.act_id}`
          if (!grouped[key]) grouped[key] = []
          grouped[key].push(v)
        }
        setAllActVersions(grouped)
      })
  }, [])

  useEffect(() => {
    if (project) {
      setIncludeSon(project.generated ? project.include_son : true)
      setIncludeLight(project.generated ? project.include_light : true)
      if (project.transport_mode) setTransportMode(project.transport_mode)
      if (project.selected_artist_ids) setSelectedArtistIds(project.selected_artist_ids)
      if (project.custom_artists) setCustomArtists(project.custom_artists)

      // Restore fixed act selections (including version_id)
      supabase
        .from("project_fixed_acts")
        .select("fixed_act_id, version_id")
        .eq("project_id", projectId)
        .then(({ data }) => {
          if (data && data.length > 0) {
            setSelectedFixed(new Set(data.map((r: any) => r.fixed_act_id)))
            const vChoices: Record<string, string> = {}
            for (const r of data as any[]) {
              if (r.version_id) vChoices[r.fixed_act_id] = r.version_id
            }
            setFixedVersionChoices(vChoices)
          }
        })

      // Restore modular act selections (including version_id)
      supabase
        .from("project_modular_acts")
        .select("modular_act_id, artist_count, version_id")
        .eq("project_id", projectId)
        .then(({ data }) => {
          if (data && data.length > 0) {
            const choices: Record<string, number> = {}
            const vChoices: Record<string, string> = {}
            for (const r of data as any[]) {
              choices[r.modular_act_id] = r.artist_count
              if (r.version_id) vChoices[r.modular_act_id] = r.version_id
            }
            setModularChoices(choices)
            setModularVersionChoices(vChoices)
          }
        })
    }
  }, [project, projectId])

  // Auto-clamp or reset modular choices when maxArtists changes
  useEffect(() => {
    if (maxArtists < 1) {
      // No artists: clear all modular selections
      setModularChoices({})
      return
    }
    setModularChoices((prev) => {
      let changed = false
      const next = { ...prev }
      for (const [actId, count] of Object.entries(next)) {
        if (count > maxArtists) {
          next[actId] = maxArtists
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [maxArtists])

  function toggleArtist(id: string) {
    setSelectedArtistIds((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    )
  }

  function addCustomArtist() {
    const name = customName.trim()
    if (!name || customArtists.includes(name)) return
    setCustomArtists((prev) => [...prev, name])
    setCustomName("")
    setShowCustomInput(false)
  }

  function removeCustomArtist(name: string) {
    setCustomArtists((prev) => prev.filter((n) => n !== name))
  }

  const toggleFixed = useCallback((id: string) => {
    setSelectedFixed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const setModularArtists = useCallback((actId: string, count: number) => {
    setModularChoices((prev) => {
      if (prev[actId] === count) {
        const next = { ...prev }
        delete next[actId]
        return next
      }
      return { ...prev, [actId]: count }
    })
  }, [])

  async function generateChecklist() {
    if (!allMateriel || !types) return
    setGenerating(true)
    setGenError(null)

    try {
    // === CONTRIBUTIONS SYSTEM ===
    // Each source produces contribs: { sourceKey, materielId, qty }
    // Per-act transport rules only affect contribs from that act.
    // Global transport rules affect all contribs.
    // Then aggregate into final needs (MAX/SUM).
    type Contrib = { sourceKey: string; materielId: string; qty: number }
    let contribs: Contrib[] = []

    const costumeType = (types as any[])?.find((t: any) => t.name.toLowerCase().includes("costume"))
    const costumeTypeId = costumeType?.id
    const artistChecklistRows: any[] = []

    // Fetch all artist items in parallel
    const artistItemResults = await Promise.all(
      selectedArtistIds.map((artistId) =>
        supabase.from("artist_items").select("*").eq("artist_id", artistId).then(({ data }) => ({ artistId, items: data || [] }))
      )
    )
    for (const { artistId, items: artistItems } of artistItemResults) {
      const artist = (artists as any[] || []).find((a: any) => a.id === artistId)
      const artistName = artist?.name || "?"
      for (const item of artistItems) {
        const mat = (allMateriel as any[])?.find((m: any) => m.id === item.materiel_id)
        if (mat && mat.type_id === costumeTypeId) {
          artistChecklistRows.push({
            project_id: projectId,
            materiel_id: item.materiel_id,
            type_id: mat.type_id,
            quantity: item.qty,
            checked: false,
            artist_key: artistName,
          })
        } else {
          contribs.push({ sourceKey: `artist:${artistId}`, materielId: item.materiel_id, qty: item.qty })
        }
      }
    }

    // Custom artists
    for (const cName of customArtists) {
      const typeId = costumeTypeId || (types as any[])?.[0]?.id || null
      artistChecklistRows.push({
        project_id: projectId,
        materiel_id: null,
        type_id: typeId,
        quantity: 1,
        checked: false,
        artist_key: cName,
      })
      const sortedTypes = [...(types as any[])].sort((a: any, b: any) => (b.sort_order || 0) - (a.sort_order || 0))
      const lastType = sortedTypes[0]
      artistChecklistRows.push({
        project_id: projectId,
        materiel_id: null,
        type_id: lastType?.id,
        quantity: 1,
        checked: false,
        artist_key: `__custom_perso_${cName}`,
      })
    }

    // Always items
    if (alwaysItems) {
      for (const item of alwaysItems as any[]) {
        contribs.push({ sourceKey: "always", materielId: item.materiel_id, qty: item.qty })
      }
    }

    // SON items
    if (includeSon && sonItems) {
      for (const item of sonItems as any[]) {
        contribs.push({ sourceKey: "system:son", materielId: item.materiel_id, qty: item.quantity })
      }
    }

    // LIGHT items
    if (includeLight && lightItems) {
      for (const item of lightItems as any[]) {
        contribs.push({ sourceKey: "system:light", materielId: item.materiel_id, qty: item.quantity })
      }
    }

    // Fixed acts + Modular acts in parallel
    // If a version is selected, use act_version_items instead of the base act items
    const fixedActIds = Array.from(selectedFixed)
    const modularEntries = Object.entries(modularChoices)
    const [fixedResults, modularResults] = await Promise.all([
      Promise.all(
        fixedActIds.map((actId) => {
          const versionId = fixedVersionChoices[actId]
          if (versionId) {
            // Use version items
            return supabase.from("act_version_items").select("*").eq("version_id", versionId).then(({ data }) => ({ actId, items: data || [], versionId }))
          }
          return supabase.from("fixed_act_items").select("*").eq("fixed_act_id", actId).then(({ data }) => ({ actId, items: data || [], versionId: null as string | null }))
        })
      ),
      Promise.all(
        modularEntries.map(([actId, artistCount]) => {
          const versionId = modularVersionChoices[actId]
          if (versionId) {
            return supabase.from("act_version_items").select("*").eq("version_id", versionId).then(({ data }) => ({ actId, items: data || [], artistCount, versionId }))
          }
          return supabase.from("modular_act_variants").select("*").eq("modular_act_id", actId).then(({ data }) => ({ actId, items: data || [], artistCount, versionId: null as string | null }))
        })
      ),
    ])
    for (const { actId, items } of fixedResults) {
      for (const item of items) contribs.push({ sourceKey: `fixed:${actId}`, materielId: item.materiel_id, qty: item.quantity })
    }
    for (const { actId, items, artistCount } of modularResults) {
      for (const v of items) contribs.push({ sourceKey: `modular:${actId}`, materielId: v.materiel_id, qty: v.quantity * artistCount })
    }

    // === TRANSPORT RULES (train_mono only) ===
    if (transportMode === "train_mono") {
      // Build act keys and their matching sourceKey prefixes
      const actKeys: { act_type: string; act_id: string; sourcePrefix: string }[] = []
      if (includeSon) actKeys.push({ act_type: "system", act_id: "son", sourcePrefix: "system:son" })
      if (includeLight) actKeys.push({ act_type: "system", act_id: "light", sourcePrefix: "system:light" })
      for (const actId of fixedActIds) actKeys.push({ act_type: "fixed", act_id: actId, sourcePrefix: `fixed:${actId}` })
      for (const [actId] of modularEntries) actKeys.push({ act_type: "modular", act_id: actId, sourcePrefix: `modular:${actId}` })

      // Fetch all per-act transport rules in parallel
      const actRuleResults = await Promise.all(
        actKeys.map((ak) =>
          Promise.all([
            supabase.from("transport_act_replacements").select("from_materiel_id, to_materiel_id").eq("act_type", ak.act_type).eq("act_id", ak.act_id),
            supabase.from("transport_act_additions").select("materiel_id, qty").eq("act_type", ak.act_type).eq("act_id", ak.act_id),
            supabase.from("transport_act_exclusions").select("materiel_id").eq("act_type", ak.act_type).eq("act_id", ak.act_id),
          ]).then(([replRes, addRes, exclRes]) => ({
            sourcePrefix: ak.sourcePrefix,
            replacements: (replRes.data || []) as any[],
            additions: (addRes.data || []) as any[],
            exclusions: (exclRes.data || []) as any[],
          }))
        )
      )

      // A) Apply per-act rules on contribs matching that act's sourceKey
      for (const { sourcePrefix, replacements, additions, exclusions } of actRuleResults) {
        // 1. Replacements: swap materielId on matching contribs only
        for (const r of replacements) {
          contribs = contribs.map((c) =>
            c.sourceKey === sourcePrefix && c.materielId === r.from_materiel_id
              ? { ...c, materielId: r.to_materiel_id }
              : c
          )
        }
        // 2. Additions: add new contribs for this act
        for (const a of additions) {
          contribs.push({ sourceKey: sourcePrefix, materielId: a.materiel_id, qty: a.qty })
        }
        // 3. Exclusions: remove contribs for this act only
        for (const e of exclusions) {
          contribs = contribs.filter((c) => !(c.sourceKey === sourcePrefix && c.materielId === e.materiel_id))
        }
      }

      // B) Global rules on ALL contribs
      // 1. Replacements
      const globalReplMap: Record<string, string> = {}
      for (const r of (transportReplacements as any[] || [])) {
        globalReplMap[r.from_materiel_id] = r.to_materiel_id
      }
      contribs = contribs.map((c) =>
        globalReplMap[c.materielId] ? { ...c, materielId: globalReplMap[c.materielId] } : c
      )
      // Also in artistChecklistRows
      for (const row of artistChecklistRows) {
        if (row.materiel_id && globalReplMap[row.materiel_id]) {
          const newMatId = globalReplMap[row.materiel_id]
          const newMat = (allMateriel as any[])?.find((m: any) => m.id === newMatId)
          row.materiel_id = newMatId
          row.type_id = newMat?.type_id || row.type_id
        }
      }

      // 2. Additions
      for (const add of (transportAdditions as any[] || [])) {
        contribs.push({ sourceKey: "global:add", materielId: add.materiel_id, qty: add.qty })
      }

      // 3. Exclusions (last)
      const globalExclIds = new Set((transportExclusions as any[] || []).map((e: any) => e.materiel_id))
      contribs = contribs.filter((c) => !globalExclIds.has(c.materielId))
      // Also remove from artistChecklistRows
      const filteredArtistRows = artistChecklistRows.filter((r) => !r.materiel_id || !globalExclIds.has(r.materiel_id))
      artistChecklistRows.length = 0
      artistChecklistRows.push(...filteredArtistRows)
    }

    // === AGGREGATE contribs into final needs (MAX/SUM) ===
    const needs: Record<string, { quantities: number[]; calcMode: string }> = {}
    for (const c of contribs) {
      const mat = (allMateriel as any[])?.find((m: any) => m.id === c.materielId)
      if (!mat) continue
      if (!needs[c.materielId]) {
        needs[c.materielId] = { quantities: [], calcMode: (mat as any).calc_mode || "MAX" }
      }
      needs[c.materielId].quantities.push(c.qty)
    }

    // Generate a unique batch_id for this generation
    const batchId = crypto.randomUUID()

    const checklistRows = Object.entries(needs).map(([materielId, info]) => {
      const finalQty =
        info.calcMode === "SUM"
          ? info.quantities.reduce((a, b) => a + b, 0)
          : Math.max(...info.quantities)
  const mat = allMateriel!.find((m: any) => m.id === materielId) as any
  return {
    project_id: projectId,
    materiel_id: materielId,
    type_id: mat?.type_id,
        quantity: finalQty,
        checked: false,
        batch_id: batchId,
      }
    })

    // Combine regular items + artist-specific items
    const allRows = [
      ...checklistRows,
      ...artistChecklistRows.map((r) => ({ ...r, batch_id: batchId })),
    ]

    // Sort by type sort_order
    if (allRows.length > 0) {
      allRows.sort((a, b) => {
        const typeA = (types as any[])?.find((t: any) => t.id === a.type_id)
        const typeB = (types as any[])?.find((t: any) => t.id === b.type_id)
        return (typeA?.sort_order || 0) - (typeB?.sort_order || 0)
      })
    }

    // Build auto name
    const artistNames = (artists as any[] || [])
      .filter((a: any) => selectedArtistIds.includes(a.id))
      .map((a: any) => a.name)
    const autoName = buildChecklistTitle(artistNames, customArtists)

  // Prepare act selection rows (with version_id if selected)
  const fixedRows = Array.from(selectedFixed).map((fixedActId) => ({
    project_id: projectId,
    fixed_act_id: fixedActId,
    version_id: fixedVersionChoices[fixedActId] || null,
  }))
  const modularRows = Object.entries(modularChoices).map(([modularActId, artistCount]) => ({
    project_id: projectId,
    modular_act_id: modularActId,
    artist_count: artistCount,
      version_id: modularVersionChoices[modularActId] || null,
    }))

    // Step 1: INSERT new items first (safe: old items still exist if this fails)
    if (allRows.length > 0) {
      const { error: insertErr } = await supabase.from("checklist_items").insert(allRows)
      if (insertErr) {
        throw new Error("Impossible d'inserer les nouveaux items. Ancienne checklist conservee.")
      }
    }

    // Step 2: DELETE old items + old act selections, UPDATE project (all in parallel)
    await Promise.all([
      supabase.from("checklist_items").delete().eq("project_id", projectId).neq("batch_id", batchId),
      supabase.from("project_fixed_acts").delete().eq("project_id", projectId),
      supabase.from("project_modular_acts").delete().eq("project_id", projectId),
      supabase.from("projects").update({
        name: autoName,
        include_son: includeSon,
        include_light: includeLight,
  transport_mode: transportMode,
  selected_artist_ids: selectedArtistIds,
  custom_artists: customArtists,
  generated: true,
  }).eq("id", projectId),
      fixedRows.length > 0 ? supabase.from("project_fixed_acts").insert(fixedRows) : Promise.resolve(),
      modularRows.length > 0 ? supabase.from("project_modular_acts").insert(modularRows) : Promise.resolve(),
    ])

    globalMutate(`project_${projectId}`)
    globalMutate(`checklist_items_${projectId}`)
    globalMutate("projects|created_at|desc")
    onGenerated()

    } catch (err: any) {
      setGenError(err?.message || "Generation echouee (reseau instable). Reessaie.")
    } finally {
      setGenerating(false)
    }
  }

  if (!project) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Progressive reveal: which sections are visible
  const hasArtists = selectedArtistIds.length > 0 || customArtists.length > 0
  const showSection2 = hasArtists
  const showSection3 = hasArtists // transport always has a default, so section 3 can appear with section 2

  // Build sorted act list
  const actSections = (() => {
    type ActSection = { key: string; order: number; type: "fixed" | "modular"; act: any; versions: any[] }
    const list: ActSection[] = []
    const defaultOrder = 999
    if (fixedActs) {
      for (const act of fixedActs as any[]) {
        list.push({ key: `fixed:${act.id}`, order: orderMap[`fixed:${act.id}`] ?? defaultOrder, type: "fixed", act, versions: allActVersions[`fixed:${act.id}`] || [] })
      }
    }
    if (modularActs) {
      for (const act of modularActs as any[]) {
        list.push({ key: `modular:${act.id}`, order: orderMap[`modular:${act.id}`] ?? defaultOrder, type: "modular", act, versions: allActVersions[`modular:${act.id}`] || [] })
      }
    }
    list.sort((a, b) => a.order - b.order)
    return list
  })()

  const selectedCardClass = "border-primary/60 bg-primary/15 ring-1 ring-primary/30"
  const unselectedCardClass = "border-border bg-card"

  return (
    <div className="min-h-dvh">
      {/* Header */}
      <header className="px-4 pt-5 pb-1">
        <button
          onClick={onBack}
          className="mb-3 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </button>
        <h1 className="text-xl font-bold text-foreground text-center">{"Ingredients du spectacle"}</h1>
        <p className="text-sm text-muted-foreground text-center mt-1 leading-relaxed">
          {"Ajoute les elements requis, puis tout en bas clique sur \"Generer la checklist\"."}
        </p>
      </header>

      <div className="px-4 mt-6 flex flex-col gap-6">
        {/* ── Section 1: Artistes ── */}
        <section>
          <h2 className="text-sm font-bold text-foreground mb-0.5">Artistes</h2>
          <p className="text-xs text-muted-foreground mb-3">{"Selectionne d'abord les artistes presents sur le spectacle"}</p>

          <div className="flex flex-wrap gap-2 mb-3">
            {(artists as any[] || []).map((a: any) => {
              const selected = selectedArtistIds.includes(a.id)
              return (
                <button
                  key={a.id}
                  onClick={() => toggleArtist(a.id)}
                  className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all ${
                    selected
                      ? `${selectedCardClass} text-foreground`
                      : `${unselectedCardClass} text-muted-foreground hover:text-foreground hover:border-muted-foreground/40`
                  }`}
                >
                  {a.name}
                </button>
              )
            })}
          </div>

          {/* Custom artists */}
          {customArtists.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {customArtists.map((name) => (
                <span
                  key={name}
                  className={`flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-semibold ${selectedCardClass} text-foreground`}
                >
                  {name}
                  <button onClick={() => removeCustomArtist(name)} className="hover:text-destructive ml-0.5" aria-label={`Retirer ${name}`}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {showCustomInput ? (
            <div className="flex gap-2">
              <input
                autoFocus
                type="text"
                placeholder="Nom de l'artiste..."
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addCustomArtist(); if (e.key === "Escape") { setShowCustomInput(false); setCustomName("") } }}
                className="flex-1 rounded-xl border border-border bg-secondary px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button onClick={addCustomArtist} disabled={!customName.trim()} className="rounded-xl bg-secondary border border-border px-4 py-2.5 text-sm font-medium text-foreground disabled:opacity-50">
                OK
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowCustomInput(true)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Ajouter un artiste
            </button>
          )}
        </section>

        {/* ── Section 2: Transport ── */}
        <section
          className={`transition-all duration-500 ease-out ${
            showSection2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none h-0 overflow-hidden"
          }`}
        >
          <h2 className="text-sm font-bold text-foreground mb-3">Moyen de transport</h2>

          <div className="flex gap-2">
            <button
              onClick={() => setTransportMode("car")}
              className={`flex-1 rounded-xl border px-4 py-3 text-sm font-semibold transition-all ${
                transportMode === "car"
                  ? `${selectedCardClass} text-foreground`
                  : `${unselectedCardClass} text-muted-foreground hover:text-foreground hover:border-muted-foreground/40`
              }`}
            >
              Voiture
            </button>
            <button
              onClick={() => setTransportMode("train_mono")}
              className={`flex-1 rounded-xl border px-4 py-3 text-sm font-semibold transition-all ${
                transportMode === "train_mono"
                  ? `${selectedCardClass} text-foreground`
                  : `${unselectedCardClass} text-muted-foreground hover:text-foreground hover:border-muted-foreground/40`
              }`}
            >
              Train / Monoroue
            </button>
          </div>
        </section>

        {/* ── Section 2b: Technique ── */}
        <section
          className={`transition-all duration-500 ease-out ${
            showSection2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none h-0 overflow-hidden"
          }`}
        >
          <h2 className="text-sm font-bold text-foreground mb-0.5">Technique</h2>
          <p className="text-xs text-muted-foreground mb-3">{"Decoche si besoin"}</p>

          <div className="flex gap-2">
            <button
              onClick={() => setIncludeLight(!includeLight)}
              className={`flex-1 rounded-xl border px-4 py-3 transition-all ${
                includeLight
                  ? `${selectedCardClass}`
                  : `${unselectedCardClass} hover:border-muted-foreground/40`
              }`}
            >
              <span className={`text-sm font-semibold ${includeLight ? "text-foreground" : "text-muted-foreground"}`}>{labelLight}</span>
            </button>
            <button
              onClick={() => setIncludeSon(!includeSon)}
              className={`flex-1 rounded-xl border px-4 py-3 transition-all ${
                includeSon
                  ? `${selectedCardClass}`
                  : `${unselectedCardClass} hover:border-muted-foreground/40`
              }`}
            >
              <span className={`text-sm font-semibold ${includeSon ? "text-foreground" : "text-muted-foreground"}`}>{labelSon}</span>
            </button>
          </div>
        </section>

        {/* ── Section 3: Actes ── */}
        <section
          className={`transition-all duration-500 ease-out ${
            showSection3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none h-0 overflow-hidden"
          }`}
        >
          <h2 className="text-sm font-bold text-foreground mb-0.5">Actes</h2>
          <p className="text-xs text-muted-foreground mb-3">Choix des actes</p>

          <div className="flex flex-col gap-2">
            {actSections.map(({ key, type, act, versions }) => {
              const hasVersions = versions.length > 0

              if (type === "fixed") {
                const isSelected = hasVersions
                  ? !!fixedVersionChoices[act.id]
                  : selectedFixed.has(act.id)

                return (
                  <div
                    key={key}
                    className={`rounded-xl border px-4 py-3 transition-all cursor-pointer ${
                      isSelected ? selectedCardClass : `${unselectedCardClass} hover:border-muted-foreground/40`
                    }`}
                    onClick={hasVersions ? undefined : () => toggleFixed(act.id)}
                  >
                    <span className={`text-sm font-semibold ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>
                      {act.name}
                    </span>
                    {hasVersions && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <span className="text-[11px] text-muted-foreground">version:</span>
                        {versions.map((v: any) => (
                          <button
                            key={v.id}
                            onClick={() => {
                              setFixedVersionChoices(prev => {
                                const next = { ...prev }
                                if (next[act.id] === v.id) {
                                  delete next[act.id]
                                  setSelectedFixed(p => { const n = new Set(p); n.delete(act.id); return n })
                                } else {
                                  next[act.id] = v.id
                                  setSelectedFixed(p => new Set(p).add(act.id))
                                }
                                return next
                              })
                            }}
                            className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
                              fixedVersionChoices[act.id] === v.id
                                ? "bg-primary text-primary-foreground"
                                : isSelected
                                  ? "bg-primary/10 text-foreground hover:bg-primary/20"
                                  : "bg-secondary text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {v.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              }

              // Modular act
              const isSelected = act.id in modularChoices
              return (
                <div
                  key={key}
                  className={`rounded-xl border px-4 py-3 transition-all ${
                    isSelected ? selectedCardClass : unselectedCardClass
                  }`}
                >
                  <span className={`text-sm font-semibold ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>
                    {act.name}
                  </span>
                  {maxArtists > 0 ? (
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <span className="text-[11px] text-muted-foreground mr-0.5">{"Nombre d'artistes :"}</span>
                      {Array.from({ length: maxArtists }, (_, i) => i + 1).map((n) => (
                        <button
                          key={n}
                          onClick={() => setModularArtists(act.id, n)}
                          className={`h-9 w-9 rounded-lg text-xs font-bold transition-colors ${
                            modularChoices[act.id] === n
                              ? "bg-primary text-primary-foreground"
                              : isSelected
                                ? "bg-primary/10 text-foreground hover:bg-primary/20"
                                : "bg-secondary text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground mt-1">Selectionne des artistes pour choisir un nombre</p>
                  )}
                  {hasVersions && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-2 pt-2 border-t border-border/50">
                      <span className="text-[11px] text-muted-foreground">version:</span>
                      {versions.map((v: any) => (
                        <button
                          key={v.id}
                          onClick={() => {
                            setModularVersionChoices(prev => {
                              const next = { ...prev }
                              if (next[act.id] === v.id) delete next[act.id]
                              else next[act.id] = v.id
                              return next
                            })
                          }}
                          className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
                            modularVersionChoices[act.id] === v.id
                              ? "bg-primary text-primary-foreground"
                              : isSelected
                                ? "bg-primary/10 text-foreground hover:bg-primary/20"
                                : "bg-secondary text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {v.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      </div>

      {/* Error message & Generate button - inline at bottom of page */}
      {hasArtists && (
        <div className="px-4 mt-8 pb-10">
          {genError && (
            <div className="mb-4 rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {genError}
            </div>
          )}
          <button
            onClick={generateChecklist}
            disabled={generating}
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-primary py-6 text-xl font-bold text-primary-foreground shadow-xl shadow-primary/30 transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {generating ? (
              <Loader2 className="h-7 w-7 animate-spin" />
            ) : (
              <Sparkles className="h-7 w-7" />
            )}
            {generating ? "Generation en cours..." : "Generer la checklist"}
          </button>
        </div>
      )}
    </div>
  )
}
