"use client"

import { useState, useEffect } from "react"
import { useProject, useArtists, supabase, globalMutate } from "@/lib/hooks"
import { ArrowLeft, Loader2, X, UserPlus } from "lucide-react"

interface EditChecklistProps {
  projectId: string
  onBack: () => void
}

export function EditChecklist({ projectId, onBack }: EditChecklistProps) {
  const { data: project } = useProject(projectId)
  const { data: artists } = useArtists()
  const [selectedArtistIds, setSelectedArtistIds] = useState<string[]>([])
  const [customArtists, setCustomArtists] = useState<string[]>([])
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [customName, setCustomName] = useState("")
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)

  // Load existing data from project
  useEffect(() => {
    if (project && !loaded) {
      setSelectedArtistIds(project.selected_artist_ids || [])
      setCustomArtists(project.custom_artists || [])
      setLoaded(true)
    }
  }, [project, loaded])

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

  async function saveChanges() {
    if (selectedArtistIds.length === 0 && customArtists.length === 0) return
    setSaving(true)

    // Build auto name
    const artistNames = (artists as any[] || [])
      .filter((a: any) => selectedArtistIds.includes(a.id))
      .map((a: any) => a.name)
    const allNames = [...artistNames, ...customArtists]
    const autoName = allNames.join(", ")

    await supabase
      .from("projects")
      .update({
        name: autoName,
        selected_artist_ids: selectedArtistIds,
        custom_artists: customArtists,
      })
      .eq("id", projectId)

    globalMutate(`project_${projectId}`)
    globalMutate("projects|created_at|desc")
    setSaving(false)
    onBack()
  }

  if (!project) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-4">
      <header className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          aria-label="Retour"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-foreground truncate">Modifier la checklist</h1>
      </header>

      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold text-foreground mb-3">Artistes</h2>

        {/* Artist buttons */}
        <div className="flex flex-wrap gap-2 mb-3">
          {(artists as any[] || []).map((a: any) => (
            <button
              key={a.id}
              onClick={() => toggleArtist(a.id)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                selectedArtistIds.includes(a.id)
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {a.name}
            </button>
          ))}
        </div>

        {/* Custom artists */}
        {customArtists.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {customArtists.map((name) => (
              <span
                key={name}
                className="flex items-center gap-1 rounded-full bg-primary/20 px-3 py-1.5 text-sm font-medium text-primary"
              >
                {name}
                <button onClick={() => removeCustomArtist(name)} className="hover:text-destructive" aria-label={`Retirer ${name}`}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Add custom artist */}
        {showCustomInput ? (
          <div className="flex gap-2 mb-3">
            <input
              autoFocus
              type="text"
              placeholder="Nom de l'artiste..."
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addCustomArtist(); if (e.key === "Escape") { setShowCustomInput(false); setCustomName("") } }}
              className="flex-1 rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button onClick={addCustomArtist} disabled={!customName.trim()} className="rounded-lg bg-secondary px-3 py-2 text-sm text-foreground disabled:opacity-50">
              OK
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowCustomInput(true)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <UserPlus className="h-3.5 w-3.5" />
            +1 artiste non repertorie
          </button>
        )}

        {/* Save button */}
        <button
          onClick={saveChanges}
          disabled={saving || (selectedArtistIds.length === 0 && customArtists.length === 0)}
          className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Enregistrer"}
        </button>
      </div>
    </div>
  )
}
