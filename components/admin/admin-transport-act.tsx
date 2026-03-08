"use client"

import { useState } from "react"
import { Plus, Trash2, ArrowRight, ChevronDown, ChevronUp } from "lucide-react"
import {
  useFixedActs,
  useModularActs,
  useMateriel,
  useSonItems,
  useLightItems,
  useSettings,
  supabase,
  globalMutate,
} from "@/lib/hooks"
import { adminInsert, adminDelete } from "@/lib/admin-api"
import useSWR from "swr"

function useActRules(actType: string, actId: string) {
  const exclKey = `transport_act_excl_${actType}_${actId}`
  const replKey = `transport_act_repl_${actType}_${actId}`
  const addKey = `transport_act_add_${actType}_${actId}`

  const { data: exclusions } = useSWR(exclKey, async () => {
    const { data, error } = await supabase
      .from("transport_act_exclusions")
      .select("*, materiel(*)")
      .eq("act_type", actType)
      .eq("act_id", actId)
    if (error) throw error
    return data || []
  })

  const { data: replacements } = useSWR(replKey, async () => {
    const { data, error } = await supabase
      .from("transport_act_replacements")
      .select("*, original:from_materiel_id(id, name), replacement:to_materiel_id(id, name)")
      .eq("act_type", actType)
      .eq("act_id", actId)
    if (error) throw error
    return data || []
  })

  const { data: additions } = useSWR(addKey, async () => {
    const { data, error } = await supabase
      .from("transport_act_additions")
      .select("*, materiel(*)")
      .eq("act_type", actType)
      .eq("act_id", actId)
    if (error) throw error
    return data || []
  })

  return { exclusions, replacements, additions, exclKey, replKey, addKey }
}

