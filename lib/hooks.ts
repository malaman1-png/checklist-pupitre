import useSWR, { mutate as globalMutate } from "swr"
import { createClient } from "@/lib/supabase/client"

const supabase = createClient()

// Generic fetcher for Supabase tables
function fetcher<T>(key: string): Promise<T[]> {
  const [table, orderCol, orderDir] = key.split("|")
  let query = supabase.from(table).select("*")
  if (orderCol) {
    query = query.order(orderCol, { ascending: orderDir !== "desc" })
  }
  return query.then(({ data, error }) => {
    if (error) throw error
    return (data as T[]) || []
  })
}

// Fetcher with joins
function fetcherWithJoin<T>(key: string): Promise<T[]> {
  const [table, selectStr, orderCol] = key.split("|")
  let query = supabase.from(table).select(selectStr || "*")
  if (orderCol) {
    query = query.order(orderCol)
  }
  return query.then(({ data, error }) => {
    if (error) throw error
    return (data as T[]) || []
  })
}

export function useTypes() {
  return useSWR("types|sort_order|asc", fetcher)
}

export function useMateriel() {
  return useSWR("materiel|name|asc", fetcher)
}

export function useSonItems() {
  return useSWR("son_items_with_materiel", async () => {
    const { data, error } = await supabase
      .from("son_items")
      .select("*, materiel(*, types:type_id(*))")
      .order("created_at")
    if (error) throw error
    return data || []
  })
}

export function useLightItems() {
  return useSWR("light_items_with_materiel", async () => {
    const { data, error } = await supabase
      .from("light_items")
      .select("*, materiel(*, types:type_id(*))")
      .order("created_at")
    if (error) throw error
    return data || []
  })
}

export function useFixedActs() {
  return useSWR("fixed_acts|name|asc", fetcher)
}

export function useFixedActItems(fixedActId?: string) {
  const key = fixedActId ? `fixed_act_items_${fixedActId}` : null
  return useSWR(key, async () => {
    const { data, error } = await supabase
      .from("fixed_act_items")
      .select("*, materiel(*)")
      .eq("fixed_act_id", fixedActId!)
    if (error) throw error
    return data || []
  })
}

export function useModularActs() {
  return useSWR("modular_acts|name|asc", fetcher)
}

export function useModularActVariants(modularActId?: string) {
  const key = modularActId ? `modular_act_variants_${modularActId}` : null
  return useSWR(key, async () => {
    const { data, error } = await supabase
      .from("modular_act_variants")
      .select("*, materiel(*)")
      .eq("modular_act_id", modularActId!)
    if (error) throw error
    return data || []
  })
}

export function useProjects() {
  return useSWR("projects|created_at|desc", fetcher)
}

export function useProject(id: string) {
  return useSWR(`project_${id}`, async () => {
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", id)
      .single()
    if (error) throw error
    return data
  })
}

export function useProjectFixedActs(projectId: string) {
  return useSWR(`project_fixed_acts_${projectId}`, async () => {
    const { data, error } = await supabase
      .from("project_fixed_acts")
      .select("*, fixed_acts(*)")
      .eq("project_id", projectId)
    if (error) throw error
    return data || []
  })
}

export function useProjectModularActs(projectId: string) {
  return useSWR(`project_modular_acts_${projectId}`, async () => {
    const { data, error } = await supabase
      .from("project_modular_acts")
      .select("*, modular_acts(*)")
      .eq("project_id", projectId)
    if (error) throw error
    return data || []
  })
}

export function useChecklistItems(projectId: string) {
  return useSWR(`checklist_items_${projectId}`, async () => {
    const { data, error } = await supabase
      .from("checklist_items")
      .select("*, materiel(*)")
      .eq("project_id", projectId)
      .order("created_at")
    if (error) throw error
    // Fetch types separately and attach
    const typeIds = [...new Set((data || []).map((d: any) => d.type_id))]
    let typesMap: Record<string, any> = {}
    if (typeIds.length > 0) {
      const { data: typesData } = await supabase
        .from("types")
        .select("*")
        .in("id", typeIds)
      if (typesData) {
        for (const t of typesData) {
          typesMap[t.id] = t
        }
      }
    }
    return (data || []).map((item: any) => ({
      ...item,
      types: typesMap[item.type_id] || null,
    }))
  })
}

export function useAlwaysItems() {
  return useSWR("always_items_with_materiel", async () => {
    const { data, error } = await supabase
      .from("always_items")
      .select("*, materiel(*)")
    if (error) throw error
    return data || []
  })
}

export function useArtists() {
  return useSWR("artists|name|asc", fetcher)
}

export function useArtistItems(artistId?: string) {
  const key = artistId ? `artist_items_${artistId}` : null
  return useSWR(key, async () => {
    const { data, error } = await supabase
      .from("artist_items")
      .select("*, materiel(*)")
      .eq("artist_id", artistId!)
    if (error) throw error
    return data || []
  })
}

export function useTransportExclusions() {
  return useSWR("transport_excl", async () => {
    const { data, error } = await supabase
      .from("transport_global_exclusions")
      .select("*, materiel(*)")
    if (error) throw error
    return data || []
  })
}

export function useTransportReplacements() {
  return useSWR("transport_repl", async () => {
    const { data, error } = await supabase
      .from("transport_global_replacements")
      .select("*, original:from_materiel_id(id, name), replacement:to_materiel_id(id, name)")
    if (error) throw error
    return data || []
  })
}

