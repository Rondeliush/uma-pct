import type { CM, UmaCharacter, UmaVersion } from "../types/types"
import type { LoH } from "../LoH/types"
import { calculateFinalQualificationFromAttempts, calculateOverallWinRateFromAttempts, calculateRound2GroupFromAttempts } from "../CMs/CMCalculations"
import { getCMFinalResults } from "../CMs/cmParticipantConfiguration"
import { getLoHExtraStageOutcome, getLoHPhase } from "../LoH/extraStage"
import { getLoHMainStage, getLoHParticipantStats, getLoHProgress, getLoHResultLineup, getUniqueTopScoringUma } from "../LoH/progress"
import { getLoHRankFromScore } from "../LoH/ranks"
import { LOH_BRONZE_CAP } from "../LoH/scoring"
import { LOH_MAIN_STAGE_DAYS, LOH_TICKET_CAP, LOH_TICKETS_PER_DAY } from "../LoH/constants"
import { calculateUmaDetailStatistics, getUmaDetailInsights } from "../Statistics/umaDetailStatistics"
import { calculateUmaStatistics, MIN_RACES_FOR_WIN_RATE, sortUmaPerformance } from "../Statistics/umaStatistics"
import type { UmaPerformance } from "../Statistics/umaStatistics"
import { calculateUmaRunningStyleStatistics } from "../Statistics/umaRunningStyleStatistics"
import { calculateTrackStatistics, withWinRate } from "../Statistics/trackStatistics"
import { isCMTeamPlacement } from "../CMs/cmFinalPlacements"

export type HomeEvent = ({ kind: "cm"; event: CM } | { kind: "loh"; event: LoH }) & { activityAt: number | null; completedAt: number | null }

function recordedTime(value: string | undefined): number | null {
  const time = value ? Date.parse(value) : NaN
  return Number.isFinite(time) ? time : null
}

function latestTime(times: (number | null)[]): number | null {
  const known = times.filter((time): time is number => time !== null)
  return known.length ? Math.max(...known) : null
}

export function isHomeEventCompleted(item: HomeEvent) {
  return item.kind === "cm" ? item.event.phase === "completed" || item.event.phase === "eliminated" : item.event.completed
}

export function getHomeEvents(cms: readonly CM[], lohs: readonly LoH[]): HomeEvent[] {
  return [
    ...cms.map((event): HomeEvent => ({ kind: "cm", event,
      activityAt: latestTime(event.log.map(entry => recordedTime(entry.timestamp))),
      completedAt: latestTime(event.log.filter(entry => entry.type === "completed" || entry.type === "eliminated").map(entry => recordedTime(entry.timestamp))),
    })),
    ...lohs.map((event): HomeEvent => ({ kind: "loh", event,
      activityAt: latestTime([...event.log.map(entry => recordedTime(entry.timestamp)), ...(event.raceSets ?? []).map(set => recordedTime(set.createdAt)), recordedTime(event.extraStage?.registeredAt), recordedTime(event.extraStage?.result?.createdAt)]),
      completedAt: latestTime(event.log.filter(entry => entry.type === "completed").map(entry => recordedTime(entry.timestamp)))
        ?? (event.completed ? recordedTime(event.extraStage?.result?.createdAt) : null),
    })),
  ]
}

/** One current event, even in older profiles containing several unfinished events. */
export function getHomeOverview(cms: readonly CM[], lohs: readonly LoH[]) {
  const events = getHomeEvents(cms, lohs)
  const recent = events.map((item, index) => ({ item, index })).filter(({ item }) => isHomeEventCompleted(item))
    .sort((a, b) => (b.item.completedAt ?? b.item.activityAt ?? -1) - (a.item.completedAt ?? a.item.activityAt ?? -1) || b.index - a.index)
    .map(({ item }) => item)
  const active = events.map((item, index) => ({ item, index })).filter(({ item }) => !isHomeEventCompleted(item))
    .sort((a, b) => (b.item.activityAt ?? -1) - (a.item.activityAt ?? -1) || b.index - a.index)[0]?.item ?? null
  return { active, recent: recent.slice(0, 3), lastCM: recent.find(item => item.kind === "cm") ?? null, lastLoH: recent.find(item => item.kind === "loh") ?? null, lastCompleted: recent[0] ?? null }
}

