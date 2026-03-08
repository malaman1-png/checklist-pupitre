const FORMAT_LABELS: Record<number, string> = {
  1: "Solo",
  2: "Duo",
  3: "Trio",
  4: "Quatuor",
  5: "Quintuor",
  6: "Sextuor",
  7: "Septuor",
  8: "Octuor",
  9: "Nonuor",
  10: "Decuor",
}

export function getFormatLabel(count: number): string {
  if (count <= 0) return "Checklist"
  return FORMAT_LABELS[count] || `${count}-tuor`
}

export function buildChecklistTitle(
  artistNames: string[],
  customArtists: string[]
): string {
  const allNames = [...artistNames, ...customArtists]
  const count = allNames.length
  if (count === 0) return "Checklist"
  const format = getFormatLabel(count)
  return `${format} — ${allNames.join(", ")}`
}
