import type { CM } from "../types/types"
import { calculateUmaDetailStatistics } from "./umaDetailStatistics"
import { formatUmaWinRate, MIN_RACES_FOR_WIN_RATE, sortUmaPerformance } from "./umaStatistics"
import type { OverviewUma, UmaOverviewScope } from "./umaOverviewTypes"

export type UmaRankingMetric = "wins" | "races" | "events" | "final-appearances" | "final-a-wins" | "raw-points" | "win-rate"
export type UmaRankingEntry = { uma: OverviewUma; value: number | null; place: number }

export function getUmaRankingModes(scope: UmaOverviewScope) {
  const prefix = scope === "cm" ? "CM " : scope === "loh" ? "LoH " : ""
  const modes: { id: UmaRankingMetric; label: string; title: string; note?: string }[] = [
    { id: "wins", label: "Race Wins", title: `Most ${prefix}Race Wins` },
    { id: "races", label: "Races", title: `Most ${prefix}Races` },
    { id: "events", label: "Event Appearances", title: `Most ${prefix}Event Appearances` },
  ]
  if (scope === "cm") modes.push(
    { id: "final-appearances", label: "Final Appearances", title: "Most CM Final Appearances" },
    { id: "final-a-wins", label: "Final A Wins", title: "Most CM Final A Wins" },
  )
  if (scope === "loh") modes.push({ id: "raw-points", label: "Raw PT", title: "Most LoH Raw PT", note: "Raw points from Main Stage placements, before the Bronze cap. Extra Stage adds no Raw PT." })
  if (scope !== "overall") modes.push({ id: "win-rate", label: "Win Rate", title: `Highest ${prefix}Win Rate`, note: `Minimum ${MIN_RACES_FOR_WIN_RATE} recorded races.` })
  return modes
}

/** Reuse the same Final A classification and individual placements as Uma details. */
export function getUmaFinalAWins(cms: CM[], umas: OverviewUma[]) {
  return new Map(umas.map(uma => [uma.versionId, calculateUmaDetailStatistics(cms, uma.versionId).finals.find(final => final.group === "Final A")?.placements.first ?? 0]))
}

export function getUmaRankingValue(uma: OverviewUma, metric: UmaRankingMetric, finalAWins: ReadonlyMap<string, number>): number | null {
  switch (metric) {
    case "wins": return uma.wins
    case "races": return uma.races
    case "events": return uma.cmEvents + (uma.lohEvents ?? 0)
    case "final-appearances": return uma.finalAppearances
    case "final-a-wins": return finalAWins.get(uma.versionId) ?? 0
    case "raw-points": return uma.rawPoints ?? null
    case "win-rate": return uma.winRate
  }
}

/** Only presentation ordering; all values come from the existing scoped statistics. */
export function rankUmaOverview(umas: OverviewUma[], metric: UmaRankingMetric, finalAWins: ReadonlyMap<string, number> = new Map()): UmaRankingEntry[] {
  const byId = new Map(umas.map(uma => [uma.versionId, uma]))
  const ordered = sortUmaPerformance(umas, metric === "races" || metric === "win-rate" ? metric : "wins")
    .map(row => ({ uma: byId.get(row.versionId)!, value: getUmaRankingValue(byId.get(row.versionId)!, metric, finalAWins) }))
    .filter(({ uma, value }) => uma.races > 0 && value !== null && Number.isFinite(value)
      && (metric !== "win-rate" || uma.races >= MIN_RACES_FOR_WIN_RATE)
      && (!(metric === "final-a-wins" || metric === "final-appearances") || value > 0))
    .sort((a, b) => b.value! - a.value!)
  return ordered.map((entry, index) => ({ ...entry, place: index && entry.value === ordered[index - 1].value ? ordered.findIndex(row => row.value === entry.value) + 1 : index + 1 }))
}

export function formatUmaRankingValue(value: number | null, metric: UmaRankingMetric) {
  if (metric === "win-rate") return formatUmaWinRate(value)
  return value === null ? "—" : `${value.toLocaleString("en")}${metric === "raw-points" ? " PT" : ""}`
}
