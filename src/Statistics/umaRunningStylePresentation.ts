import type { RunningStyle } from "../types/types"
import { runningStyleVisuals } from "../CMs/runningStyleVisuals"
import type { UmaRunningStyleRow } from "./umaRunningStyleStatistics"

/** Fill display rows only; the statistics calculation and its totals remain unchanged. */
export function getUmaRunningStyleDisplayRows(performance: { rows: UmaRunningStyleRow[]; totalRaces: number }): UmaRunningStyleRow[] {
  return (Object.keys(runningStyleVisuals) as RunningStyle[]).map((style) =>
    performance.rows.find((row) => row.style === style) ?? {
      style, label: runningStyleVisuals[style].label, races: 0, wins: 0, winRate: null,
      usage: performance.totalRaces > 0 ? 0 : null,
    },
  )
}
