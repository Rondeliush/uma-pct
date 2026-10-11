import { calculateAttemptRaces } from "../CMs/CMCalculations"
import { getResultConfiguration, RUNNING_STYLE_LABELS } from "../CMs/cmParticipantConfiguration"
import type { CM, RunningStyle } from "../types/types"
import type { RaceStatistics } from "./umaStatistics"

const standardStyles = ["front_runner", "pace_chaser", "late_surger", "end_closer"] as const
export type UmaRunningStyleRow = RaceStatistics & { style: RunningStyle; label: string; usage: number | null }

/** Omit versionId to aggregate all saved Uma participations, with known-style Usage. */
export function calculateUmaRunningStyleStatistics(cms: CM[], versionId?: string) {
  const global = versionId === undefined
  const totals = new Map<RunningStyle, { races: number; wins: number }>()
  let totalRaces = 0
  let unknownStyleRaces = 0
  for (const cm of cms) {
    for (const attempt of cm.attempts ?? []) {
      const races = calculateAttemptRaces(attempt)
      if (!Number.isFinite(races) || races <= 0) continue
      const resultsByVersion = new Map<string, { style: RunningStyle | null; wins: number }[]>()
      for (const result of attempt.umaWins ?? []) {
        // Global statistics never infer missing snapshots from the mutable lineup.
        const configuration = global ? result.configuration : getResultConfiguration(cm, result)
        if (!global && configuration?.umaVersionId !== versionId) continue
        const key = configuration?.umaVersionId !== null && configuration?.umaVersionId !== undefined
          ? `version:${configuration.umaVersionId}` : `participant:${result.cmUmaId}`
        const results = resultsByVersion.get(key) ?? []
        results.push({ style: configuration?.runningStyle ?? null, wins: result.wins })
        resultsByVersion.set(key, results)
      }
      for (const results of resultsByVersion.values()) {
        totalRaces += races
        const styles = new Set(results.map((result) => result.style))
        const style = styles.values().next().value
        // The same version's races are counted once. Conflicting/missing styles cannot be split safely.
        if (styles.size !== 1 || !style || !Object.hasOwn(RUNNING_STYLE_LABELS, style)) { unknownStyleRaces += races; continue }
        const row = totals.get(style) ?? { races: 0, wins: 0 }
        row.races += races
        row.wins += results.reduce((sum, result) => sum + result.wins, 0)
        totals.set(style, row)
      }
    }
  }
  const styles: RunningStyle[] = global ? Object.keys(RUNNING_STYLE_LABELS) as RunningStyle[]
    : [...standardStyles, ...(totals.has("runaway") ? ["runaway" as const] : [])]
  const usageRaces = global ? totalRaces - unknownStyleRaces : totalRaces
  const rows: UmaRunningStyleRow[] = styles.map((style) => {
    const row = totals.get(style) ?? { races: 0, wins: 0 }
    return { ...row, style, label: RUNNING_STYLE_LABELS[style], winRate: row.races > 0 ? row.wins / row.races * 100 : null,
      usage: usageRaces > 0 ? row.races / usageRaces * 100 : global ? 0 : null }
  })
  return { rows, totalRaces, unknownStyleRaces }
}