export function useTransportAdditions() {
  return useSWR("transport_add", async () => {
    const { data, error } = await supabase
      .from("transport_global_additions")
      .select("*, materiel(*)")
    if (error) throw error
    return data || []
  })
}

export function useTransportActExclusions(actType?: string, actId?: string) {
  const key = actType && actId ? `transport_act_excl_${actType}_${actId}` : null
  return useSWR(key, async () => {
    const { data, error } = await supabase
      .from("transport_act_exclusions")
      .select("*, materiel(*)")
      .eq("act_type", actType!)
      .eq("act_id", actId!)
    if (error) throw error
    return data || []
  })
}

export function useTransportActReplacements(actType?: string, actId?: string) {
  const key = actType && actId ? `transport_act_repl_${actType}_${actId}` : null
  return useSWR(key, async () => {
    const { data, error } = await supabase
      .from("transport_act_replacements")
      .select("*, original:from_materiel_id(id, name), replacement:to_materiel_id(id, name)")
      .eq("act_type", actType!)
      .eq("act_id", actId!)
    if (error) throw error
    return data || []
  })
}

export function useTransportActAdditions(actType?: string, actId?: string) {
  const key = actType && actId ? `transport_act_add_${actType}_${actId}` : null
  return useSWR(key, async () => {
    const { data, error } = await supabase
      .from("transport_act_additions")
      .select("*, materiel(*)")
      .eq("act_type", actType!)
      .eq("act_id", actId!)
    if (error) throw error
    return data || []
  })
}

export function useDisplayOrder() {
  return useSWR("display_order", async () => {
    const { data, error } = await supabase.from("display_order").select("*").order("sort_order")
    if (error) throw error
    return data || []
  })
}

export function useActVersions(actType?: string, actId?: string) {
  const key = actType && actId ? `act_versions_${actType}_${actId}` : null
  return useSWR(key, async () => {
    const { data, error } = await supabase
      .from("act_versions")
      .select("*")
      .eq("act_type", actType!)
      .eq("act_id", actId!)
      .order("sort_order")
    if (error) throw error
    return data || []
  })
}

export function useActVersionItems(versionId?: string) {
  const key = versionId ? `act_version_items_${versionId}` : null
  return useSWR(key, async () => {
    const { data, error } = await supabase
      .from("act_version_items")
      .select("*, materiel(*)")
      .eq("version_id", versionId!)
    if (error) throw error
    return data || []
  })
}

export function useSettings() {
  return useSWR("settings_singleton", async () => {
    const { data, error } = await supabase
      .from("settings")
      .select("*")
      .limit(1)
    if (error) throw error
    // If no settings row exists, create one with defaults
    if (!data || data.length === 0) {
      const { data: newRow, error: insertErr } = await supabase
        .from("settings")
        .insert({
          font_size: "M",
          spacing: "normal",
          big_fingers: false,
          confetti_enabled: true,
          sound_enabled: true,
          auto_delete_days: 0,
        })
        .select("*")
        .single()
      if (insertErr) {
        return {
          font_size: "M",
          spacing: "normal",
          big_fingers: false,
          confetti_enabled: true,
          sound_enabled: true,
          auto_delete_days: 0,
        }
      }
      return newRow
    }
    return data[0]
  })
}

// Realtime sync hook: subscribes to Supabase Realtime changes and invalidates SWR cache
// Re-subscribes on visibility change (tab focus) to recover from lost connections
import { useEffect, useRef, useCallback } from "react"

export function useRealtimeChecklist(projectId: string) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const subscribe = useCallback(() => {
    if (!projectId) return

    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    const channel = supabase
      .channel(`checklist_realtime_${projectId}_${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "checklist_items",
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          // On UPDATE: patch SWR cache directly for instant sync
          if (payload.eventType === "UPDATE" && payload.new) {
            const updated = payload.new as any
            globalMutate(
              `checklist_items_${projectId}`,
              (current: any[] | undefined) => {
                if (!current) return current
                return current.map((item: any) =>
                  item.id === updated.id ? { ...item, checked: updated.checked } : item
                )
              },
              false // no revalidation - trust the realtime payload
            )
          } else {
            // INSERT / DELETE: full re-fetch
            globalMutate(`checklist_items_${projectId}`)
          }
        }
      )
      .subscribe()

    channelRef.current = channel
  }, [projectId])

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const debouncedSubscribe = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const state = (channelRef.current as any)?.state
      if (state === "joined") return
      subscribe()
    }, 2000)
  }, [subscribe])

  useEffect(() => {
    subscribe()

    // Re-subscribe when page regains focus (recovers from lost connections)
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        debouncedSubscribe()
      }
    }
    const handleFocus = () => { debouncedSubscribe() }

    document.addEventListener("visibilitychange", handleVisibility)
    window.addEventListener("focus", handleFocus)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility)
      window.removeEventListener("focus", handleFocus)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [subscribe, debouncedSubscribe])
}

export function useRealtimeProjects() {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const subscribe = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    const channel = supabase
      .channel(`projects_realtime_${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "projects",
        },
        () => {
          globalMutate("projects|created_at|desc")
        }
      )
      .subscribe()

    channelRef.current = channel
  }, [])

  useEffect(() => {
    subscribe()

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        subscribe()
      }
    }
    document.addEventListener("visibilitychange", handleVisibility)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility)
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [subscribe])
}

export { globalMutate }
export { supabase }