export function getHomeEventTitle(item: HomeEvent) {
  return `${item.kind === "cm" ? "CM" : "LoH"} #${item.event.number}${item.event.name ? ` — ${item.event.name}` : ""}`
}

/** Career totals count team races once; LoH raw points come only from recorded Main Stage placements. */
export function getHomeCareerStatistics(cms: CM[], lohs: LoH[]) {
  const rounds = calculateTrackStatistics(cms).overall
  const finals = cms.filter(cm => isCMTeamPlacement(cm.finalPlace))
  const loh = lohs.reduce((totals, event) => {
    const history = getLoHProgress(event)
    return {
      events: totals.events + 1,
      races: totals.races + history.racesPlayed + Number(!!event.extraStage?.result),
      rawPoints: totals.rawPoints + history.raceSets.reduce((sum, set) => sum + set.rawScore, 0),
    }
  }, { events: 0, races: 0, rawPoints: 0 })
  return {
    cm: withWinRate({ events: cms.length, races: rounds.races + finals.length,
      wins: rounds.wins + finals.filter(cm => cm.finalPlace === "1st").length }),
    loh,
  }
}

export function getHomeEventResult(item: HomeEvent) {
  if (item.kind === "cm") {
    if (item.event.phase === "eliminated") return "Eliminated"
    const group = calculateFinalQualificationFromAttempts(item.event.attempts)
    const place = item.event.finalPlace ? `${item.event.finalPlace} Place` : "Final result not recorded"
    return group === "Final A" || group === "Final B" ? `${group} · ${place}` : place
  }
  const outcome = getLoHExtraStageOutcome(item.event)
  const rank = item.event.overallRank === null ? "Overall Rank not recorded" : `Overall Rank #${item.event.overallRank.toLocaleString("en-US")}`
  return `${rank} · ${outcome === "winner" ? "Extra Stage Winner" : outcome === "participated" ? "Extra Stage Participant" : getLoHRankFromScore(item.event.leagueScore)}`
}

export function getHomeEventStatus(item: HomeEvent) {
  if (item.kind === "cm") {
    const cm = item.event
    const round2 = cm.attempts.some(attempt => attempt.day >= 3)
    const title = cm.phase === "finalLineup" ? "Final lineup required" : cm.phase === "finalResult" ? "Final result pending" : round2 ? "Round 2" : "Round 1"
    return { title, detail: cm.phase === "attempts" ? round2 ? `Group ${calculateRound2GroupFromAttempts(cm.attempts)}` : "Qualifying rounds" : calculateFinalQualificationFromAttempts(cm.attempts),
      action: cm.phase === "finalLineup" ? "Select Final Lineup" : "Continue CM", day: null, tab: "results" as const, winRate: calculateOverallWinRateFromAttempts(cm), ticketText: null }
  }
  const event = item.event, phase = getLoHPhase(event), stage = getLoHMainStage(event)
  const day = stage.activeDay
  const titles = { MAIN_STAGE: `Day ${day ?? 1} in progress`, AWAITING_MAIN_STAGE_RANK: "Confirm Overall Rank", NOT_QUALIFIED: "Main Stage complete", EXTRA_STAGE_QUALIFIED: "Extra Stage lineup required", EXTRA_STAGE_READY: "Extra Stage result pending", EXTRA_STAGE_RESULT_RECORDED: "Ready to complete LoH", COMPLETED: "Completed" }
  const ticketText = day === null ? null : event.leagueScore < LOH_BRONZE_CAP ? "Free" : `${stage.days[day - 1].ticketsRemaining} / ${Math.min(LOH_TICKET_CAP, day * LOH_TICKETS_PER_DAY)}`
  return { title: titles[phase], detail: day ? `Main Stage · Day ${day} / ${LOH_MAIN_STAGE_DAYS}` : event.overallRank === null ? "Main Stage complete" : `Overall Rank #${event.overallRank.toLocaleString("en-US")}`,
    action: day ? `Continue Day ${day}` : phase === "EXTRA_STAGE_QUALIFIED" ? "Set Lineup" : "Continue LoH", day, tab: phase === "EXTRA_STAGE_QUALIFIED" ? "umas" as const : "results" as const, winRate: null, ticketText }
}

