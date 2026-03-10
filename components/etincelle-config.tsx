"use client"

import { useEffect, useMemo, useState } from "react"
import {
  useArtists,
  useEtincelleSoundItems,
  useEtincelleVersions,
  useMateriel,
  useProject,
  useTypes,
  supabase,
  globalMutate,
} from "@/lib/hooks"
import { ArrowLeft, Loader2, Sparkles, UserPlus, X } from "lucide-react"

interface EtincelleConfigProps {
  projectId: string
  onBack: () => void
  onGenerated: () => void
}

export function EtincelleConfig({ projectId, onBack, onGenerated }: EtincelleConfigProps) {
  const { data: project } = useProject(projectId)
  const { data: artists } = useArtists()
  const { data: allMateriel } = useMateriel()
  const { data: types } = useTypes()
  const { data: soundItems } = useEtincelleSoundItems()
  const { data: versions } = useEtincelleVersions()

  const [selectedArtistIds, setSelectedArtistIds] = useState<string[]>([])
  const [customArtists, setCustomArtists] = useState<string[]>([])
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [customName, setCustomName] = useState("")
  const [includeSound, setIncludeSound] = useState(true)
  const [selectedVersionId, setSelectedVersionId] = useState<string>("")
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)

  const sortedVersions = useMemo(
    () => ([...(versions as any[] || [])] as any[]).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
    [versions]
  )

  useEffect(() => {
    if (!project) return
    setSelectedArtistIds(project.selected_artist_ids || [])
    setCustomArtists(project.custom_artists || [])
    setIncludeSound(project.generated ? !!project.include_son : true)
    if (project.etincelle_version_id) {
      setSelectedVersionId(project.etincelle_version_id)
      return
    }
    const defaultShort = sortedVersions.find((v: any) => v.slug === "courte-20min")
    if (defaultShort) setSelectedVersionId(defaultShort.id)
    else if (sortedVersions.length > 0) setSelectedVersionId(sortedVersions[0].id)
  }, [project, sortedVersions])

  function toggleArtist(id: string) {
    setSelectedArtistIds((prev) => prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id])
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

  async function generateChecklist() {
    if (!allMateriel || !types) return
    if (!selectedVersionId) {
      setGenError("Choisis une version Etincelle.")
      return
    }

    setGenerating(true)
    setGenError(null)

    try {
      type Contrib = { sourceKey: string; materielId: string; qty: number }
      let contribs: Contrib[] = []
      const artistChecklistRows: any[] = []

      const costumeType = (types as any[])?.find((t: any) => t.name.toLowerCase().includes("costume"))
      const costumeTypeId = costumeType?.id

      const artistItemResults = await Promise.all(
        selectedArtistIds.map((artistId) =>
          supabase
            .from("etincelle_artist_items")
            .select("*")
            .eq("artist_id", artistId)
            .then(({ data }) => ({ artistId, items: data || [] }))
        )
      )

      for (const { artistId, items } of artistItemResults) {
        const artist = (artists as any[] || []).find((a: any) => a.id === artistId)
        const artistName = artist?.name || "?"
        for (const item of items as any[]) {
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

      for (const cName of customArtists) {
        const fallbackTypeId = costumeTypeId || (types as any[])?.[0]?.id || null
        artistChecklistRows.push({
          project_id: projectId,
          materiel_id: null,
          type_id: fallbackTypeId,
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

      const { data: versionItems, error: versionErr } = await supabase
        .from("etincelle_version_items")
        .select("*")
        .eq("version_id", selectedVersionId)

      if (versionErr) throw versionErr

      for (const item of versionItems || []) {
        contribs.push({ sourceKey: `version:${selectedVersionId}`, materielId: item.materiel_id, qty: item.quantity })
      }

      if (includeSound && soundItems) {
        for (const item of soundItems as any[]) {
          contribs.push({ sourceKey: "sound", materielId: item.materiel_id, qty: item.quantity })
        }
      }

      const needs: Record<string, { quantities: number[]; calcMode: string }> = {}
      for (const c of contribs) {
        const mat = (allMateriel as any[])?.find((m: any) => m.id === c.materielId)
        if (!mat) continue
        if (!needs[c.materielId]) {
          needs[c.materielId] = { quantities: [], calcMode: mat.calc_mode || "MAX" }
        }
        needs[c.materielId].quantities.push(c.qty)
      }

      const batchId = crypto.randomUUID()
      const checklistRows = Object.entries(needs).map(([materielId, info]) => {
        const finalQty =
          info.calcMode === "SUM"
            ? info.quantities.reduce((a, b) => a + b, 0)
            : Math.max(...info.quantities)
        const mat = (allMateriel as any[]).find((m: any) => m.id === materielId)
        return {
          project_id: projectId,
          materiel_id: materielId,
          type_id: mat?.type_id,
          quantity: finalQty,
          checked: false,
          batch_id: batchId,
        }
      })

      const allRows = [
        ...checklistRows,
        ...artistChecklistRows.map((r) => ({ ...r, batch_id: batchId })),
      ]

      if (allRows.length > 0) {
        allRows.sort((a, b) => {
          const typeA = (types as any[])?.find((t: any) => t.id === a.type_id)
          const typeB = (types as any[])?.find((t: any) => t.id === b.type_id)
          return (typeA?.sort_order || 0) - (typeB?.sort_order || 0)
        })
      }

      const artistNames = (artists as any[] || [])
        .filter((a: any) => selectedArtistIds.includes(a.id))
        .map((a: any) => a.name)
      const versionLabel = sortedVersions.find((v: any) => v.id === selectedVersionId)?.name || "version"
      const allNames = [...artistNames, ...customArtists]
      const autoName = allNames.length > 0
        ? `Etincelle ${versionLabel} - ${allNames.join(", ")}`
        : `Etincelle ${versionLabel}`

      if (allRows.length > 0) {
        const { error: insertErr } = await supabase.from("checklist_items").insert(allRows)
        if (insertErr) {
          throw new Error("Impossible d'inserer les nouveaux items. Ancienne checklist conservee.")
        }
      }

      await Promise.all([
        supabase.from("checklist_items").delete().eq("project_id", projectId).neq("batch_id", batchId),
        supabase.from("project_fixed_acts").delete().eq("project_id", projectId),
        supabase.from("project_modular_acts").delete().eq("project_id", projectId),
        supabase.from("projects").update({
          name: autoName,
          spectacle: "etincelle",
          etincelle_version_id: selectedVersionId,
          include_son: includeSound,
          include_light: false,
          transport_mode: "car",
          selected_artist_ids: selectedArtistIds,
          custom_artists: customArtists,
          generated: true,
        }).eq("id", projectId),
      ])

      globalMutate(`project_${projectId}`)
      globalMutate(`checklist_items_${projectId}`)
      globalMutate("projects|created_at|desc")
      onGenerated()
    } catch (err: any) {
      setGenError(err?.message || "Generation echouee.")
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

  const hasArtists = selectedArtistIds.length > 0 || customArtists.length > 0
  const isGenerateDisabled = !hasArtists || generating
  const sectionCardClass = "rounded-2xl border border-border/55 bg-card/45 p-4 shadow-lg shadow-black/10 backdrop-blur-sm"
  const selectedCardClass = "border-primary/45 bg-primary/10 ring-1 ring-primary/20"
  const unselectedCardClass = "border-border/55 bg-card/35"

  return (
    <div className="min-h-dvh pb-8">
      <header className="px-4 pt-5 pb-1">
        <div className="rounded-2xl border border-border/55 bg-card/45 px-4 py-3 shadow-lg shadow-black/10 backdrop-blur-sm">
          <button
            onClick={onBack}
            className="mb-3 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </button>
          <h1 className="font-display text-xl font-semibold text-foreground text-center">Etincelle</h1>
          <p className="text-sm text-muted-foreground text-center mt-1 leading-relaxed">
            Choisis les artistes, le sound system, puis la version.
          </p>
        </div>
      </header>

      <div className="px-4 mt-6 flex flex-col gap-6">
        <section className={sectionCardClass}>
          <h2 className="text-sm font-bold text-foreground mb-0.5">Artistes</h2>
          <p className="text-xs text-muted-foreground mb-3">Selection des artistes pour Etincelle</p>

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
                onKeyDown={(e) => {
                  if (e.key === "Enter") addCustomArtist()
                  if (e.key === "Escape") {
                    setShowCustomInput(false)
                    setCustomName("")
                  }
                }}
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

        <section className={sectionCardClass}>
          <h2 className="text-sm font-bold text-foreground mb-2">Technique</h2>
          <button
            onClick={() => setIncludeSound((s) => !s)}
            className={`w-full rounded-xl border px-4 py-3 transition-all ${
              includeSound
                ? `${selectedCardClass}`
                : `${unselectedCardClass} hover:border-muted-foreground/40`
            }`}
          >
            <span className={`text-sm font-semibold ${includeSound ? "text-foreground" : "text-muted-foreground"}`}>
              Sound system
            </span>
          </button>
        </section>

        <section className={sectionCardClass}>
          <h2 className="text-sm font-bold text-foreground mb-2">Version</h2>
          <div className="flex flex-col gap-2">
            {sortedVersions.map((version: any) => (
              <button
                key={version.id}
                onClick={() => setSelectedVersionId(version.id)}
                className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-all ${
                  selectedVersionId === version.id
                    ? `${selectedCardClass} text-foreground`
                    : `${unselectedCardClass} text-muted-foreground hover:text-foreground hover:border-muted-foreground/40`
                }`}
              >
                {version.name}
              </button>
            ))}
          </div>
        </section>
      </div>

      <div className="px-4 mt-8 pb-10">
        {genError && (
          <div className="mb-4 rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {genError}
          </div>
        )}
        {!hasArtists && (
          <p className="mb-3 text-xs text-muted-foreground text-center">
            Selectionne au moins un artiste pour activer la generation.
          </p>
        )}
        <button
          onClick={generateChecklist}
          disabled={isGenerateDisabled}
          className="cta-premium flex w-full items-center justify-center gap-3 rounded-2xl py-5 text-lg font-bold text-primary-foreground disabled:opacity-50"
        >
          {generating ? (
            <Loader2 className="relative z-10 h-7 w-7 animate-spin" />
          ) : (
            <Sparkles className="relative z-10 h-7 w-7" />
          )}
          <span className="relative z-10 tracking-[0.01em]">
            {generating ? "Generation en cours..." : "Generer la checklist"}
          </span>
        </button>
      </div>
    </div>
  )
}
