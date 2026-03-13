export function getEtincelleTypeSortOrder(type: any): number {
  const etincelleOrder = Number(type?.etincelle_sort_order)
  if (Number.isFinite(etincelleOrder)) return etincelleOrder

  const defaultOrder = Number(type?.sort_order)
  if (Number.isFinite(defaultOrder)) return defaultOrder

  return 0
}

export function sortTypesForEtincelle(types: any[]): any[] {
  const sorted = [...(types || [])]
  sorted.sort((a: any, b: any) => {
    const orderDiff = getEtincelleTypeSortOrder(a) - getEtincelleTypeSortOrder(b)
    if (orderDiff !== 0) return orderDiff
    return String(a?.name || "").localeCompare(String(b?.name || ""), "fr")
  })
  return sorted
}
