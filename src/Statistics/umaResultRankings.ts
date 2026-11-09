import type { CM, CMLeague } from "../types/types"
import type { LoH } from "../LoH/types"
import { getLoHParticipantStats } from "../LoH/progress"
import { calculateUmaDetailStatistics } from "./umaDetailStatistics"
import { MIN_RACES_FOR_WIN_RATE } from "./umaStatistics"
import type { OverviewUma } from "./umaOverviewTypes"

export type UmaResultEventType = "cm" | "loh"
export type UmaResultLeague = "all" | CMLeague
export type UmaResultMetric = "final-a-appearances" | "final-b-appearances" | "final-a-wins" | "final-b-wins" | "final-wins"
  | "wins" | "win-rate" | "races" | "raw-points" | "top3" | "extra-stage-appearances" | "extra-stage-wins"

export const UMA_RESULT_METRICS: Record<UmaResultEventType, { id: UmaResultMetric; label: string }[]> = {
  cm: [
    { id: "final-a-appearances", label: "Final A Appearances" },
    { id: "final-b-appearances", label: "Final B Appearances" },
    { id: "final-a-wins", label: "Final A Wins" },
    { id: "final-b-wins", label: "Final B Wins" },
    { id: "final-wins", label: "Total Final Wins" },
    { id: "wins", label: "Race Wins" },
    { id: "win-rate", label: "Win Rate" },
    { id: "races", label: "Races" },
  ],
  loh: [
    { id: "raw-points", label: "Raw PT" },
    { id: "wins", label: "1st Places" },
    { id: "top3", label: "Top 3 Finishes" },
    { id: "races", label: "Races" },
    { id: "win-rate", label: "Win Rate" },
    { id: "extra-stage-appearances", label: "Extra Stage Appearances" },
    { id: "extra-stage-wins", label: "Extra Stage Wins" },
  ],
}

export type UmaResultRecord = {
  uma: OverviewUma
  events: number
  values: Partial<Record<UmaResultMetric, number | null>>
}
export type UmaResultRank = UmaResultRecord & { value: number; place: number }

/** League filtering never changes the stored event, lineup or historical configuration. */
export function getCMUmaResultRecords(cms: CM[], umas: OverviewUma[], league: UmaResultLeague = "all"): UmaResultRecord[] {
  const events = league === "all" ? cms : cms.filter(cm => cm.league === league)
  return umas.flatMap(uma => {
    const detail = calculateUmaDetailStatistics(events, uma.versionId)
    if (!detail.races) return []
    const finalA = detail.finals.find(final => final.group === "Final A")
    const finalB = detail.finals.find(final => final.group === "Final B")
    // Match the comparison view: partial A/B history must not rank as a complete count.
    const unknownGroup = detail.finals.some(final => final.group === null)
    return [{ uma: { ...uma, races: detail.races, wins: detail.wins, winRate: detail.winRate, cmEvents: detail.cmEvents,
      finalAppearances: detail.finalAppearances, finalWins: detail.finalWins, distances: detail.distances }, events: detail.cmEvents,
      values: {
        "final-a-appearances": unknownGroup ? null : finalA?.appearances ?? 0,
        "final-b-appearances": unknownGroup ? null : finalB?.appearances ?? 0,
        "final-a-wins": unknownGroup ? null : finalA?.placements.first ?? 0,
        "final-b-wins": unknownGroup ? null : finalB?.placements.first ?? 0,
        "final-wins": detail.finalWins, wins: detail.wins, races: detail.races, "win-rate": detail.winRate,
      } }]
  })
}

/** Extra Stage achievements are individual recorded finishes, never the team's outcome. */
export function getLoHUmaResultRecords(events: LoH[], umas: OverviewUma[]): UmaResultRecord[] {
  const finishes = new Map<string, { top3: number; extraWins: number }>()
  for (const event of events) for (const participant of getLoHParticipantStats(event)) {
    const total = finishes.get(participant.umaId) ?? { top3: 0, extraWins: 0 }
    total.top3 += participant.top3Finishes
    total.extraWins += Number(participant.extraStagePlacement === "first")
    finishes.set(participant.umaId, total)
  }
  return umas.filter(uma => uma.races > 0).map(uma => ({ uma, events: uma.lohEvents ?? 0,
    values: { "raw-points": uma.rawPoints ?? null, wins: uma.wins, top3: finishes.get(uma.versionId)?.top3 ?? 0,
      races: uma.races, "win-rate": uma.winRate, "extra-stage-appearances": uma.extraStageAppearances ?? 0,
      "extra-stage-wins": finishes.get(uma.versionId)?.extraWins ?? 0 } }))
}

/** Sort actual version totals; tied values share a competition rank (1, 1, 3). */
export function rankUmaResults(records: UmaResultRecord[], metric: UmaResultMetric): UmaResultRank[] {
  const eligible = records.flatMap(record => {
    const value = record.values[metric]
    if (value == null || !Number.isFinite(value) || record.uma.races <= 0
      || (metric === "win-rate" ? record.uma.races < MIN_RACES_FOR_WIN_RATE : value <= 0)) return []
    return [{ ...record, value }]
  }).sort((a, b) => b.value - a.value || b.uma.races - a.uma.races || b.uma.wins - a.uma.wins
    || a.uma.name.localeCompare(b.uma.name, "en") || a.uma.versionId.localeCompare(b.uma.versionId))
  let place = 0
  return eligible.map((record, index) => {
    if (index === 0 || record.value !== eligible[index - 1].value) place = index + 1
    return { ...record, place }
  })
}
