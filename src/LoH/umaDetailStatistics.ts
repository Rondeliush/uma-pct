import { withWinRate } from "../Statistics/trackStatistics"
import { getLoHLegacyProgress, getLoHMainStage, getLoHProgress } from "./progress"
import { getLoHRankFromScore, LOH_RANK_THRESHOLDS } from "./ranks"
import { getUmaLoHComparisonRecord } from "./umaComparison"
import type { LoH } from "./types"

/** Individual, exact-version history. Reuse Compare totals and canonical awarded-score history. */
export function getLoHUmaDetailStatistics(events: LoH[], versionId: string) {
  const totals = getUmaLoHComparisonRecord(events, versionId)
  const rows = events.flatMap(event => {
    const record = getUmaLoHComparisonRecord([event], versionId)
    if (!record.races) return []
    const history = getLoHProgress(event)
    const stage = getLoHMainStage(event, history)
    const legacy = getLoHLegacyProgress(event)?.participants.some(uma => uma.umaId === versionId && uma.races > 0)
    const sets = history.raceSets.filter(set => set.races.some(race => race.placements.some(uma => uma.umaId === versionId))).length
    const extraPlacement = event.extraStage?.result?.placements.find(uma => uma.umaId === versionId)?.placement ?? null
    return [{ event, ...record, races: record.races, wins: record.wins ?? 0,
      sets: legacy ? null : sets, rank: getLoHRankFromScore(history.leagueScore),
      mainStageComplete: stage.complete, qualified: stage.qualified,
      mainStageRaces: record.races - (record.extraStageRaces ?? 0), extraPlacement }]
  }).sort((a, b) => b.event.number - a.event.number)
  const mainEvents = rows.filter(row => row.mainStageRaces > 0)
  const extraEvents = rows.filter(row => (row.extraStageRaces ?? 0) > 0)
  const ranks = [...new Set(LOH_RANK_THRESHOLDS.map(([rank]) => rank.split(" ")[0]))].map(tier => ({
    tier, count: mainEvents.filter(row => row.mainStageComplete && row.rank.startsWith(`${tier} `)).length,
  }))
  const bestRank = mainEvents.filter(row => row.mainStageComplete).sort((a, b) =>
    LOH_RANK_THRESHOLDS.findIndex(([rank]) => rank === b.rank) - LOH_RANK_THRESHOLDS.findIndex(([rank]) => rank === a.rank))[0]?.rank ?? null
  return { totals, rows, ranks, bestRank,
    sets: rows.some(row => row.sets === null) ? null : rows.reduce((sum, row) => sum + row.sets!, 0),
    averageRawPointsPerEvent: totals.rawPoints !== null && totals.events ? totals.rawPoints / totals.events : null,
    top96: rows.filter(row => row.qualified).length,
    mainStage: withWinRate({ events: mainEvents.length, races: mainEvents.reduce((sum, row) => sum + row.mainStageRaces, 0),
      wins: mainEvents.reduce((sum, row) => sum + row.wins - (row.extraStageFirstPlaces ?? 0), 0) }),
    extraStage: withWinRate({ events: extraEvents.length, races: totals.extraStageRaces ?? 0, wins: totals.extraStageFirstPlaces ?? 0 }),
  }
}

export type LoHUmaDetailStatistics = ReturnType<typeof getLoHUmaDetailStatistics>
