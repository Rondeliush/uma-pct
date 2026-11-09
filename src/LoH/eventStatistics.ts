import { getLoHExtraStageOutcome } from "./extraStage"
import { getLoHLegacyProgress, getLoHMainStage, getLoHParticipantStats, getLoHProgress } from "./progress"
import { getLoHRankFromScore, LOH_RANK_THRESHOLDS } from "./ranks"
import { LOH_ENTRY_PLACEMENTS } from "./scoring"
import type { LoH } from "./types"
import { withWinRate } from "../Statistics/trackStatistics"

/** Awarded score, raw points and team races remain separate canonical measures. */
export function getLoHEventStatistics(events: LoH[]) {
  const rows = events.map(event => {
    const history = getLoHProgress(event)
    const stage = getLoHMainStage(event, history)
    const legacy = getLoHLegacyProgress(event)
    const participants = getLoHParticipantStats(event, history)
    const extraStageOutcome = getLoHExtraStageOutcome(event)
    const rawPoints = participants.some(uma => uma.totalPoints === undefined)
      || (legacy && legacy.racesPlayed > 0 && legacy.participants.length === 0) ? null
      : participants.reduce((sum, uma) => sum + (uma.totalPoints ?? 0), 0)
    return { event, ...withWinRate({ races: history.racesPlayed + Number(extraStageOutcome !== null), wins: history.firstPlaces + Number(extraStageOutcome === "winner") }),
      sets: history.raceSets.length, rawPoints, leagueRank: getLoHRankFromScore(history.leagueScore), qualified: stage.qualified,
      mainStageComplete: stage.complete, extraStageOutcome }
  }).sort((a, b) => b.event.number - a.event.number)
  const rawPoints = rows.some(row => row.rawPoints === null) ? null : rows.reduce((sum, row) => sum + row.rawPoints!, 0)
  const totals = { ...withWinRate({ events: rows.length, races: rows.reduce((sum, row) => sum + row.races, 0), wins: rows.reduce((sum, row) => sum + row.wins, 0) }),
    rawPoints, averageRawPoints: rawPoints === null ? null : rows.length ? rawPoints / rows.length : 0 }
  const placements = LOH_ENTRY_PLACEMENTS.map(() => 0)
  let unresolvedExtraStagePlacements = 0
  for (const event of events) {
    for (const set of getLoHProgress(event).raceSets) for (const race of set.races) for (const { place } of race.placements) {
      placements[place === "6+" ? placements.length - 1 : Math.min(place, placements.length) - 1]++
    }
    for (const { placement } of event.extraStage?.result?.placements ?? []) {
      // Extra Stage records only 1st, 2nd, 3rd or 4th+; do not invent an exact lower place.
      if (placement === "fourth_or_lower") unresolvedExtraStagePlacements++
      else placements[placement === "first" ? 0 : placement === "second" ? 1 : 2]++
    }
  }
  const ranks = [...new Set(LOH_RANK_THRESHOLDS.map(([rank]) => rank.split(" ")[0]))].map(tier => ({ tier,
    count: rows.filter(row => row.mainStageComplete && row.leagueRank.startsWith(`${tier} `)).length }))
  const bestRank = rows.filter(row => row.mainStageComplete && Number.isSafeInteger(row.event.overallRank) && row.event.overallRank! > 0)
    .slice().sort((a, b) => a.event.overallRank! - b.event.overallRank!)[0] ?? null
  const mostRawPoints = rows.filter(row => row.rawPoints !== null && row.rawPoints > 0)
    .slice().sort((a, b) => b.rawPoints! - a.rawPoints! || b.event.number - a.event.number)[0] ?? null
  return { rows, totals, placements, unresolvedExtraStagePlacements, ranks, bestRank, mostRawPoints, top96: rows.filter(row => row.qualified).length,
    rankedEvents: rows.filter(row => row.mainStageComplete && Number.isSafeInteger(row.event.overallRank) && row.event.overallRank! > 0).length,
    extraStageWins: rows.filter(row => row.extraStageOutcome === "winner").length }
}

export type LoHEventRecord = ReturnType<typeof getLoHEventStatistics>["rows"][number]

export function filterLoHEventHistory(rows: LoHEventRecord[], search: string, tier: string, status: string) {
  const query = search.trim().toLocaleLowerCase()
  return rows.filter(row => (!query || `LoH${row.event.number} ${row.event.number} ${row.event.name} ${row.event.racecourse}`.toLocaleLowerCase().includes(query))
    && (tier === "all" || row.leagueRank.startsWith(`${tier} `))
    && (status === "all" || (status === "completed" ? row.event.completed : status === "active" ? !row.event.completed : row.qualified)))
}
