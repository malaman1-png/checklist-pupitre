"use client"

import React from "react"
import { useState } from "react"
import { Audiowide } from "next/font/google"
import { useProjects, useArtists, useRealtimeProjects, useChecklistItems, useSettings, supabase, globalMutate } from "@/lib/hooks"
import { Plus, Trash2, Loader2, Pencil, ClipboardList, Settings, Flame, Lightbulb, Check } from "lucide-react"
import { getFormatLabel, getSpectacleLabel, normalizeSpectacle, type SpectacleKind } from "@/lib/format-utils"

const headerTitleFont = Audiowide({ subsets: ["latin"], weight: "400" })

/* ---- Invisible preloader: triggers SWR fetch so data is cached for offline ---- */
function PreloadChecklist({ projectId }: { projectId: string }) {
  useChecklistItems(projectId)
  return null
}

/* ---- Progress badge shown on each card ---- */
function ProgressBadge({ projectId }: { projectId: string }) {
  const { data: items } = useChecklistItems(projectId)
  if (!items || items.length === 0) return null

  const total = (items as any[]).length
  const checked = (items as any[]).filter((i: any) => i.checked).length
  const pct = Math.round((checked / total) * 100)
  const done = pct === 100

  return (
    <div className="flex items-center gap-2">
      {/* Mini progress bar */}
      <div className="h-1.5 w-16 rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${pct}%`,
            backgroundColor: done ? "hsl(var(--success))" : "hsl(var(--primary))",
          }}
        />
      </div>
      <span className={`text-xs font-medium tabular-nums ${done ? "text-success" : "text-muted-foreground"}`}>
        {checked}/{total}
      </span>
    </div>
  )
}

