import { calculateAttemptRaces } from "../CMs/CMCalculations"
import { getCMFinalResults, RUNNING_STYLE_LABELS } from "../CMs/cmParticipantConfiguration"
import { isCMTeamPlacement } from "../CMs/cmFinalPlacements"
import type { CM, CMFinalPlacement, CMParticipantConfiguration, RunningStyle } from "../types/types"
import { getFinalGroup } from "./umaDetailStatistics"
import type { UmaEventStatistics } from "./umaDetailStatistics"
import { getRole } from "./umaRoleStatistics"
import type { UmaRole } from "./umaRoleStatistics"

export type UmaCMHistoryEntry = UmaEventStatistics & {
  teamFinal: Pick<NonNullable<UmaEventStatistics["final"]>, "group" | "teamPlace"> | null
  umaFinish: CMFinalPlacement | "not_in_final" | "unrecorded" | null
  role: UmaRole | "mixed"
  roleConfiguration: CMParticipantConfiguration | null
  runningStyles: { style: RunningStyle; usedInFinal: boolean }[]
}

/** Enrich existing event totals using saved snapshots only; never reinterpret current participants. */
export function getUmaChampionsMeetingHistory(cms: CM[], versionId: string, events: UmaEventStatistics[]): UmaCMHistoryEntry[] {
  const records = new Map(cms.map((cm) => [cm.number, cm]))
  return events.map((event) => {
    const cm = records.get(event.number)
    const teamFinal = cm && isCMTeamPlacement(cm.finalPlace) ? { group: getFinalGroup(cm), teamPlace: cm.finalPlace } : null
    const finalists = cm?.finalResults && teamFinal
      ? getCMFinalResults(cm).filter((result) => result.configuration.umaVersionId === versionId) : []
    const configurations: CMParticipantConfiguration[] = []
    for (const attempt of cm?.attempts ?? []) {
      const races = calculateAttemptRaces(attempt)
      if (!Number.isFinite(races) || races <= 0) continue
      for (const result of attempt.umaWins ?? []) {
        // An absent snapshot cannot supply historical metadata from a mutable lineup.
        if (result.configuration?.umaVersionId === versionId) configurations.push(result.configuration)
      }
    }
    configurations.push(...finalists.map((result) => result.configuration))
    const knownRoles = new Set(configurations.map(getRole).filter((role) => role !== "unknown"))
    const role = knownRoles.size > 1 ? "mixed" : knownRoles.values().next().value ?? "unknown"
    const usedStyles = new Set(configurations.map((configuration) => configuration.runningStyle))
    const finalStyles = new Set(finalists.map((result) => result.configuration.runningStyle))
    return {
      ...event,
      teamFinal,
      umaFinish: teamFinal ? event.final ? event.final.placement ?? "unrecorded" : "not_in_final" : null,
      role,
      roleConfiguration: configurations.find((configuration) => getRole(configuration) === role) ?? null,
      runningStyles: (Object.keys(RUNNING_STYLE_LABELS) as RunningStyle[])
        .filter((style) => usedStyles.has(style)).map((style) => ({ style, usedInFinal: finalStyles.has(style) })),
    }
  })
}
