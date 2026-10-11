import type { CM, CMFinalPlacement, CMFinalUmaResult } from "../types/types"

export const CM_FINAL_PLACEMENTS: CMFinalPlacement[] = ["first", "second", "third", "fourth_or_lower"]
export const CM_FINAL_PLACEMENT_LABELS: Record<CMFinalPlacement, string> = {
  first: "1st", second: "2nd", third: "3rd", fourth_or_lower: "4th+",
}

export function isCMTeamPlacement(value: unknown): value is "1st" | "2nd" | "3rd" {
  return value === "1st" || value === "2nd" || value === "3rd"
}

export function isCMFinalPlacement(value: unknown): value is CMFinalPlacement | null {
  return value === null || CM_FINAL_PLACEMENTS.some((placement) => placement === value)
}

export function isCMFinalPlacementAllowed(team: string, placement: CMFinalPlacement | null): boolean {
  if (!isCMTeamPlacement(team)) return placement === null
  if (placement === null) return true
  const rank = CM_FINAL_PLACEMENTS.indexOf(placement)
  return rank >= ["1st", "2nd", "3rd"].indexOf(team)
}

/** Validate the historical records, never the mutable current participant settings. */
export function getCMFinalValidationErrors(cm: CM, options: { requireWinner?: boolean; allowLegacyUnknown?: boolean } = {}): string[] {
  const results = cm.finalResults ?? []
  const errors: string[] = []
  if (!isCMTeamPlacement(cm.finalPlace)) {
    if (results.length > 0 || options.requireWinner) errors.push("Select the team result first.")
    return errors
  }
  const participantIds = new Set<string>()
  const podium = new Set<CMFinalPlacement>()
  for (const result of results) {
    if (participantIds.has(result.cmUmaId)) errors.push("A final participant may only be recorded once.")
    participantIds.add(result.cmUmaId)
    if (!isCMFinalPlacement(result.placement)) {
      errors.push("Invalid individual Uma placement.")
      continue
    }
    if (!isCMFinalPlacementAllowed(cm.finalPlace, result.placement)) errors.push("An Uma cannot place better than the team result.")
    if (result.placement && result.placement !== "fourth_or_lower") {
      if (podium.has(result.placement)) errors.push(`${CM_FINAL_PLACEMENT_LABELS[result.placement]} may be assigned to only one Uma.`)
      podium.add(result.placement)
    }
    if (result.won !== (result.placement === "first")) errors.push("The winner must match the individual first-place Uma.")
    if (result.placementSource !== "recorded" && result.placementSource !== "legacy_inferred") errors.push("Invalid placement source.")
  }
  const legacyUnknown = options.allowLegacyUnknown && results.length > 0
    && results.every((result) => result.placementSource === "legacy_inferred" && result.placement === null)
  if (options.requireWinner && cm.finalPlace === "1st" && results.filter((result) => result.placement === "first").length !== 1 && !legacyUnknown) {
    errors.push("Assign 1st to exactly one Uma before completing the CM.")
  }
  if (options.requireWinner && results.length === 0) errors.push("Save the Final Lineup before completing the CM.")
  return errors
}

export function assertCMFinalResults(cm: CM, options: { requireWinner?: boolean; allowLegacyUnknown?: boolean } = {}): void {
  const errors = getCMFinalValidationErrors(cm, options)
  if (errors.length > 0) throw new Error(errors[0])
}

/** Null is a saved value. Only missing placement fields may use an unambiguous old winner. */
export function normalizeCMFinalResults(results: CMFinalUmaResult[], team: string): CMFinalUmaResult[] {
  const oldWinners = results.filter((result) => !Object.hasOwn(result, "placement") && result.won)
  const hasRecordedWinner = results.some((result) => result.placement === "first")
  return results.map((result) => {
    const hasPlacement = Object.hasOwn(result, "placement")
    const placement = hasPlacement ? result.placement
      : team === "1st" && oldWinners.length === 1 && !hasRecordedWinner && result.won ? "first" : null
    const placementSource = result.placementSource ?? (hasPlacement ? "recorded" : "legacy_inferred")
    const won = placement === "first"
    return hasPlacement && result.placementSource === placementSource && result.won === won ? result
      : { ...result, placement, placementSource, won }
  })
}
