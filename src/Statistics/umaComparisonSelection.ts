export const MAX_COMPARISON_UMAS = 5

/** Keep slot positions stable while discarding malformed, duplicate or missing IDs. */
export function normalizeUmaComparisonSlots(value: unknown, validIds?: ReadonlySet<string>): (string | null)[] {
  const saved = Array.isArray(value) ? value : []
  const seen = new Set<string>()
  return Array.from({ length: MAX_COMPARISON_UMAS }, (_, index) => {
    const id: unknown = saved[index]
    if (typeof id !== "string" || id.trim() === "" || seen.has(id) || (validIds && !validIds.has(id))) return null
    seen.add(id)
    return id
  })
}