function ActRulesEditor({ actType, actId, actName, actMaterielIds }: { actType: string; actId: string; actName: string; actMaterielIds?: string[] }) {
  const { exclusions, replacements, additions, exclKey, replKey, addKey } = useActRules(actType, actId)
  const { data: materiel } = useMateriel()
  const allMatList = (materiel as any[]) || []
  // For exclusions & replacement "original": only show materiel already in this act
  const actMatList = actMaterielIds
    ? allMatList.filter((m: any) => actMaterielIds.includes(m.id))
    : allMatList

  const [open, setOpen] = useState(false)
  const [exclMatId, setExclMatId] = useState("")
  const [replOrigId, setReplOrigId] = useState("")
  const [replNewId, setReplNewId] = useState("")
  const [addMatId, setAddMatId] = useState("")
  const [addQty, setAddQty] = useState(1)

  const ruleCount =
    ((exclusions as any[]) || []).length +
    ((replacements as any[]) || []).length +
    ((additions as any[]) || []).length

  async function addExclusion() {
    if (!exclMatId) return
    await adminInsert("transport_act_exclusions", { act_type: actType, act_id: actId, materiel_id: exclMatId })
    setExclMatId("")
    globalMutate(exclKey)
  }

  async function removeExclusion(id: string) {
    await adminDelete("transport_act_exclusions", { id })
    globalMutate(exclKey)
  }

  async function addReplacement() {
    if (!replOrigId || !replNewId || replOrigId === replNewId) return
    await adminInsert("transport_act_replacements", {
      act_type: actType,
      act_id: actId,
      from_materiel_id: replOrigId,
      to_materiel_id: replNewId,
    })
    setReplOrigId("")
    setReplNewId("")
    globalMutate(replKey)
  }

  async function removeReplacement(id: string) {
    await adminDelete("transport_act_replacements", { id })
    globalMutate(replKey)
  }

  async function addAddition() {
    if (!addMatId) return
    await adminInsert("transport_act_additions", {
      act_type: actType,
      act_id: actId,
      materiel_id: addMatId,
      qty: addQty,
    })
    setAddMatId("")
    setAddQty(1)
    globalMutate(addKey)
  }

  async function removeAddition(id: string) {
    await adminDelete("transport_act_additions", { id })
    globalMutate(addKey)
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-card hover:bg-secondary/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{actName}</span>
          {ruleCount > 0 && (
            <span className="text-xs bg-primary/15 text-primary px-1.5 py-0.5 rounded-md font-medium">
              {ruleCount} regle{ruleCount > 1 ? "s" : ""}
            </span>
          )}
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="border-t border-border p-4 space-y-5 bg-card/50">
          {/* Exclusions - filtered to act items only */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Exclusions</h3>
            <div className="flex flex-col gap-1.5 mb-2">
              {((exclusions as any[]) || []).map((e: any) => (
                <div key={e.id} className="flex items-center justify-between rounded border border-border bg-card px-3 py-2">
                  <span className="text-xs text-foreground">{e.materiel?.name || "?"}</span>
                  <button onClick={() => removeExclusion(e.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <select value={exclMatId} onChange={(e) => setExclMatId(e.target.value)} className="flex-1 rounded border border-border bg-secondary px-2 py-1.5 text-xs text-foreground">
                <option value="">Exclure...</option>
                {actMatList.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <button onClick={addExclusion} disabled={!exclMatId} className="rounded bg-primary px-2 py-1.5 text-xs text-primary-foreground disabled:opacity-50"><Plus className="h-3.5 w-3.5" /></button>
            </div>
          </div>

          {/* Replacements - original filtered to act items, target shows all */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Remplacements</h3>
            <div className="flex flex-col gap-1.5 mb-2">
              {((replacements as any[]) || []).map((r: any) => (
                <div key={r.id} className="flex items-center justify-between rounded border border-border bg-card px-3 py-2">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-foreground">{r.original?.name || "?"}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <span className="text-primary font-medium">{r.replacement?.name || "?"}</span>
                  </div>
                  <button onClick={() => removeReplacement(r.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <select value={replOrigId} onChange={(e) => setReplOrigId(e.target.value)} className="w-full rounded border border-border bg-secondary px-2 py-1.5 text-xs text-foreground">
                <option value="">Original...</option>
                {actMatList.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <div className="flex items-center gap-2">
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <select value={replNewId} onChange={(e) => setReplNewId(e.target.value)} className="flex-1 rounded border border-border bg-secondary px-2 py-1.5 text-xs text-foreground">
                  <option value="">Rempl...</option>
                  {allMatList.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <button onClick={addReplacement} disabled={!replOrigId || !replNewId || replOrigId === replNewId} className="rounded bg-primary px-2 py-1.5 text-xs text-primary-foreground disabled:opacity-50 flex-shrink-0"><Plus className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          </div>

          {/* Additions - shows all materiel */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Ajouts</h3>
            <div className="flex flex-col gap-1.5 mb-2">
              {((additions as any[]) || []).map((a: any) => (
                <div key={a.id} className="flex items-center justify-between rounded border border-border bg-card px-3 py-2">
                  <span className="text-xs text-foreground">{a.materiel?.name || "?"} <span className="text-muted-foreground">x{a.qty}</span></span>
                  <button onClick={() => removeAddition(a.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <select value={addMatId} onChange={(e) => setAddMatId(e.target.value)} className="flex-1 rounded border border-border bg-secondary px-2 py-1.5 text-xs text-foreground">
                <option value="">Ajouter...</option>
                {allMatList.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <input type="number" min={1} value={addQty} onChange={(e) => setAddQty(Math.max(1, parseInt(e.target.value) || 1))} className="w-14 rounded border border-border bg-secondary px-2 py-1.5 text-xs text-foreground text-center" />
              <button onClick={addAddition} disabled={!addMatId} className="rounded bg-primary px-2 py-1.5 text-xs text-primary-foreground disabled:opacity-50"><Plus className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function FixedActRulesWrapper({ act }: { act: any }) {
  const { data } = useSWR(`fixed_act_items_${act.id}`, async () => {
    const { data, error } = await supabase.from("fixed_act_items").select("materiel_id").eq("fixed_act_id", act.id)
    if (error) throw error
    return data || []
  })
  const matIds = ((data as any[]) || []).map((i: any) => i.materiel_id).filter(Boolean)
  return <ActRulesEditor actType="fixed" actId={act.id} actName={act.name} actMaterielIds={matIds} />
}

function ModularActRulesWrapper({ act }: { act: any }) {
  const { data } = useSWR(`modular_act_variants_${act.id}`, async () => {
    const { data, error } = await supabase.from("modular_act_variants").select("materiel_id").eq("modular_act_id", act.id)
    if (error) throw error
    return data || []
  })
  const matIds = ((data as any[]) || []).map((i: any) => i.materiel_id).filter(Boolean)
  return <ActRulesEditor actType="modular" actId={act.id} actName={act.name} actMaterielIds={matIds} />
}

export function AdminTransportActs() {
  const { data: fixedActs } = useFixedActs()
  const { data: modularActs } = useModularActs()
  const { data: sonItems } = useSonItems()
  const { data: lightItems } = useLightItems()
  const { data: settings } = useSettings()
  const labelSon = (settings as any)?.label_son || "SON"
  const labelLight = (settings as any)?.label_light || "LIGHT"

  const sonMatIds = ((sonItems as any[]) || []).map((i: any) => i.materiel_id).filter(Boolean)
  const lightMatIds = ((lightItems as any[]) || []).map((i: any) => i.materiel_id).filter(Boolean)

  return (
    <section className="mb-8">
      <h2 className="text-sm font-semibold text-foreground mb-2">Regles par acte</h2>
      <p className="text-xs text-muted-foreground mb-4">
        Regles specifiques a chaque acte (en plus des regles globales ci-dessus).
      </p>

      <div className="flex flex-col gap-2">
        {/* SON / LIGHT */}
        <ActRulesEditor actType="system" actId="son" actName={labelSon} actMaterielIds={sonMatIds} />
        <ActRulesEditor actType="system" actId="light" actName={labelLight} actMaterielIds={lightMatIds} />

        {/* Fixed acts */}
        {(fixedActs as any[] || []).map((act: any) => (
          <FixedActRulesWrapper key={act.id} act={act} />
        ))}

        {/* Modular acts */}
        {(modularActs as any[] || []).map((act: any) => (
          <ModularActRulesWrapper key={act.id} act={act} />
        ))}
      </div>
    </section>
  )
}
