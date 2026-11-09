import { getCMFinalResults } from "../CMs/cmParticipantConfiguration"
import { isCMTeamPlacement } from "../CMs/cmFinalPlacements"
import type { CM, CMFinalUmaResult } from "../types/types"

/** One raced final per exact version, retaining snapshots and legacy duplicate references. */
export function getRecordedUmaFinals(cm: CM) {
  const versions = new Map<string, CMFinalUmaResult[]>()
  if (!isCMTeamPlacement(cm.finalPlace)) return versions
  for (const result of getCMFinalResults(cm)) {
    const versionId = result.configuration.umaVersionId
    if (versionId === null) continue
    const results = versions.get(versionId) ?? []
    results.push(result)
    versions.set(versionId, results)
  }
  return versions
}
