"use client"

import { useState } from "react"
import { useArtists, useArtistItems, useMateriel, useTypes, globalMutate } from "@/lib/hooks"
import { adminInsert, adminUpdate, adminDelete } from "@/lib/admin-api"
import { AdminHeader } from "./admin-header"
import { Plus, Trash2, Loader2, ChevronDown, ChevronUp } from "lucide-react"

export function AdminArtists({ onBack }: { onBack: () => void }) {
  const { data: artists, isLoading } = useArtists()
  const { data: materiel } = useMateriel()
  const { data: types } = useTypes()

  // Filter materiel to only "costumes" type
  const costumeTypeId = (types as any[])?.find(
    (t: any) => t.name.toLowerCase().includes("costume")
  )?.id
  const costumeMateriel = costumeTypeId
    ? (materiel as any[])?.filter((m: any) => m.type_id === costumeTypeId) || []
    : []

  const [newName, setNewName] = useState("")
  const [adding, setAdding] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  async function addArtist() {
    if (!newName.trim()) return
    setAdding(true)
    await adminInsert("artists", { name: newName.trim() })
    setNewName("")
    globalMutate("artists|name|asc")
    setAdding(false)
  }

  async function deleteArtist(id: string) {
    if (!confirm("Supprimer cet artiste ?")) return
    await adminDelete("artist_items", { artist_id: id })
    await adminDelete("artists", { id })
    globalMutate("artists|name|asc")
  }

  async function updateColor(id: string, color: string) {
    await adminUpdate("artists", { color }, { id })
    globalMutate("artists|name|asc")
  }

  return (
    <div className="p-4">
      <AdminHeader title="Artistes" onBack={onBack} />

      {/* Add form */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Nom de l'artiste..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") addArtist() }}
          className="flex-1 rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          onClick={addArtist}
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
        {(artists as any[])?.map((artist: any) => (
          <ArtistCard
            key={artist.id}
            artist={artist}
            materiel={costumeMateriel}
            expanded={expandedId === artist.id}
            onToggle={() => setExpandedId(expandedId === artist.id ? null : artist.id)}
            onDelete={() => deleteArtist(artist.id)}
            onColorChange={(c: string) => updateColor(artist.id, c)}
          />
        ))}
      </div>
    </div>
  )
}

function ArtistCard({
  artist,
  materiel,
  expanded,
  onToggle,
  onDelete,
  onColorChange,
}: {
  artist: any
  materiel: any[]
  expanded: boolean
  onToggle: () => void
  onDelete: () => void
  onColorChange: (c: string) => void
}) {
  const { data: items, isLoading } = useArtistItems(expanded ? artist.id : undefined)
  const [newItemId, setNewItemId] = useState("")
  const [newQty, setNewQty] = useState(1)

  async function addItem() {
    if (!newItemId) return
    await adminInsert("artist_items", {
      artist_id: artist.id,
      materiel_id: newItemId,
      qty: newQty,
    })
    setNewItemId("")
    setNewQty(1)
    globalMutate(`artist_items_${artist.id}`)
  }

  async function deleteItem(id: string) {
    await adminDelete("artist_items", { id })
    globalMutate(`artist_items_${artist.id}`)
  }

  async function updateQty(id: string, qty: number) {
    if (qty < 1) return
    await adminUpdate("artist_items", { qty }, { id })
    globalMutate(`artist_items_${artist.id}`)
  }

  const badgeBg = artist.color ? `${artist.color}26` : "hsl(var(--secondary))"

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Color badge */}
        <div
          className="h-8 w-8 rounded-full border-2 border-border shrink-0 relative overflow-hidden"
          style={{ backgroundColor: badgeBg }}
        >
          <input
            type="color"
            value={artist.color || "#3b82f6"}
            onChange={(e) => onColorChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            title="Changer la couleur"
          />
          <div
            className="absolute inset-[6px] rounded-full"
            style={{ backgroundColor: artist.color || "#3b82f6" }}
          />
        </div>

        {/* Name + expand */}
        <button
          onClick={onToggle}
          className="flex-1 flex items-center justify-between text-left"
        >
          <span className="text-sm font-medium text-foreground">{artist.name}</span>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {/* Delete */}
        <button
          onClick={onDelete}
          className="rounded p-1 text-muted-foreground hover:text-destructive transition-colors"
          aria-label="Supprimer"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {expanded && (
        <div className="border-t border-border px-4 py-3">
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Existing items */}
              {(items as any[])?.length === 0 && (
                <p className="text-xs text-muted-foreground mb-3">Aucun objet personnalise</p>
              )}
              <div className="flex flex-col gap-1.5 mb-3">
                {(items as any[])?.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-2 rounded bg-secondary px-3 py-2">
                    <span className="flex-1 text-xs text-foreground truncate">
                      {item.materiel?.name || "???"}
                    </span>
                    <button
                      onClick={() => updateQty(item.id, item.qty - 1)}
                      className="h-6 w-6 rounded bg-card text-xs font-bold text-foreground flex items-center justify-center"
                    >
                      -
                    </button>
                    <span className="text-xs font-semibold text-foreground w-6 text-center">
                      {item.qty}
                    </span>
                    <button
                      onClick={() => updateQty(item.id, item.qty + 1)}
                      className="h-6 w-6 rounded bg-card text-xs font-bold text-foreground flex items-center justify-center"
                    >
                      +
                    </button>
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="rounded p-1 text-muted-foreground hover:text-destructive transition-colors"
                      aria-label="Supprimer"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add item */}
              <div className="flex gap-2">
                <select
                  value={newItemId}
                  onChange={(e) => setNewItemId(e.target.value)}
                  className="flex-1 rounded border border-border bg-secondary px-2 py-1.5 text-xs text-foreground"
                >
                  <option value="">Materiel...</option>
                  {materiel.map((m: any) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  value={newQty}
                  onChange={(e) => setNewQty(Math.max(1, Number(e.target.value)))}
                  className="w-14 rounded border border-border bg-secondary px-2 py-1.5 text-xs text-foreground text-center"
                />
                <button
                  onClick={addItem}
                  disabled={!newItemId}
                  className="rounded bg-primary px-2 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
