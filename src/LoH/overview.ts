import { getLoHConfigurations } from "./configurations"
import { getLoHExtraStageOutcome, getLoHPhase } from "./extraStage"
import { getLoHMainStage, getLoHParticipantStats, getLoHProgress, getLoHResultLineup } from "./progress"
import { getLoHRankFromScore } from "./ranks"
import type { LoH, LoHPhase } from "./types"

export const LOHS_PER_PAGE = 10
export type LoHViewMode = "detailed" | "compact"
export type LoHSortMode = "number-desc" | "number-asc" | "added-desc" | "added-asc" | "score-desc" | "score-asc" | "rank-asc"
export type LoHOverviewFilters = { lengths: string[]; surfaces: string[]; racecourses: string[]; ranks: string[]; phases: string[]; extraStage: string[]; umaIds: string[] }
export const EMPTY_LOH_FILTERS: LoHOverviewFilters = { lengths: [], surfaces: [], racecourses: [], ranks: [], phases: [], extraStage: [], umaIds: [] }
export const LOH_PHASE_LABELS: Record<LoHPhase, string> = {
  MAIN_STAGE: "Main Stage", AWAITING_MAIN_STAGE_RANK: "Awaiting Overall Rank", NOT_QUALIFIED: "Not Qualified",
  EXTRA_STAGE_QUALIFIED: "Extra Stage Qualified", EXTRA_STAGE_READY: "Extra Stage Registered",
  EXTRA_STAGE_RESULT_RECORDED: "Extra Stage Result Recorded", COMPLETED: "Completed",
}

/** Use recorded snapshots, including historical and registered Extra Stage Umas. */
export function getLoHOverviewUmaIds(event: LoH): string[] {
  return [...new Set([...getLoHConfigurations(event), ...(event.extraStage?.lineupSnapshot ?? [])].map(uma => uma.umaId))]
}

/** Both card views show the saved result trio and each version's recorded totals. */
export function getLoHCardLineup(event: LoH) {
  const stats = new Map(getLoHParticipantStats(event).map(uma => [uma.umaId, uma]))
  return getLoHResultLineup(event).map(uma => ({
    ...uma,
    rawPoints: stats.get(uma.umaId)?.totalPoints ?? null,
    extraStagePlacement: stats.get(uma.umaId)?.extraStagePlacement,
  }))
}

/** Main Stage performance and confirmed Top 96 finishes retain separate scopes. */
export function getLoHOverviewStats(events: readonly LoH[]) {
  let races = 0, wins = 0, top96Finishes = 0, leaguePoints = 0
  for (const event of events) {
    const history = getLoHProgress(event)
    races += history.racesPlayed
    wins += history.firstPlaces
    leaguePoints += history.leagueScore
    top96Finishes += Number(getLoHMainStage(event, history).qualified)
  }
  return { events: events.length, races, wins, top96Finishes, winRate: races > 0 ? wins / races * 100 : 0,
    averagePoints: events.length > 0 ? leaguePoints / events.length : 0 }
}

export function filterLoHEvents(events: readonly LoH[], filters: LoHOverviewFilters): LoH[] {
  const matches = (selected: string[], value: string | null) => selected.length === 0 || (value !== null && selected.includes(value))
  return events.filter(event => {
    if (!matches(filters.lengths, event.length) || !matches(filters.surfaces, event.surface) || !matches(filters.racecourses, event.racecourse)
      || !matches(filters.ranks, getLoHRankFromScore(event.leagueScore)) || !matches(filters.phases, getLoHPhase(event))) return false
    if (filters.umaIds.length && !getLoHOverviewUmaIds(event).some(id => filters.umaIds.includes(id))) return false
    if (!filters.extraStage.length) return true
    const stage = getLoHMainStage(event), outcome = getLoHExtraStageOutcome(event)
    return filters.extraStage.some(value => value === "qualified" ? stage.qualified
      : value === "not-qualified" ? stage.complete && event.overallRank !== null && !stage.qualified
      : value === "winner" ? outcome === "winner" : value === "participated" && outcome === "participated")
  })
}

export function sortLoHEvents(events: readonly LoH[], sort: LoHSortMode): LoH[] {
  const result = [...events]
  if (sort === "added-asc") return result
  if (sort === "added-desc") return result.reverse()
  return result.sort((a, b) => sort === "number-asc" ? a.number - b.number : sort === "number-desc" ? b.number - a.number
    : sort === "score-asc" ? a.leagueScore - b.leagueScore || a.number - b.number
    : sort === "score-desc" ? b.leagueScore - a.leagueScore || b.number - a.number
    : (a.overallRank ?? Infinity) - (b.overallRank ?? Infinity) || b.number - a.number)
}

export function paginateLoHEvents(events: readonly LoH[], requestedPage: number) {
  const totalPages = Math.max(1, Math.ceil(events.length / LOHS_PER_PAGE))
  const page = Math.min(totalPages, Math.max(1, Math.floor(requestedPage) || 1))
  return { page, totalPages, events: events.slice((page - 1) * LOHS_PER_PAGE, page * LOHS_PER_PAGE) }
}

export function getLoHPageNumbers(page: number, total: number): (number | "gap")[] {
  const numbers = [...new Set([1, total, page - 1, page, page + 1].filter(value => value >= 1 && value <= total))].sort((a, b) => a - b)
  return numbers.flatMap((value, index) => index > 0 && value - numbers[index - 1] > 1 ? ["gap" as const, value] : [value])
}
