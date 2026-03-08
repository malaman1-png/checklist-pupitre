"use client"

import { useState, useEffect } from "react"
import {
  useDisplayOrder,
  useFixedActs,
  useModularActs,
  useSettings,
  globalMutate,
} from "@/lib/hooks"
import { adminDeleteAll, adminInsert } from "@/lib/admin-api"
import { AdminHeader } from "@/components/admin/admin-header"
import { ArrowUp, ArrowDown, Loader2, RefreshCw } from "lucide-react"

interface DisplayItem {
  item_key: string
  label: string
  sort_order: number
  id?: string // DB row id, if exists
}

export function AdminDisplayOrder({ onBack }: { onBack: () => void }) {
  const { data: displayOrder, isLoading: loadingOrder } = useDisplayOrder()
  const { data: fixedActs } = useFixedActs()
  const { data: modularActs } = useModularActs()
  const { data: settings } = useSettings()
  const labelSon = (settings as any)?.label_son || "SON"
  const labelLight = (settings as any)?.label_light || "LIGHT"
  const [items, setItems] = useState<DisplayItem[]>([])
  const [saving, setSaving] = useState(false)

  // Build the list: merge existing display_order with all known sections
  useEffect(() => {
    if (!fixedActs || !modularActs) return

    const allSections: { key: string; label: string }[] = [
      { key: "system:son", label: labelSon },
      { key: "system:light", label: labelLight },
      ...(fixedActs as any[]).map((a: any) => ({
        key: `fixed:${a.id}`,
        label: `${a.name} (fixe)`,
      })),
      ...(modularActs as any[]).map((a: any) => ({
        key: `modular:${a.id}`,
        label: `${a.name} (modulable)`,
      })),
    ]

    // Map existing order from DB
    const orderMap: Record<string, { sort_order: number; id: string }> = {}
    if (displayOrder) {
      for (const row of displayOrder as any[]) {
        orderMap[row.item_key] = { sort_order: row.sort_order, id: row.id }
      }
    }

    // Build items with sort_order (existing or default index)
    const built: DisplayItem[] = allSections.map((s, idx) => ({
      item_key: s.key,
      label: s.label,
      sort_order: orderMap[s.key]?.sort_order ?? idx,
      id: orderMap[s.key]?.id,
    }))

    built.sort((a, b) => a.sort_order - b.sort_order)
    setItems(built)
  }, [displayOrder, fixedActs, modularActs, labelSon, labelLight])

  function moveUp(idx: number) {
    if (idx <= 0) return
    const updated = [...items]
    const temp = updated[idx]
    updated[idx] = updated[idx - 1]
    updated[idx - 1] = temp
    // Reassign sort_order
    updated.forEach((item, i) => { item.sort_order = i })
    setItems(updated)
  }

  function moveDown(idx: number) {
    if (idx >= items.length - 1) return
    const updated = [...items]
    const temp = updated[idx]
    updated[idx] = updated[idx + 1]
    updated[idx + 1] = temp
    updated.forEach((item, i) => { item.sort_order = i })
    setItems(updated)
  }

  async function saveOrder() {
    setSaving(true)

    // Delete all existing rows and re-insert
    await adminDeleteAll("display_order")

    const rows = items.map((item, idx) => ({
      item_key: item.item_key,
      sort_order: idx,
    }))

    await adminInsert("display_order", rows)
    globalMutate("display_order|sort_order|asc")
    setSaving(false)
  }

  return (
    <div className="p-4">
      <AdminHeader title="Ordre d'affichage" onBack={onBack} />

      <p className="text-xs text-muted-foreground mb-4">
        {`Ordre d'apparition de ${labelSon}, ${labelLight} et des actes sur l'ecran de selection.`}
      </p>

      {loadingOrder ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-1 mb-4">
            {items.map((item, idx) => (
              <div
                key={item.item_key}
                className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5"
              >
                <span className="text-xs text-muted-foreground w-5 text-center font-mono">
                  {idx + 1}
                </span>
                <span className="flex-1 text-sm font-medium text-foreground">
                  {item.label}
                </span>
                <button
                  onClick={() => moveUp(idx)}
                  disabled={idx === 0}
                  className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                  aria-label="Monter"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  onClick={() => moveDown(idx)}
                  disabled={idx === items.length - 1}
                  className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                  aria-label="Descendre"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={saveOrder}
            disabled={saving}
            className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mx-auto" />
            ) : (
              "Enregistrer l'ordre"
            )}
          </button>
        </>
      )}
    </div>
  )
}
