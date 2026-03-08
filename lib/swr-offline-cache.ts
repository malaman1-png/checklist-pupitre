const STORAGE_KEY = "pupitre_swr_cache"
const MAX_ENTRY_SIZE = 500 * 1024 // 500KB

let saveTimer: ReturnType<typeof setTimeout> | null = null

export function loadSWRCache(): Record<string, any> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch {
    // Corrupted data — ignore
  }
  return {}
}

export function saveSWREntry(key: string, data: any) {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    try {
      const serialized = JSON.stringify(data)
      if (serialized.length > MAX_ENTRY_SIZE) return

      const cache = loadSWRCache()
      cache[key] = data
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cache))
    } catch {
      // localStorage full or other error — ignore
    }
  }, 1000)
}
