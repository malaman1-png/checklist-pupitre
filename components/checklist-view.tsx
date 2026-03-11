"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import type { TouchEvent } from "react"
import { useChecklistItems, useSettings, useProject, useArtists, useProjectFixedActs, useProjectModularActs, useRealtimeChecklist, supabase, globalMutate } from "@/lib/hooks"
import { getFormatLabel, getSpectacleLabel, normalizeSpectacle } from "@/lib/format-utils"
import { ArrowLeft, Loader2, Check, Pencil } from "lucide-react"
import { getTouchTapSlopPxFromSettings } from "@/lib/ui-settings"

interface ChecklistViewProps {
  projectId: string
  onBack: () => void
  onEdit?: () => void
  fontLevel?: 1 | 2 | 3
}

// Local cache for offline resilience
function getLocalChecks(projectId: string): Record<string, boolean> {
  if (typeof window === "undefined") return {}
  try {
    const stored = localStorage.getItem(`checks_${projectId}`)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

function saveLocalChecks(projectId: string, checks: Record<string, boolean>) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(`checks_${projectId}`, JSON.stringify(checks))
  } catch {
    // quota exceeded
  }
}

// Persistent pending ops queue (last-write-wins per item)
type PendingOp = { id: string; checked: boolean; ts: number }

function getPendingOps(projectId: string): PendingOp[] {
  if (typeof window === "undefined") return []
  try {
    const stored = localStorage.getItem(`pending_ops_${projectId}`)
    return stored ? JSON.parse(stored) : []
  } catch { return [] }
}

function savePendingOps(projectId: string, ops: PendingOp[]) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(`pending_ops_${projectId}`, JSON.stringify(ops))
  } catch {}
}

function addPendingOp(projectId: string, id: string, checked: boolean) {
  const ops = getPendingOps(projectId)
  // Last write wins: remove any existing op for this id
  const filtered = ops.filter((o) => o.id !== id)
  filtered.push({ id, checked, ts: Date.now() })
  savePendingOps(projectId, filtered)
}

function removePendingOp(projectId: string, id: string) {
  const ops = getPendingOps(projectId).filter((o) => o.id !== id)
  savePendingOps(projectId, ops)
}

