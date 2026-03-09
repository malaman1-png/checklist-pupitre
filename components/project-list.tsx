"use client"

import React from "react"
import { useState } from "react"
import { useProjects, useArtists, useRealtimeProjects, useChecklistItems, useSettings, supabase, globalMutate } from "@/lib/hooks"
import { Plus, Trash2, Loader2, Pencil, ClipboardList, Settings } from "lucide-react"
import { getFormatLabel } from "@/lib/format-utils"

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
  const format = getFormatLabel(total)

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
    <div className="rounded-2xl border border-border/80 bg-card/90 backdrop-blur-sm overflow-hidden shadow-lg shadow-black/20 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-primary/10">
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
          <span className="text-xs font-bold uppercase tracking-[0.22em] text-primary">{format}</span>
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
  const autoDeleteDays = (settings as any)?.auto_delete_days ?? 0

  useRealtimeProjects()

  const artistMap: Record<string, any> = {}
  if (artists) {
    for (const a of artists as any[]) {
      artistMap[a.id] = a
    }
  }

  const generatedProjects = projects?.filter((p: any) => p.generated) || []

  async function handleNew() {
    setCreating(true)
    const { data: newProject } = await supabase
      .from("projects")
      .insert({})
      .select()
      .single()
    globalMutate("projects|created_at|desc")
    setCreating(false)
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
          className="w-[72vw] max-w-[560px] opacity-[0.08] select-none"
        />
      </div>

      {/* Header */}
      <header className="relative z-10 px-4 pt-6 pb-4">
        <div className="rounded-2xl border border-border/70 bg-card/60 px-4 py-3 backdrop-blur-sm shadow-lg shadow-black/20">
          <div className="flex items-center justify-center">
            <h1 className="font-display text-2xl font-semibold text-foreground tracking-tight">
              Pupitre
            </h1>
            <button
              onClick={onControlRoom}
              className="absolute right-8 top-[1.8rem] rounded-xl p-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              aria-label="Control Room"
            >
              <Settings className="h-5 w-5" />
            </button>
          </div>
          <p className="mt-0.5 text-center text-xs text-muted-foreground">
            Checklists en direct pour la régie
          </p>
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
          onClick={handleNew}
          disabled={creating}
          className="flex w-full items-center justify-center gap-3 rounded-2xl border border-primary/40 bg-primary py-6 text-xl font-bold text-primary-foreground shadow-xl shadow-primary/30 transition-all hover:-translate-y-0.5 hover:bg-primary/95 disabled:opacity-50 disabled:hover:translate-y-0"
        >
          {creating ? <Loader2 className="h-8 w-8 animate-spin" /> : <Plus className="h-8 w-8 stroke-[3]" />}
          Nouvelle checklist
        </button>
      </div>
    </div>
  )
}