/* ---- Single checklist card ---- */
function ChecklistCard({
  project,
  artistMap,
  autoDeleteDays,
  onOpen,
  onEdit,
  onDelete,
}: {
  project: any
  artistMap: Record<string, any>
  autoDeleteDays: number
  onOpen: () => void
  onEdit: () => void
  onDelete: (e: React.MouseEvent) => void
}) {
  const selIds: string[] = project.selected_artist_ids || []
  const customs: string[] = project.custom_artists || []
  const total = selIds.length + customs.length
  const spectacle = normalizeSpectacle(project.spectacle)
  const format = spectacle === "etincelle" ? "Version" : getFormatLabel(total)
  const etincelleVersionLabel =
    spectacle === "etincelle" && typeof project.name === "string" && project.name.toLowerCase().startsWith("etincelle ")
      ? project.name.slice("Etincelle ".length).split(" - ")[0]
      : null

  const dateStr = new Date(project.created_at).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })

  // Jours/heures restants avant suppression auto (si configurée)
  const deletionTimeMs =
    autoDeleteDays > 0
      ? new Date(project.created_at).getTime() + autoDeleteDays * 24 * 60 * 60 * 1000
      : null
  const msUntilDeletion = deletionTimeMs !== null ? Math.max(0, deletionTimeMs - Date.now()) : null
  const daysUntilDeletion = msUntilDeletion !== null ? Math.floor(msUntilDeletion / (24 * 60 * 60 * 1000)) : null
  const hoursUntilDeletion =
    msUntilDeletion !== null && daysUntilDeletion === 0
      ? Math.floor(msUntilDeletion / (60 * 60 * 1000))
      : null

  const suppressionLabel =
    daysUntilDeletion !== null && daysUntilDeletion >= 1
      ? `Suppression auto. dans ${daysUntilDeletion} j`
      : hoursUntilDeletion !== null
        ? `Suppression auto. dans ${hoursUntilDeletion} h`
        : null

  return (
    <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm overflow-hidden shadow-lg shadow-black/10 transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-primary/10">
      {/* Main clickable area */}
      <div
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(e) => { if (e.key === "Enter") onOpen() }}
        className="p-4 cursor-pointer"
      >
        {/* Top row: format + progress */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-[0.22em] text-primary">
            {getSpectacleLabel(spectacle)}
            <span className="ml-2 text-[11px] font-medium tracking-[0.08em] text-muted-foreground">
              {spectacle === "etincelle" ? (etincelleVersionLabel || format) : format}
            </span>
          </span>
          <ProgressBadge projectId={project.id} />
        </div>

        {/* Artist badges */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {selIds.map((id: string) => {
            const artist = artistMap[id]
            const color = artist?.color || "#888888"
            return (
              <span
                key={id}
                className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                style={{ backgroundColor: `${color}20`, color }}
              >
                {artist?.name || "?"}
              </span>
            )
          })}
          {customs.map((name: string) => (
            <span
              key={name}
              className="rounded-full px-2.5 py-0.5 text-xs font-medium"
              style={{ backgroundColor: "#88888820", color: "#888888" }}
            >
              {name}
            </span>
          ))}
        </div>

        {/* Date + mention suppression auto */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-xs text-muted-foreground">{dateStr}</p>
          {suppressionLabel && (
            <span className="text-[11px] text-muted-foreground">
              {suppressionLabel}
            </span>
          )}
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-end gap-1 border-t border-border/50 px-3 py-2 bg-black/10">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit() }}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-primary hover:bg-primary/10"
          aria-label="Modifier la checklist"
        >
          <Pencil className="h-3.5 w-3.5" />
          Modifier
        </button>
        <button
          onClick={onDelete}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-destructive hover:bg-destructive/10"
          aria-label="Supprimer la checklist"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Supprimer
        </button>
      </div>
    </div>
  )
}

/* ==== Main list ==== */

interface ProjectListProps {
  onOpen: (projectId: string, generated: boolean) => void
  onEdit: (projectId: string) => void
  onNew: (projectId: string) => void
  onControlRoom: () => void
}

export function ProjectList({ onOpen, onEdit, onNew, onControlRoom }: ProjectListProps) {
  const { data: projects, isLoading } = useProjects()
  const { data: artists } = useArtists()
  const { data: settings } = useSettings()
  const [creating, setCreating] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newSpectacle, setNewSpectacle] = useState<SpectacleKind>("pupitre")
  const [createError, setCreateError] = useState<string | null>(null)
  const autoDeleteDays = (settings as any)?.auto_delete_days ?? 0

  useRealtimeProjects()

  const artistMap: Record<string, any> = {}
  if (artists) {
    for (const a of artists as any[]) {
      artistMap[a.id] = a
    }
  }

  const generatedProjects = projects?.filter((p: any) => p.generated) || []

  function isSchemaMissingForSpectacle(message?: string | null) {
    if (!message) return false
    const msg = message.toLowerCase()
    return msg.includes("spectacle") || msg.includes("etincelle_version_id") || msg.includes("schema cache")
  }

  async function handleNew() {
    setCreating(true)
    setCreateError(null)

    const payload = {
      spectacle: newSpectacle,
      etincelle_version_id: null,
    }

    let { data: newProject, error } = await supabase
      .from("projects")
      .insert(payload)
      .select()
      .single()

    if (error && isSchemaMissingForSpectacle(error.message)) {
      const fallback = await supabase
        .from("projects")
        .insert({})
        .select()
        .single()
      newProject = fallback.data
      error = fallback.error

      if (!fallback.error && newSpectacle === "etincelle") {
        window.alert("Migration SQL Etincelle manquante. Checklist creee en mode Pupitre.")
      }
    }

    if (error) {
      setCreateError(error.message || "Creation impossible.")
      setCreating(false)
      return
    }

    globalMutate("projects|created_at|desc")
    setCreating(false)
    setShowCreateModal(false)
    if (newProject) onNew(newProject.id)
  }

  async function deleteProject(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    const confirmed = window.confirm("Supprimer cette checklist ?")
    if (!confirmed) return
    await supabase.from("checklist_items").delete().eq("project_id", id)
    await supabase.from("project_fixed_acts").delete().eq("project_id", id)
    await supabase.from("project_modular_acts").delete().eq("project_id", id)
    await supabase.from("projects").delete().eq("id", id)
    // Clean up last_open_checklist if this was the saved one
    try {
      const saved = localStorage.getItem("last_open_checklist")
      if (saved) {
        const { projectId } = JSON.parse(saved)
        if (projectId === id) localStorage.removeItem("last_open_checklist")
      }
    } catch {}
    globalMutate("projects|created_at|desc")
  }

  return (
    <div className="relative flex flex-col min-h-dvh overflow-hidden">
      {/* Decorative background logo */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <img
          src="/slab-logo.png"
          alt=""
          aria-hidden="true"
          className="w-[72vw] max-w-[560px] select-none mix-blend-screen opacity-[0.12]"
          style={{
            maskImage: "radial-gradient(ellipse at center, black 48%, transparent 82%)",
            WebkitMaskImage: "radial-gradient(ellipse at center, black 48%, transparent 82%)",
          }}
        />
      </div>

      {/* Header */}
      <header className="relative z-10 px-4 pt-6 pb-4">
        <div className="rounded-2xl border border-border/55 bg-card/45 px-4 py-3 backdrop-blur-sm shadow-lg shadow-black/10">
          <div className="flex items-center justify-between">
            <span className="h-9 w-9" aria-hidden="true" />
            <h1 className={`${headerTitleFont.className} max-w-[calc(100%-5.5rem)] bg-gradient-to-r from-cyan-300 via-primary to-fuchsia-300 bg-clip-text text-center text-[0.8rem] font-normal uppercase leading-tight tracking-[0.14em] text-transparent drop-shadow-[0_0_12px_rgba(56,189,248,0.35)] sm:text-[0.95rem]`}>
              Checklist Generator BX4000
            </h1>
            <button
              onClick={onControlRoom}
              className="rounded-xl p-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              aria-label="Control Room"
            >
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="relative z-10 flex-1 px-4 pb-28">
        {isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && generatedProjects.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-5">
              <ClipboardList className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">Aucune checklist</h2>
            <p className="text-sm text-muted-foreground max-w-[260px] leading-relaxed">
              {"Cree ta premiere checklist en appuyant sur le bouton ci-dessous."}
            </p>
          </div>
        )}

        {/* Checklist cards */}
        {!isLoading && generatedProjects.length > 0 && (
          <>
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground mb-3">
              Checklists en cours ({generatedProjects.length})
            </p>
            <div className="flex flex-col gap-3">
              {generatedProjects.map((p: any) => (
                <React.Fragment key={p.id}>
                  <PreloadChecklist projectId={p.id} />
                  <ChecklistCard
                    project={p}
                    artistMap={artistMap}
                    autoDeleteDays={autoDeleteDays}
                    onOpen={() => onOpen(p.id, p.generated)}
                    onEdit={() => onEdit(p.id)}
                    onDelete={(e) => deleteProject(p.id, e)}
                  />
                </React.Fragment>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Sticky bottom button - always visible */}
      <div className="fixed bottom-0 inset-x-0 p-4 pb-6 bg-gradient-to-t from-background via-background to-transparent z-40">
        <button
          onClick={() => {
            setCreateError(null)
            setNewSpectacle("pupitre")
            setShowCreateModal(true)
          }}
          disabled={creating}
          className="cta-premium flex w-full items-center justify-center gap-3 rounded-2xl py-5 text-lg font-bold text-primary-foreground disabled:opacity-50"
        >
          {creating ? <Loader2 className="relative z-10 h-8 w-8 animate-spin" /> : <Plus className="relative z-10 h-8 w-8 stroke-[3]" />}
          <span className="relative z-10 tracking-[0.01em]">Nouvelle checklist</span>
        </button>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/65 p-4 backdrop-blur-[3px] animate-in fade-in-0 duration-150 sm:items-center">
          <div className="w-full max-w-md rounded-3xl border border-border/70 bg-card/95 p-5 shadow-2xl shadow-black/40 backdrop-blur animate-in zoom-in-95 slide-in-from-bottom-3 duration-200 sm:slide-in-from-bottom-0">
            <div className="mb-4">
              <h2 className="text-center text-lg font-semibold tracking-tight text-foreground">Quel spectacle ?</h2>
              <div className="mt-2 h-px w-full bg-gradient-to-r from-transparent via-border to-transparent" />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <button
                onClick={() => setNewSpectacle("pupitre")}
                className={`relative rounded-2xl border px-3 py-3 text-left transition-all duration-150 ${
                  newSpectacle === "pupitre"
                    ? "border-primary/50 bg-primary/10 ring-1 ring-primary/30 shadow-lg shadow-primary/10"
                    : "border-border/60 bg-secondary/40 hover:border-muted-foreground/45 hover:bg-secondary/65"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold text-foreground">Pupitre</p>
                </div>
                {newSpectacle === "pupitre" && (
                  <span className="absolute right-2 top-2 rounded-full bg-primary/20 p-1 text-primary">
                    <Check className="h-3 w-3" />
                  </span>
                )}
              </button>
              <button
                onClick={() => setNewSpectacle("etincelle")}
                className={`relative rounded-2xl border px-3 py-3 text-left transition-all duration-150 ${
                  newSpectacle === "etincelle"
                    ? "border-primary/50 bg-primary/10 ring-1 ring-primary/30 shadow-lg shadow-primary/10"
                    : "border-border/60 bg-secondary/40 hover:border-muted-foreground/45 hover:bg-secondary/65"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold text-foreground">Etincelle</p>
                </div>
                {newSpectacle === "etincelle" && (
                  <span className="absolute right-2 top-2 rounded-full bg-primary/20 p-1 text-primary">
                    <Check className="h-3 w-3" />
                  </span>
                )}
              </button>
            </div>

            {createError && (
              <p className="mt-3 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {createError}
              </p>
            )}

            <div className="mt-5 flex items-center justify-end gap-2.5 border-t border-border/50 pt-4">
              <button
                onClick={() => {
                  if (creating) return
                  setShowCreateModal(false)
                }}
                className="rounded-xl border border-border/60 bg-secondary/45 px-4 py-2 text-sm text-foreground hover:bg-secondary/70 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleNew}
                disabled={creating}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.99] disabled:opacity-60"
              >
                {creating ? "Creation..." : "Continuer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