export function ChecklistView({ projectId, onBack, onEdit, fontLevel: propFontLevel }: ChecklistViewProps) {
  const { data: items, isLoading } = useChecklistItems(projectId)
  const { data: settings } = useSettings()
  const { data: project } = useProject(projectId)
  const { data: artists } = useArtists()
  const { data: projectFixedActs } = useProjectFixedActs(projectId)
  const { data: projectModularActs } = useProjectModularActs(projectId)

  // Realtime sync: re-fetch checklist when another device changes it
  useRealtimeChecklist(projectId)

  // Polling fallback: re-fetch every 15s in case WebSocket drops silently
  useEffect(() => {
    const id = setInterval(() => {
      if (navigator.onLine) {
        globalMutate(`checklist_items_${projectId}`)
      }
    }, 15_000)
    return () => clearInterval(id)
  }, [projectId])

  const [localChecks, setLocalChecks] = useState<Record<string, boolean>>({})
  const [celebrated, setCelebrated] = useState(false)
  const touchTapSlopPx = getTouchTapSlopPxFromSettings(settings)
  const fontLevel = propFontLevel ?? 1
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const touchStartRef = useRef<Record<string, { x: number; y: number; ts: number }>>({})
  const ignoredClickUntilRef = useRef<Record<string, number>>({})

  // Init local checks from localStorage
  useEffect(() => {
    setLocalChecks(getLocalChecks(projectId))
  }, [projectId])

  // Sync remote checks into local state when items load
  // Use a ref to track locally-toggled items so they don't get overridden by stale remote data
  const pendingToggles = useRef<Set<string>>(new Set())
  useEffect(() => {
    if (!items || items.length === 0) return
    const remote: Record<string, boolean> = {}
    for (const item of items as any[]) {
      remote[item.id] = item.checked
    }
    setLocalChecks((prev) => {
      const merged = { ...remote }
      // Keep local values for items we just toggled (pending)
      for (const id of pendingToggles.current) {
        if (id in prev) merged[id] = prev[id]
      }
      saveLocalChecks(projectId, merged)
      return merged
    })
  }, [items, projectId])

  const isChecked = useCallback(
    (itemId: string) => localChecks[itemId] ?? false,
    [localChecks]
  )

  const allChecked =
    items &&
    (items as any[]).length > 0 &&
    (items as any[]).every((item: any) => isChecked(item.id))

  // Confetti + sound celebration
  useEffect(() => {
    if (allChecked && !celebrated && settings) {
      setCelebrated(true)

      if (settings.confetti_enabled) {
        import("canvas-confetti").then((mod) => {
          const confetti = mod.default
          confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 },
            colors: ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"],
          })
        })
      }

      if (settings.sound_enabled) {
        const audio = audioRef.current
        if (audio) {
          audio.currentTime = 0
          const playPromise = audio.play()
          if (playPromise) {
            playPromise.catch(() => {
              // Ignore autoplay/device audio restrictions.
            })
          }
        }
      }
    }
  }, [allChecked, celebrated, settings])

  // Allow replay when user leaves 100% then returns to 100%.
  useEffect(() => {
    if (!allChecked) setCelebrated(false)
  }, [allChecked])

  // Debounce rapid taps: track last toggle per item to prevent double-fires
  const lastToggleRef = useRef<Record<string, number>>({})

  async function toggleCheck(itemId: string) {
    const now = Date.now()
    if (now - (lastToggleRef.current[itemId] || 0) < 250) return // ignore rapid double-tap
    lastToggleRef.current[itemId] = now

    const newVal = !isChecked(itemId)
    const newChecks = { ...localChecks, [itemId]: newVal }
    setLocalChecks(newChecks)
    saveLocalChecks(projectId, newChecks)

    // Add to pending queue (persisted) + mark in-flight
    addPendingOp(projectId, itemId, newVal)
    pendingToggles.current.add(itemId)

    // Try to sync to Supabase
    try {
      const { error } = await supabase
        .from("checklist_items")
        .update({ checked: newVal })
        .eq("id", itemId)
        .eq("project_id", projectId)
      if (!error) {
        removePendingOp(projectId, itemId)
        pendingToggles.current.delete(itemId)
      }
      // If error, op stays in queue for retry
    } catch {
      // Network failure: op stays in queue for retry
    }
  }

  function handleItemTouchStart(itemId: string, e: TouchEvent<HTMLButtonElement>) {
    const t = e.touches[0]
    if (!t) return
    touchStartRef.current[itemId] = { x: t.clientX, y: t.clientY, ts: Date.now() }
  }

  function handleItemTouchEnd(itemId: string, e: TouchEvent<HTMLButtonElement>) {
    const start = touchStartRef.current[itemId]
    delete touchStartRef.current[itemId]
    if (!start) return

    const t = e.changedTouches[0]
    if (!t) return

    const dx = t.clientX - start.x
    const dy = t.clientY - start.y
    const distance = Math.hypot(dx, dy)
    const elapsed = Date.now() - start.ts

    // Treat as tap even with slight finger drift; if movement is larger, keep native scroll behavior.
    if (distance <= touchTapSlopPx && elapsed <= 800) {
      e.preventDefault()
      ignoredClickUntilRef.current[itemId] = Date.now() + 500
      toggleCheck(itemId)
    }
  }

  function handleItemTouchCancel(itemId: string) {
    delete touchStartRef.current[itemId]
  }

  function handleItemClick(itemId: string) {
    if (Date.now() < (ignoredClickUntilRef.current[itemId] || 0)) return
    toggleCheck(itemId)
  }

  // Flush pending ops queue (retry failed toggles)
  const flushPending = useCallback(async () => {
    const ops = getPendingOps(projectId)
    if (ops.length === 0) return
    let flushed = 0
    for (const op of ops) {
      try {
        const { error, count } = await supabase
          .from("checklist_items")
          .update({ checked: op.checked }, { count: "exact" })
          .eq("id", op.id)
          .eq("project_id", projectId)
        if (!error && (count === null || count > 0)) {
          removePendingOp(projectId, op.id)
          pendingToggles.current.delete(op.id)
          flushed++
        } else if (!error && count === 0) {
          // Row no longer exists (regenerated?), remove stale op
          removePendingOp(projectId, op.id)
          pendingToggles.current.delete(op.id)
        }
      } catch {
        // Still offline, stop trying remaining ops
        break
      }
    }
    if (flushed > 0) {
      globalMutate(`checklist_items_${projectId}`)
    }
  }, [projectId])

  // Retry on network recovery + periodic retry (every 8s)
  useEffect(() => {
    const handleOnline = () => { flushPending() }
    window.addEventListener("online", handleOnline)

    const interval = setInterval(() => {
      if (navigator.onLine && getPendingOps(projectId).length > 0) {
        flushPending()
      }
    }, 8000)

    // Also flush on mount (page reload while offline)
    if (navigator.onLine && getPendingOps(projectId).length > 0) {
      flushPending()
    }

    return () => {
      window.removeEventListener("online", handleOnline)
      clearInterval(interval)
    }
  }, [projectId, flushPending])

  // Freeze item order: once loaded, items keep their initial order forever
  // Reset when item IDs change completely (e.g. after regeneration)
  const stableOrderRef = useRef<string[]>([])
  const sectionOrderRef = useRef<string[]>([])
  useEffect(() => {
    if (!items || (items as any[]).length === 0) return
    const currentIds = new Set((items as any[]).map((i: any) => i.id))
    // If ref is empty OR none of the ref IDs exist in current items => reset
    if (
      stableOrderRef.current.length === 0 ||
      !stableOrderRef.current.some((id) => currentIds.has(id))
    ) {
      stableOrderRef.current = (items as any[]).map((i: any) => i.id)
    }
  }, [items])

  // Group items by type, using frozen order
  const grouped: Record<string, { type: any; items: any[] }> = {}
  if (items) {
    const itemMap = new Map((items as any[]).map((i: any) => [i.id, i]))
    // Use stable order, plus any new items not yet in the ref
    const orderedIds = stableOrderRef.current.length > 0
      ? [
          ...stableOrderRef.current.filter((id) => itemMap.has(id)),
          ...(items as any[]).filter((i: any) => !stableOrderRef.current.includes(i.id)).map((i: any) => i.id),
        ]
      : (items as any[]).map((i: any) => i.id)
    for (const id of orderedIds) {
      const item = itemMap.get(id)
      if (!item) continue
      const typeId = item.type_id
      if (!grouped[typeId]) {
        grouped[typeId] = { type: item.types, items: [] }
      }
      grouped[typeId].items.push(item)
    }
  }

  // Local font level: drives font size, spacing, and checkbox size
  const fontSizeClass = fontLevel === 3 ? "text-base" : fontLevel === 2 ? "text-[15px]" : "text-sm"
  const spacingClass = fontLevel === 3 ? "py-4 px-4" : fontLevel === 2 ? "py-3.5 px-4" : "py-3 px-4"
  const checkboxSize = fontLevel === 3 ? "h-8 w-8" : fontLevel === 2 ? "h-7 w-7" : "h-6 w-6"



  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const totalItems = items ? (items as any[]).length : 0
  const checkedCount = items
    ? (items as any[]).filter((i: any) => isChecked(i.id)).length
    : 0
  const selIds: string[] = project?.selected_artist_ids || []
  const customs: string[] = project?.custom_artists || []
  const totalArtists = selIds.length + customs.length
  const spectacle = normalizeSpectacle(project?.spectacle)
  const etincelleVersionLabel =
    spectacle === "etincelle" && typeof project?.name === "string" && project.name.toLowerCase().startsWith("etincelle ")
      ? project.name.slice("Etincelle ".length).split(" - ")[0]
      : null
  const primaryLabel = spectacle === "etincelle" ? (etincelleVersionLabel || "Version") : getFormatLabel(totalArtists)
  const artistMapById: Record<string, any> = {}
  if (artists) {
    for (const artist of artists as any[]) artistMapById[artist.id] = artist
  }

  return (
    <div className="px-4 pb-6 pt-3" style={{ touchAction: "manipulation" }}>
      <audio ref={audioRef} preload="auto" src="/sounds/checklist-complete.mp3" />

      <header className={`sticky top-2 z-20 mb-4 rounded-2xl border p-3 shadow-lg shadow-black/10 backdrop-blur-sm ${
        spectacle === "etincelle"
          ? "border-amber-500/30 bg-gradient-to-r from-amber-500/[0.08] via-card/65 to-card/60"
          : "border-border/55 bg-card/55"
      }`}>
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-secondary/70 transition-colors"
            aria-label="Retour"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-semibold ${spectacle === "etincelle" ? "text-amber-400" : "text-primary"}`}>
              {getSpectacleLabel(spectacle)}
              <span className={`ml-2 text-[11px] font-medium tracking-[0.08em] ${spectacle === "etincelle" ? "text-amber-100/80" : "text-muted-foreground"}`}>
                {primaryLabel}
              </span>
            </p>
            <div className="flex flex-wrap gap-1 mt-0.5">
              {selIds.map((id: string) => {
                const artist = artistMapById[id]
                const color = artist?.color || "#888888"
                return (
                  <span
                    key={id}
                    className="rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{ backgroundColor: `${color}26`, color }}
                  >
                    {artist?.name || "?"}
                  </span>
                )
              })}
              {customs.map((name: string) => (
                <span
                  key={name}
                  className="rounded-full px-2 py-0.5 text-xs font-medium"
                  style={{ backgroundColor: "#88888826", color: "#888888" }}
                >
                  {name}
                </span>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {checkedCount} / {totalItems}
            </p>
          </div>
          {allChecked && (
            <span className="rounded-full bg-success/20 px-3 py-1 text-xs font-bold text-success animate-pulse">
              COMPLET
            </span>
          )}
        </div>
        <div className="mt-3 h-px w-full bg-border/70" />
      </header>

      {/* Recap (always visible) + Edit button */}
      {project && (
        <div className={`mb-3 rounded-2xl border p-3 backdrop-blur-sm flex flex-wrap items-center gap-1.5 ${
          spectacle === "etincelle"
            ? "border-amber-500/25 bg-amber-500/[0.06]"
            : "border-border/55 bg-card/45"
        }`}>
          {spectacle === "etincelle" && (
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-400">
              Etincelle {etincelleVersionLabel || "Version"}
            </span>
          )}
          {project.include_son && (
            <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[11px] font-semibold text-blue-500">
              {(settings as any)?.label_son || "SON"}
            </span>
          )}
          {project.include_light && (
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-500">
              {(settings as any)?.label_light || "LIGHT"}
            </span>
          )}
          {project.transport_mode === "train_mono" && (
            <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-[11px] font-semibold text-orange-500">
              TRAIN
            </span>
          )}
          {(projectFixedActs as any[])?.map((pfa: any) => (
            <span
              key={pfa.fixed_act_id}
              className="rounded-full bg-purple-500/15 px-2 py-0.5 text-[11px] font-medium text-purple-400"
            >
              {pfa.fixed_acts?.name || "Acte fixe"}
            </span>
          ))}
          {(projectModularActs as any[])?.map((pma: any) => (
            <span
              key={pma.modular_act_id}
              className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-400"
            >
              {pma.modular_acts?.name || "Mod."}{"\u00D7"}{pma.artist_count}
            </span>
          ))}
          {onEdit && (
            <button
              onClick={onEdit}
              className="rounded-full border border-border bg-secondary/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center gap-1"
            >
              <Pencil className="h-2.5 w-2.5" />
              Editer
            </button>
          )}
        </div>
      )}

      {/* Progress bar */}
      <div className="w-full h-2 rounded-full bg-secondary/80 mb-6 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-300"
          style={{ width: `${totalItems > 0 ? (checkedCount / totalItems) * 100 : 0}%` }}
        />
      </div>

      {totalItems === 0 && (
        <p className="text-center text-muted-foreground text-sm py-8">
          Aucun objet dans cette checklist.
        </p>
      )}

      {/* Grouped items - freeze section order to prevent layout shift during tapping */}
      <div className="flex flex-col gap-4">
        {(() => {
          const entries = Object.entries(grouped)
          // Sort once, then freeze the order in a ref so sections don't jump while tapping
          const sortedEntries = entries.sort(([_aTypeId, aGroup], [_bTypeId, bGroup]) => {
            // 1. Sections entirely checked go to bottom
            const aAllChecked = aGroup.items.length > 0 && aGroup.items.every((i: any) => isChecked(i.id))
            const bAllChecked = bGroup.items.length > 0 && bGroup.items.every((i: any) => isChecked(i.id))
            if (aAllChecked && !bAllChecked) return 1
            if (!aAllChecked && bAllChecked) return -1
            // 2. Custom perso items to end (among non-completed)
            const aHasCustomPerso = aGroup.items.some((i: any) => i.artist_key?.startsWith("__custom_perso_"))
            const bHasCustomPerso = bGroup.items.some((i: any) => i.artist_key?.startsWith("__custom_perso_"))
            if (aHasCustomPerso && !bHasCustomPerso) return 1
            if (!aHasCustomPerso && bHasCustomPerso) return -1
            return 0
          })
          // Freeze section order: only update when ALL items in a section change check state
          const currentOrder = sortedEntries.map(([id]) => id)
          if (sectionOrderRef.current.length === 0 || currentOrder.length !== sectionOrderRef.current.length) {
            sectionOrderRef.current = currentOrder
          } else {
            // Only re-order if a full section just changed status (all checked or all unchecked)
            const prevAllChecked = sectionOrderRef.current.map(id => {
              const g = grouped[id]
              return g ? g.items.every((i: any) => isChecked(i.id)) : false
            })
            const currAllChecked = currentOrder.map(id => {
              const g = grouped[id]
              return g ? g.items.every((i: any) => isChecked(i.id)) : false
            })
            const statusChanged = prevAllChecked.some((v, i) => v !== currAllChecked[i])
            if (statusChanged) {
              sectionOrderRef.current = currentOrder
            }
          }
          // Render in frozen order
          return sectionOrderRef.current
            .filter(id => grouped[id])
            .map((typeId) => { const group = grouped[typeId]; return [typeId, group] as [string, typeof group] })
        })()
          .map(([typeId, group]) => {
          const color = group.type?.color || "#3b82f6"
          const opacity = group.type?.opacity ?? 0.15
          const isCostumeType = group.type?.name?.toLowerCase().includes("costume")

          // Split items into per-artist and shared
          const artistItems = group.items.filter((i: any) => i.artist_key && !i.artist_key.startsWith("__custom_perso_"))
          const customPersoItems = group.items.filter((i: any) => i.artist_key?.startsWith("__custom_perso_"))
          const sharedItems = group.items.filter((i: any) => !i.artist_key)

          // Group artist items by artist_key
          const byArtist: Record<string, any[]> = {}
          for (const item of artistItems) {
            if (!byArtist[item.artist_key]) byArtist[item.artist_key] = []
            byArtist[item.artist_key].push(item)
          }

          // Find artist color from artists data
          const artistMap: Record<string, any> = {}
          if (artists) { for (const a of artists as any[]) { artistMap[a.name] = a } }

          return (
            <section key={typeId} className="overflow-hidden rounded-xl border border-border/55 bg-card/55 shadow-lg shadow-black/10 backdrop-blur-sm">
              <div
                className="px-4 py-2.5"
                style={{ backgroundColor: `${color}${Math.round(opacity * 255).toString(16).padStart(2, "0")}` }}
              >
                <h2
                  className="text-xs font-bold uppercase tracking-[0.2em]"
                  style={{ color }}
                >
                  {group.type?.name || "Sans type"}
                </h2>
              </div>
              <div className="overflow-hidden border-t border-border/50">
                {/* Shared items (no artist_key) */}
                {sharedItems.map((item: any, idx: number) => {
                  const checked = isChecked(item.id)
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleItemClick(item.id)}
                      onTouchStart={(e) => handleItemTouchStart(item.id, e)}
                      onTouchEnd={(e) => handleItemTouchEnd(item.id, e)}
                      onTouchCancel={() => handleItemTouchCancel(item.id)}
                      className={`w-full flex items-center justify-between min-h-[48px] ${spacingClass} ${fontSizeClass} transition-colors select-none ${
                        idx > 0 ? "border-t border-border" : ""
                      } ${
                        checked
                          ? "bg-success/10 text-success"
                          : "bg-transparent text-foreground hover:bg-secondary/30"
                      }`}
                      style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                    >
                      <span className={`font-medium ${checked ? "line-through opacity-70" : ""}`}>
                        {item.materiel?.name || "?"}{" "}
                        {item.quantity > 1 && (
                          <span className="text-muted-foreground font-normal">
                            x{item.quantity}
                          </span>
                        )}
                      </span>
                      <div
                        className={`${checkboxSize} flex-shrink-0 rounded-lg border-2 flex items-center justify-center transition-colors ${
                          checked
                            ? "bg-success border-success text-success-foreground"
                            : "border-border bg-secondary"
                        }`}
                      >
                        {checked && <Check className="h-4 w-4" />}
                      </div>
                    </button>
                  )
                })}

                {/* Per-artist sub-sections */}
                {Object.entries(byArtist).map(([artistName, artistGroupItems], groupIdx) => {
                  const artist = artistMap[artistName]
                  const artistColor = artist?.color || "#888888"
                  return (
                    <div key={artistName}>
                      {/* Artist sub-header */}
                      <div
                        className={`px-4 py-1.5 flex items-center gap-2 ${sharedItems.length > 0 || groupIdx > 0 ? "border-t border-border" : ""}`}
                        style={{ backgroundColor: `${artistColor}12` }}
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: artistColor }}
                        />
                        <span className="text-xs font-semibold" style={{ color: artistColor }}>
                          {artistName}
                        </span>
                      </div>
                      {/* Artist items */}
                      {artistGroupItems.map((item: any, idx: number) => {
                        const checked = isChecked(item.id)
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleItemClick(item.id)}
                            onTouchStart={(e) => handleItemTouchStart(item.id, e)}
                            onTouchEnd={(e) => handleItemTouchEnd(item.id, e)}
                            onTouchCancel={() => handleItemTouchCancel(item.id)}
                            className={`w-full flex items-center justify-between min-h-[48px] ${spacingClass} ${fontSizeClass} transition-colors border-t border-border select-none ${
                              checked
                                ? "bg-success/10 text-success"
                                : "bg-transparent text-foreground hover:bg-secondary/30"
                            }`}
                            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                          >
                            <span className={`font-medium ${checked ? "line-through opacity-70" : ""}`}>
                              {item.materiel?.name || "costume"}
                            </span>
                            <div
                              className={`${checkboxSize} flex-shrink-0 rounded-lg border-2 flex items-center justify-center transition-colors ${
                                checked
                                  ? "bg-success border-success text-success-foreground"
                                  : "border-border bg-secondary"
                              }`}
                            >
                              {checked && <Check className="h-4 w-4" />}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )
                })}

                {/* Custom perso items (at end of section) */}
                {customPersoItems.map((item: any, idx: number) => {
                  const checked = isChecked(item.id)
                  const customName = item.artist_key.replace("__custom_perso_", "")
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleItemClick(item.id)}
                      onTouchStart={(e) => handleItemTouchStart(item.id, e)}
                      onTouchEnd={(e) => handleItemTouchEnd(item.id, e)}
                      onTouchCancel={() => handleItemTouchCancel(item.id)}
                      className={`w-full flex items-center justify-between min-h-[48px] ${spacingClass} ${fontSizeClass} transition-colors border-t border-border select-none ${
                        checked
                          ? "bg-success/10 text-success"
                          : "bg-transparent text-foreground hover:bg-secondary/30"
                      }`}
                      style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
                    >
                      <span className={`font-medium ${checked ? "line-through opacity-70" : ""}`}>
                        {customName} — agrès, matos perso
                      </span>
                      <div
                        className={`${checkboxSize} flex-shrink-0 rounded-lg border-2 flex items-center justify-center transition-colors ${
                          checked
                            ? "bg-success border-success text-success-foreground"
                            : "border-border bg-secondary"
                        }`}
                      >
                        {checked && <Check className="h-4 w-4" />}
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
