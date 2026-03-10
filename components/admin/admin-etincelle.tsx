"use client"

import { useMemo, useState } from "react"
import {
  useArtists,
  useEtincelleArtistItems,
  useEtincelleSoundItems,
  useEtincelleVersionItems,
  useEtincelleVersions,
  useMateriel,
  globalMutate,
  supabase,
} from "@/lib/hooks"
import { adminDelete, adminInsert, adminUpdate } from "@/lib/admin-api"
import { AdminHeader } from "@/components/admin/admin-header"
import { ArrowRightLeft, Copy, Loader2, Plus, Trash2 } from "lucide-react"

export function AdminEtincelle({ onBack }: { onBack: () => void }) {
  const { data: versions } = useEtincelleVersions()
  const { data: soundItems, isLoading: soundLoading } = useEtincelleSoundItems()
  const { data: materiel } = useMateriel()
  const { data: artists } = useArtists()

  const [newSoundMaterielId, setNewSoundMaterielId] = useState("")
  const [newSoundQty, setNewSoundQty] = useState(1)
  const [copying, setCopying] = useState(false)

  const sortedVersions = useMemo(() => {
    return ([...(versions as any[] || [])] as any[]).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
  }, [versions])

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
    if (!shortVersion || !longVersion) return

    setCopying(true)
    const { data: sourceItems, error } = await supabase
      .from("etincelle_version_items")
      .select("materiel_id, quantity")
      .eq("version_id", shortVersion.id)
    if (error) {
      setCopying(false)
      return
    }

    await adminDelete("etincelle_version_items", { version_id: longVersion.id })
    for (const item of sourceItems || []) {
      await adminInsert("etincelle_version_items", {
        version_id: longVersion.id,
        materiel_id: item.materiel_id,
        quantity: item.quantity,
      })
    }
    globalMutate(`etincelle_version_items_${shortVersion.id}`)
    globalMutate(`etincelle_version_items_${longVersion.id}`)
    setCopying(false)
  }

  return (
    <div className="p-4">
      <AdminHeader title="Etincelle" onBack={onBack} />

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

        <div className="flex flex-col gap-3">
          {sortedVersions.map((version: any) => (
            <EtincelleVersionCard key={version.id} version={version} materiel={(materiel as any[]) || []} />
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

function EtincelleVersionCard({ version, materiel }: { version: any; materiel: any[] }) {
  const { data: items, isLoading } = useEtincelleVersionItems(version.id)
  const [newMaterielId, setNewMaterielId] = useState("")
  const [newQty, setNewQty] = useState(1)

  async function addItem() {
    if (!newMaterielId) return
    await adminInsert("etincelle_version_items", {
      version_id: version.id,
      materiel_id: newMaterielId,
      quantity: newQty,
    })
    setNewMaterielId("")
    setNewQty(1)
    globalMutate(`etincelle_version_items_${version.id}`)
  }

  async function updateQty(id: string, quantity: number) {
    if (quantity < 1) return
    await adminUpdate("etincelle_version_items", { quantity }, { id })
    globalMutate(`etincelle_version_items_${version.id}`)
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
                value={item.quantity}
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