export function getHomeEventLineup(item: HomeEvent) {
  if (item.kind === "loh") return getLoHResultLineup(item.event).map(uma => uma.umaId)
  const final = getCMFinalResults(item.event)
  if (item.event.phase !== "attempts" && final.length) return final.flatMap(result => result.configuration.umaVersionId ? [result.configuration.umaVersionId] : [])
  return item.event.currentLineup.flatMap(id => {
    const uma = item.event.participants.find(participant => participant.cmUmaId === id)
    return uma ? [uma.umaId] : []
  })
}

export function getHomeEventFeaturedUma(item: HomeEvent) {
  const winner = item.kind === "cm" ? getCMFinalResults(item.event).find(result => result.won)?.configuration.umaVersionId
    : item.event.extraStage?.result?.placements.find(result => result.placement === "first")?.umaId ?? getUniqueTopScoringUma(item.event)
  return winner ?? getHomeEventLineup(item)[0] ?? null
}

export function getLatestHomeUmas(ids: readonly string[], versions: readonly UmaVersion[]) {
  const byId = new Map(versions.map(version => [version.id, version]))
  return [...new Set(ids)].flatMap(id => { const version = byId.get(id); return version ? [version] : [] })
}

export type HomeFeaturedUma = { uma: UmaVersion; stats: Pick<UmaPerformance, "races" | "wins" | "winRate">; lohRawPoints: number | null }

/** Featured previews use the same version identity and minimum sample as Statistics. */
export function getHomeFeaturedUmas(performance: readonly UmaPerformance[], versions: readonly UmaVersion[], lohs: LoH[] = []): HomeFeaturedUma[] {
  const byId = new Map(versions.map(version => [version.id, version]))
  return performance.flatMap(stats => {
    const uma = byId.get(stats.versionId)
    return uma && stats.races >= MIN_RACES_FOR_WIN_RATE && stats.winRate !== null
      ? [{ uma, stats, lohRawPoints: getHomeFavoriteStatistics([], lohs, uma.id).loh.rawPoints }] : []
  })
}

export function getHomeFavoriteStatistics(cms: CM[], lohs: LoH[], versionId: string) {
  const cm = calculateUmaDetailStatistics(cms, versionId)
  const cmHighlights = getUmaDetailInsights(cm).highlights
  const records = lohs.flatMap(event => {
    const uma = getLoHParticipantStats(event).find(uma => uma.umaId === versionId)
    return uma && uma.races > 0 ? [{ event, uma }] : []
  })
  const races = records.reduce((sum, { uma }) => sum + uma.races, 0)
  const wins = records.reduce((sum, { uma }) => sum + uma.wins, 0)
  const rawPoints = records.some(({ uma }) => uma.totalPoints === undefined) ? null : records.reduce((sum, { uma }) => sum + (uma.totalPoints ?? 0), 0)
  return { cm, cmHighlights, loh: { events: records.length, races, wins, winRate: races ? wins / races * 100 : null, rawPoints,
    extraStages: records.filter(({ uma }) => uma.participatedInExtraStage).length,
    extraStageWins: records.filter(({ uma }) => uma.extraStagePlacement === "first").length } }
}

/** Presentation ranking uses Statistics' 10-race eligibility and WR/race-count ordering. */
function bestRecordedRate<T extends { races: number; winRate: number | null }>(rows: T[]) {
  return rows.filter(row => row.races >= MIN_RACES_FOR_WIN_RATE && row.winRate !== null)
    .sort((a, b) => (b.winRate ?? 0) - (a.winRate ?? 0) || b.races - a.races)[0] ?? null
}

export function getHomeCareerHighlights(cms: CM[], characters: UmaCharacter[], versions: UmaVersion[]) {
  const statistics = calculateUmaStatistics(cms, characters, versions)
  return { bestDistance: bestRecordedRate(statistics.distances), bestSurface: bestRecordedRate(statistics.surfaces),
    bestStyle: bestRecordedRate(calculateUmaRunningStyleStatistics(cms).rows),
    mostUsed: sortUmaPerformance(statistics.umas, "races")[0] ?? null }
}
