import { calculateAttemptRaces } from "../CMs/CMCalculations"
import { getResultConfiguration } from "../CMs/cmParticipantConfiguration"
import type { CM } from "../types/types"
import type { RaceStatistics } from "./umaStatistics"

const sourceLabels = { manual: "Manual", autorun: "AutoRun" } as const
type EntrySource = keyof typeof sourceLabels
export type UmaEntrySourceRow = RaceStatistics & { source: EntrySource; label: string; usage: number | null }

/** Attribute version-level round batches only to their saved entry sources. */
export function calculateUmaEntrySourceStatistics(cms: CM[], versionId: string) {
  const totals = new Map<EntrySource, { races: number; wins: number }>()
  let totalRaces = 0
  let unknownSourceRaces = 0
  let unknownSourceWins = 0
  for (const cm of cms) {
    for (const attempt of cm.attempts ?? []) {
      const results = (attempt.umaWins ?? []).filter((result) => getResultConfiguration(cm, result).umaVersionId === versionId)
      const races = calculateAttemptRaces(attempt)
      if (results.length === 0 || !Number.isFinite(races) || races <= 0) continue
      totalRaces += races
      const wins = results.reduce((sum, result) => sum + result.wins, 0)
      // A missing snapshot must never inherit a current participant's AutoRun flag.
      const sources = new Set(results.map((result) => result.configuration?.entrySource ?? null))
      const source = sources.values().next().value
      // Count a version once; conflicting sources in a batch cannot be split safely.
      if (sources.size !== 1 || (source !== "manual" && source !== "autorun")) {
        unknownSourceRaces += races
        unknownSourceWins += wins
        continue
      }
      const row = totals.get(source) ?? { races: 0, wins: 0 }
      row.races += races
      row.wins += wins
      totals.set(source, row)
    }
  }
  const attributedRaces = totalRaces - unknownSourceRaces
  const rows: UmaEntrySourceRow[] = (["manual", "autorun"] as const).map((source) => {
    const row = totals.get(source) ?? { races: 0, wins: 0 }
    return { ...row, source, label: sourceLabels[source], winRate: row.races > 0 ? row.wins / row.races * 100 : null,
      usage: attributedRaces > 0 ? row.races / attributedRaces * 100 : null }
  })
  return { rows, totalRaces, attributedRaces, unknownSourceRaces, unknownSourceWins }
}
