import type { CM, UmaCharacter, UmaVersion } from "../types/types"
import type { LoH } from "../LoH/types"
import { getLoHUmaStats } from "../LoH/progress"
import { formatLoHNumber } from "../LoH/format"
import { calculateUmaStatistics, formatUmaWinRate, MIN_RACES_FOR_WIN_RATE, sortUmaPerformance } from "../Statistics/umaStatistics"
import { calculateUmaRunningStyleStatistics } from "../Statistics/umaRunningStyleStatistics"
import { getHomeCareerHighlights } from "./homeData"

export type HomeTickerFact = {
  id: string
  label: string
  entries: { id: string; name: string; value: string }[]
}

/** Rank existing Statistics records; keep CM records and LoH Main Stage raw points explicitly scoped. */
export function getHomeTickerFacts(cms: CM[], lohs: LoH[], characters: UmaCharacter[], versions: UmaVersion[], statistics = calculateUmaStatistics(cms, characters, versions)): HomeTickerFact[] {
  const recorded = statistics.umas.filter(uma => uma.name.trim() && Number.isFinite(uma.races) && uma.races > 0)
  const wins = sortUmaPerformance(recorded.filter(uma => Number.isFinite(uma.wins) && uma.wins > 0), "wins")
  const races = sortUmaPerformance(recorded, "races")
  const rates = sortUmaPerformance(recorded.filter(uma => uma.races >= MIN_RACES_FOR_WIN_RATE && uma.winRate !== null && Number.isFinite(uma.winRate)), "win-rate")
  const finals = [...recorded].filter(uma => Number.isFinite(uma.finalWins) && uma.finalWins > 0)
    .sort((a, b) => b.finalWins - a.finalWins || b.races - a.races || a.name.localeCompare(b.name, "en") || a.versionId.localeCompare(b.versionId))
  const versionById = new Map(versions.map(uma => [uma.id, uma]))
  const rawByVersion = new Map<string, number>()
  for (const event of lohs) {
    for (const uma of getLoHUmaStats(event)) {
      if (!versionById.get(uma.umaId)?.displayName.trim() || !Number.isFinite(uma.rawPoints) || uma.rawPoints <= 0) continue
      rawByVersion.set(uma.umaId, (rawByVersion.get(uma.umaId) ?? 0) + uma.rawPoints)
    }
  }
  const raw = [...rawByVersion].map(([id, points]) => ({ id, name: versionById.get(id)!.displayName, points }))
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name, "en") || a.id.localeCompare(b.id))
  const styles = calculateUmaRunningStyleStatistics(cms).rows.filter(row => row.races > 0 && Number.isFinite(row.races))
    .sort((a, b) => b.races - a.races || a.label.localeCompare(b.label, "en"))
  const { bestDistance, bestSurface } = getHomeCareerHighlights(cms, characters, versions)
  const facts: HomeTickerFact[] = [
    { id: "cm-most-wins", label: "Most Wins Uma (CM)", entries: wins.slice(0, 3).map(uma => ({ id: uma.versionId, name: uma.name, value: formatLoHNumber(uma.wins) })) },
    { id: "cm-most-races", label: "Most Races (CM)", entries: races.slice(0, 3).map(uma => ({ id: uma.versionId, name: uma.name, value: formatLoHNumber(uma.races) })) },
    { id: "cm-highest-win-rate", label: `Highest Win Rate Uma (CM, min. ${MIN_RACES_FOR_WIN_RATE} races)`, entries: rates.slice(0, 3).map(uma => ({ id: uma.versionId, name: uma.name, value: formatUmaWinRate(uma.winRate) })) },
    { id: "cm-final-wins", label: "Most CM Final Wins", entries: finals.slice(0, 3).map(uma => ({ id: uma.versionId, name: uma.name, value: formatLoHNumber(uma.finalWins) })) },
    { id: "loh-raw-points", label: "Most LoH Raw Points", entries: raw.slice(0, 3).map(uma => ({ id: uma.id, name: uma.name, value: `${formatLoHNumber(uma.points)} PT` })) },
    { id: "cm-running-style", label: "Most Used Running Style (CM rounds)", entries: styles.slice(0, 3).map(row => ({ id: row.style, name: row.label, value: `${formatLoHNumber(row.races)} runs` })) },
    { id: "cm-best-distance", label: `Best Distance (CM, min. ${MIN_RACES_FOR_WIN_RATE} races)`, entries: bestDistance ? [{ id: String(bestDistance.distance), name: `${formatLoHNumber(bestDistance.distance)} m`, value: `${formatUmaWinRate(bestDistance.winRate)} WR` }] : [] },
    { id: "cm-best-surface", label: `Best Surface (CM, min. ${MIN_RACES_FOR_WIN_RATE} races)`, entries: bestSurface ? [{ id: bestSurface.surface, name: bestSurface.surface, value: `${formatUmaWinRate(bestSurface.winRate)} WR` }] : [] },
  ]
  return facts.filter(fact => fact.entries.length > 0)
}
