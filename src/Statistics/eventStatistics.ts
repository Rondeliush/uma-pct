import { calculateFinalQualificationFromAttempts, calculateRound2GroupFromAttempts } from "../CMs/CMCalculations"
import { isCMTeamPlacement } from "../CMs/cmFinalPlacements"
import { getHomeCareerStatistics } from "../Home/homeData"
import type { CM } from "../types/types"
import { withWinRate } from "./trackStatistics"

/** Read-only event records reuse Home's team totals, including a recorded final once. */
export function getCMEventStatistics(cms: CM[]) {
  const rows = cms.map(event => ({
    event,
    ...getHomeCareerStatistics([event], []).cm,
    finalType: event.phase === "eliminated" ? "Eliminated" : calculateFinalQualificationFromAttempts(event.attempts ?? []),
    finalRecorded: isCMTeamPlacement(event.finalPlace),
    round2Group: (event.attempts ?? []).some(attempt => attempt.day <= 2 && attempt.racesPlayed > 0)
      ? calculateRound2GroupFromAttempts(event.attempts) : null,
  })).sort((a, b) => b.event.number - a.event.number)
  const totals = getHomeCareerStatistics(cms, []).cm
  const bestWinRate = rows.filter(row => row.winRate !== null).slice()
    .sort((a, b) => b.winRate! - a.winRate! || b.races - a.races)[0] ?? null
  const mostWins = rows.filter(row => row.wins > 0).slice().sort((a, b) => b.wins - a.wins || b.races - a.races)[0] ?? null
  const finals = (["Final A", "Final B"] as const).map(label => {
    const matching = rows.filter(row => row.finalType === label)
    return { label, ...withWinRate({ events: matching.length, races: matching.reduce((sum, row) => sum + row.races, 0), wins: matching.reduce((sum, row) => sum + row.wins, 0) }) }
  })
  const groups = (["A", "B"] as const).map(group => {
    const matching = rows.filter(row => row.round2Group === group)
    const qualified = matching.filter(row => row.finalType === "Final A" || row.finalType === "Final B").length
    const racedFinal = matching.filter(row => row.finalRecorded).length
    return { group, events: matching.length, qualified, racedFinal, finalRate: matching.length ? racedFinal / matching.length * 100 : null }
  })
  return { rows, totals, bestWinRate, mostWins, finals, groups }
}

export type CMEventRecord = ReturnType<typeof getCMEventStatistics>["rows"][number]

export function getCMFinalPlacementCounts(rows: CMEventRecord[], league: string) {
  const matching = rows.filter(row => league === "all" || row.event.league === league)
  return (["1st", "2nd", "3rd"] as const).map(label => ({ label, count: matching.filter(row => row.finalRecorded && row.event.finalPlace === label).length }))
}

/** One league selection scopes final placements, Round 2 groups and recorded final outcomes. */
export function getCMLeagueSummary(rows: CMEventRecord[], league: string) {
  const matching = filterCMEventHistory(rows, "", league, "all")
  return {
    placements: getCMFinalPlacementCounts(matching, "all"),
    groups: (["A", "B"] as const).map(group => ({ group, events: matching.filter(row => row.round2Group === group).length })),
    finals: (["Final A", "Final B", "Eliminated"] as const).map(label => {
      const events = matching.filter(row => row.finalType === label)
      return { label, participated: label === "Eliminated" ? events.length : events.filter(row => row.finalRecorded).length,
        won: label === "Eliminated" ? null : events.filter(row => row.finalRecorded && row.event.finalPlace === "1st").length }
    }),
  }
}

export function filterCMEventHistory(rows: CMEventRecord[], search: string, league: string, finalType: string) {
  const query = search.trim().toLocaleLowerCase()
  return rows.filter(({ event, finalType: type }) =>
    (!query || `CM${event.number} ${event.number} ${event.name} ${event.track}`.toLocaleLowerCase().includes(query))
    && (league === "all" || event.league === league)
    && (finalType === "all" || type === finalType))
}
