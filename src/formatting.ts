/** Keep the saved Short category compatible while displaying the current label. */
export function formatTrackLength(length: string) {
  return length === "Short" ? "Sprint" : length
}

export function formatOrdinal(position: number) {
  const lastTwoDigits = position % 100
  const suffix = lastTwoDigits >= 11 && lastTwoDigits <= 13 ? "th"
    : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[position % 10] ?? "th"
  return `${position}${suffix}`
}
