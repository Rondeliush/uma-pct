import type { LoH, LoHCalculatedRaceSet, LoHDayState, LoHExtraStageResult, LoHLegacyProgress, LoHLineupMember, LoHRaceSet, LoHRaceSetInput, LoHUma } from "./types"
import { assertLoHExtraStage, getLoHExtraStageCandidates, getLoHPhase } from "./extraStage"
import { LOH_EXTRA_STAGE_CUTOFF, LOH_LINEUP_SIZE, LOH_MAIN_STAGE_DAYS, LOH_RACES_PER_SET, LOH_TICKET_CAP, LOH_TICKETS_PER_DAY } from "./constants"
import { calculateLoHSetScore, getLoHPlacementPoints, getLoHRaceRawScore, LOH_BRONZE_CAP } from "./scoring"
import { getLoHRankFromScore } from "./ranks"
import { formatLoHNumber } from "./format"
import { getLoHCompletionLog } from "./changeLog"
import { TRACK_CONDITIONS, TRACK_WEATHER } from "../types/types"
import { getLoHConfigurationKey, getLoHConfigurations, snapshotLoHConfiguration } from "./configurations"
import type { LoHVersionIdentity } from "./configurations"

export function getLoHLineupSnapshot(event: LoH): LoHLineupMember[] {
  return event.currentLineup.map(umaId => {
    const participant = event.participants.find(item => item.umaId === umaId)
    return { umaId, runningStyle: participant?.runningStyle, ace: participant?.ace, debuffer: participant?.debuffer, autoRun: participant?.autoRun }
  })
}

export function hasCompleteLoHLineup(event: LoH): boolean {
  return event.currentLineup.length === LOH_LINEUP_SIZE && new Set(event.currentLineup).size === LOH_LINEUP_SIZE &&
    event.currentLineup.every(id => id.trim() !== "" && event.participants.some(uma => uma.umaId === id))
}

/** Older aggregate-only results stay explicit, never expanded into invented races. */
export function getLoHLegacyProgress(event: LoH): LoHLegacyProgress | undefined {
  if (event.raceSets !== undefined) return event.legacyProgress
  if (event.leagueScore === 0 && event.racesPlayed === 0 && event.firstPlaces === 0 && event.top3Finishes === 0 &&
    event.participants.every(uma => uma.races === 0 && uma.wins === 0 && uma.top3Finishes === 0 && !uma.totalPoints)) return undefined
  return {
    leagueScore: event.leagueScore, racesPlayed: event.racesPlayed, firstPlaces: event.firstPlaces, top3Finishes: event.top3Finishes,
    participants: event.participants.map(uma => ({ ...uma })),
  }
}

export function assertLoHRaceSet(set: LoHRaceSetInput, requireConditions = false) {
  if (!set.id.trim() || !Number.isFinite(Date.parse(set.createdAt))) throw new Error("Invalid race set identifier or date.")
  if (!Number.isInteger(set.day) || set.day < 1 || set.day > LOH_MAIN_STAGE_DAYS) throw new Error("Choose Day 1–6.")
  if (set.order !== undefined && (!Number.isSafeInteger(set.order) || set.order < 1)) throw new Error("Invalid set order.")
  if (requireConditions && (!set.weather || !set.condition)) throw new Error("Choose Weather and Condition for this race set.")
  if ((set.weather !== null && !TRACK_WEATHER.includes(set.weather)) || (set.condition !== null && !TRACK_CONDITIONS.includes(set.condition))) throw new Error("Choose valid weather and track conditions, or leave them unknown.")
  const ids = set.lineupSnapshot.map(uma => uma.umaId)
  if (ids.length !== LOH_LINEUP_SIZE || new Set(ids).size !== LOH_LINEUP_SIZE || ids.some(id => !id.trim())) throw new Error("Complete your current lineup before adding race results.")
  if (set.races.length !== LOH_RACES_PER_SET || new Set(set.races.map(race => race.id)).size !== LOH_RACES_PER_SET) throw new Error("A race set must contain five different races.")
  for (const race of set.races) {
    if (!race.id.trim() || race.placements.length !== LOH_LINEUP_SIZE || new Set(race.placements.map(item => item.umaId)).size !== LOH_LINEUP_SIZE || race.placements.some(item => !ids.includes(item.umaId))) throw new Error("Each race must use the same three Umas from its lineup snapshot.")
    getLoHRaceRawScore(race.placements.map(item => item.place))
  }
}

/** Days are chronological. Explicit set order is stable across edits and recording dates. */
export function recalculateLoHProgress(inputs: readonly LoHRaceSetInput[], legacy?: LoHLegacyProgress) {
  if (new Set(inputs.map(set => set.id)).size !== inputs.length) throw new Error("Race set IDs must be unique.")
  let leagueScore = legacy?.leagueScore ?? 0
  let racesPlayed = legacy?.racesPlayed ?? 0
  let firstPlaces = legacy?.firstPlaces ?? 0
  let top3Finishes = legacy?.top3Finishes ?? 0
  const byTime = [...inputs].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
  const fallbackOrders = new Map<string, number>()
  const dayCounts = new Map<number, number>()
  for (const set of byTime) {
    if (set.order !== undefined) continue
    const count = (dayCounts.get(set.day) ?? 0) + 1
    dayCounts.set(set.day, count)
    fallbackOrders.set(set.id, count)
  }
  const localNumbers = new Map<number, number>()
  const raceSets: LoHCalculatedRaceSet[] = byTime.sort((a, b) => a.day - b.day || (a.order ?? fallbackOrders.get(a.id)!) - (b.order ?? fallbackOrders.get(b.id)!)).map(set => {
    assertLoHRaceSet(set)
    const rawScores = set.races.map(race => getLoHRaceRawScore(race.placements.map(item => item.place)))
    const scoring = calculateLoHSetScore(rawScores, leagueScore)
    leagueScore = scoring.scoreAfter
    racesPlayed += set.races.length
    const races = set.races.map((race, raceIndex) => ({
      ...race, placements: race.placements.map(placement => {
        if (placement.place === 1) firstPlaces++
        if (typeof placement.place === "number" && placement.place <= 3) top3Finishes++
        return { ...placement, rawPoints: getLoHPlacementPoints(placement.place) }
      }), rawScore: rawScores[raceIndex], awardedScore: scoring.awardedScores[raceIndex],
    }))
    const setNumber = (localNumbers.get(set.day) ?? 0) + 1
    localNumbers.set(set.day, setNumber)
    return { ...set, ...scoring, setNumber, lineupSnapshot: set.lineupSnapshot.map(uma => ({ ...uma })), races }
  })
  return { raceSets, leagueScore, leagueRank: getLoHRankFromScore(leagueScore), racesPlayed, firstPlaces, top3Finishes }
}

export function getLoHProgress(event: LoH) {
  return recalculateLoHProgress(event.raceSets ?? [], getLoHLegacyProgress(event))
}

/** Cumulative awarded points through this day; empty days carry the preceding score. */
export function getLoHLeagueScoreAtDay(event: LoH, day: number, history = getLoHProgress(event)): number {
  return history.raceSets.filter(set => set.day <= day).at(-1)?.scoreAfter ?? getLoHLegacyProgress(event)?.leagueScore ?? 0
}

export function getLoHParticipantStats(event: LoH, history = getLoHProgress(event), includeLegacy = true) {
  const legacy = includeLegacy ? getLoHLegacyProgress(event) : undefined
  const finalResults = event.extraStage?.result?.placements ?? []
  const ids = new Set([...event.currentLineup, ...(legacy?.participants.map(uma => uma.umaId) ?? []), ...history.raceSets.flatMap(set => set.lineupSnapshot.map(uma => uma.umaId)), ...finalResults.map(item => item.umaId)])
  return [...ids].map(umaId => {
    const previous = legacy?.participants.filter(uma => uma.umaId === umaId) ?? []
    const recorded = history.raceSets.flatMap(set => set.races.flatMap(race => race.placements.filter(item => item.umaId === umaId)))
    const legacyRaces = previous.reduce((sum, uma) => sum + uma.races, 0)
    const extraPlacement = finalResults.find(item => item.umaId === umaId)?.placement
    const extraPlace = extraPlacement === "first" ? 1 : extraPlacement === "second" ? 2 : extraPlacement === "third" ? 3 : null
    const races = legacyRaces + recorded.length + (extraPlacement ? 1 : 0)
    const hasUnknownAverage = previous.some(uma => uma.races > 0 && uma.avgPlace == null) || recorded.some(item => item.place === "6+") || extraPlacement === "fourth_or_lower"
    const hasUnknownPoints = previous.some(uma => uma.races > 0 && uma.totalPoints === undefined)
    const participant: Partial<LoHUma> = { ...(event.participants.find(uma => uma.umaId === umaId) ?? event.extraStage?.lineupSnapshot.find(uma => uma.umaId === umaId)) }
    delete participant.participatedInExtraStage
    delete participant.extraStagePlacement
    return {
      ...participant, umaId, races,
      wins: previous.reduce((sum, uma) => sum + uma.wins, 0) + recorded.filter(item => item.place === 1).length + (extraPlacement === "first" ? 1 : 0),
      top3Finishes: previous.reduce((sum, uma) => sum + uma.top3Finishes, 0) + recorded.filter(item => typeof item.place === "number" && item.place <= 3).length + (extraPlace === null ? 0 : 1),
      totalPoints: hasUnknownPoints ? undefined : previous.reduce((sum, uma) => sum + (uma.totalPoints ?? 0), 0) + recorded.reduce((sum, item) => sum + item.rawPoints, 0),
      avgPlace: races === 0 || hasUnknownAverage ? null : (previous.reduce((sum, uma) => sum + (uma.avgPlace ?? 0) * uma.races, 0) + recorded.reduce((sum, item) => sum + (typeof item.place === "number" ? item.place : 0), 0) + (extraPlace ?? 0)) / races,
      ...(extraPlacement ? { participatedInExtraStage: true, extraStagePlacement: extraPlacement } : {}),
    } satisfies LoHUma
  })
}

/** Read-only presentation statistics; aliases and rates are never saved to ProfileData. */
export function getLoHUmaStats(event: LoH) {
  return getLoHParticipantStats(event, getLoHProgress(event), false).map(uma => ({
    ...uma,
    rawPoints: uma.totalPoints ?? 0,
    winRate: uma.races > 0 ? uma.wins / uma.races * 100 : 0,
    averagePlacement: uma.avgPlace ?? null,
  }))
}

/** Configuration cards use only matching snapshots; version totals above stay aggregated. */
export function getLoHConfigurationStats(event: LoH) {
  const history = getLoHProgress(event)
  const legacy = getLoHLegacyProgress(event)
  const configurations = new Map([...getLoHConfigurations(event, history.raceSets), ...(event.extraStage?.result ? event.extraStage.lineupSnapshot : [])]
    .map(uma => [getLoHConfigurationKey(uma), uma]))
  return [...configurations.values()].map(uma => {
    const key = getLoHConfigurationKey(uma)
    const previous = legacy?.participants.filter(item => getLoHConfigurationKey(item) === key) ?? []
    const recorded = history.raceSets.filter(set => set.lineupSnapshot.some(item => getLoHConfigurationKey(item) === key))
      .flatMap(set => set.races.flatMap(race => race.placements.filter(item => item.umaId === uma.umaId)))
    const extra = event.extraStage
    const extraPlacement = extra?.lineupSnapshot.some(item => getLoHConfigurationKey(item) === key)
      ? extra.result?.placements.find(item => item.umaId === uma.umaId)?.placement : undefined
    const extraPlace = extraPlacement === "first" ? 1 : extraPlacement === "second" ? 2 : extraPlacement === "third" ? 3 : null
    const races = previous.reduce((sum, item) => sum + item.races, 0) + recorded.length + Number(!!extraPlacement)
    const wins = previous.reduce((sum, item) => sum + item.wins, 0) + recorded.filter(item => item.place === 1).length + Number(extraPlacement === "first")
    const unknownAverage = previous.some(item => item.races > 0 && item.avgPlace == null) || recorded.some(item => item.place === "6+") || extraPlacement === "fourth_or_lower"
    const unknownPoints = previous.some(item => item.races > 0 && item.totalPoints === undefined)
    return {
      ...uma, key, races, wins,
      rawPoints: unknownPoints ? null : previous.reduce((sum, item) => sum + (item.totalPoints ?? 0), 0) + recorded.reduce((sum, item) => sum + item.rawPoints, 0),
      winRate: races > 0 ? wins / races * 100 : 0,
      averagePlacement: races === 0 || unknownAverage ? null : (previous.reduce((sum, item) => sum + (item.avgPlace ?? 0) * item.races, 0) + recorded.reduce((sum, item) => sum + (typeof item.place === "number" ? item.place : 0), 0) + (extraPlace ?? 0)) / races,
      participatedInExtraStage: !!extraPlacement, extraStagePlacement: extraPlacement,
    }
  })
}

/** Main Stage completion freezes the displayed trio to the last recorded snapshot. */
export function getLoHResultLineup(event: LoH): LoHLineupMember[] {
  if (event.extraStage) return event.extraStage.lineupSnapshot
  const lastSet = getLoHMainStage(event).complete ? getLoHProgress(event).raceSets.at(-1) : undefined
  return lastSet ? lastSet.lineupSnapshot : getLoHLineupSnapshot(event)
}

/** Only recorded raw points of the displayed trio count; no tiebreaker or stored MVP. */
export function getUniqueTopScoringUma(event: LoH, lineup = getLoHResultLineup(event)): string | null {
  if (!event.raceSets?.length || lineup.length !== LOH_LINEUP_SIZE) return null
  const stats = getLoHUmaStats(event)
  const candidates = lineup.map(uma => ({ id: uma.umaId, points: stats.find(item => item.umaId === uma.umaId)?.rawPoints ?? 0 }))
  const highest = Math.max(...candidates.map(uma => uma.points))
  const leaders = candidates.filter(uma => uma.points === highest)
  return highest > 0 && leaders.length === 1 ? leaders[0].id : null
}

function storeRaceSet(set: LoHCalculatedRaceSet): LoHRaceSet {
  return {
    id: set.id, createdAt: set.createdAt, day: set.day, lineupSnapshot: set.lineupSnapshot,
    ...(set.order === undefined ? {} : { order: set.order }),
    weather: set.weather, condition: set.condition, ticketUsed: set.ticketUsed,
    races: set.races.map(race => ({ id: race.id, placements: race.placements.map(({ umaId, place }) => ({ umaId, place })) })),
  }
}

/** Existing aggregate fields are compatibility caches, updated only from authoritative inputs. */
export function synchronizeLoHProgress(event: LoH, inputs = event.raceSets ?? []): LoH {
  const legacyProgress = getLoHLegacyProgress(event)
  const history = recalculateLoHProgress(inputs, legacyProgress)
  const stats = getLoHParticipantStats({ ...event, raceSets: inputs, legacyProgress }, history)
  const registry = [...new Map(event.participants.map(uma => [uma.umaId, uma])).values()]
  const participants = registry.map(uma => stats.find(item => item.umaId === uma.umaId) ?? { ...uma, races: 0, wins: 0, top3Finishes: 0, totalPoints: 0, avgPlace: null })
  for (const uma of stats) if (!participants.some(item => item.umaId === uma.umaId)) participants.push(uma)
  return {
    ...event, ...(legacyProgress ? { legacyProgress } : {}), raceSets: history.raceSets.map(storeRaceSet), participants,
    leagueScore: history.leagueScore, leagueRank: history.leagueRank, racesPlayed: history.racesPlayed + (event.extraStage?.result ? 1 : 0),
    firstPlaces: history.firstPlaces + (event.extraStage?.result?.placements.filter(item => item.placement === "first").length ?? 0),
    top3Finishes: history.top3Finishes + (event.extraStage?.result?.placements.filter(item => item.placement !== "fourth_or_lower").length ?? 0),
  }
}

function rankChangeLog(event: LoH, updated: LoH, timestamp: string, id: string) {
  const before = getLoHRankFromScore(event.leagueScore)
  return before === updated.leagueRank ? [] : [{ id: `${id}-rank`, timestamp, type: "leagueRankUpdated" as const, message: "League Rank updated.", details: [`${before} → ${updated.leagueRank}`] }]
}

export function saveLoHRaceSet(event: LoH, input: LoHRaceSetInput, timestamp = new Date().toISOString()): LoH {
  const existing = event.raceSets?.find(set => set.id === input.id)
  const stage = getLoHMainStage(event)
  assertActiveLoHDay(event, existing?.day ?? input.day, stage)
  if (existing && input.day !== existing.day) throw new Error("A saved race set must keep its original day.")
  if (!existing && !stage.canAddSet) throw new Error(`No League Tickets remaining for Day ${input.day}. Finish the day to continue.`)
  if (!existing && (!hasCompleteLoHLineup(event) || input.lineupSnapshot.some((uma, index) => uma.umaId !== event.currentLineup[index]))) throw new Error("The current lineup has changed. Reopen Add Results to use the current team.")
  if (existing && JSON.stringify(existing.lineupSnapshot) !== JSON.stringify(input.lineupSnapshot)) throw new Error("A saved race set must keep its original lineup snapshot.")
  const daySets = getLoHProgress(event).raceSets.filter(set => set.day === input.day)
  const source = { ...input, createdAt: existing?.createdAt ?? input.createdAt,
    order: existing ? existing.order : Math.max(0, ...daySets.map(set => set.order ?? set.setNumber)) + 1 }
  assertLoHRaceSet(source, true)
  for (const [raceIndex, race] of source.races.entries()) for (const placement of race.placements) {
    if (typeof placement.place === "number" && placement.place > 5 && existing?.races[raceIndex]?.placements.find(item => item.umaId === placement.umaId)?.place !== placement.place) throw new Error("Use 6th+ for a new placement outside the top five.")
  }
  const replacement = { ...source, ticketUsed: false }
  const inputs = existing ? event.raceSets!.map(set => set.id === source.id ? replacement : set) : [...(event.raceSets ?? []), replacement]
  const updated = synchronizeLoHProgress({ ...event, mainStage: { completedDays: stage.completedDays } }, inputs)
  assertLoHTicketBudget(stage, getLoHMainStage(updated))
  const saved = getLoHProgress(updated).raceSets.find(set => set.id === source.id)!
  const logId = `${source.id}-${timestamp}`
  return {
    ...updated, log: [...event.log, {
      id: logId, timestamp, type: existing ? "raceSetEdited" : "raceSetSaved",
      message: `Day ${saved.day} · Race Set #${saved.setNumber} ${existing ? "updated" : "saved"}.`,
      details: [`+${formatLoHNumber(saved.awardedScore)} League Points`, ...(saved.rawScore !== saved.awardedScore ? [`${formatLoHNumber(saved.rawScore)} raw points. Bronze cap applied.`] : []), ...(saved.scoreBefore < LOH_BRONZE_CAP && saved.scoreAfter === LOH_BRONZE_CAP ? ["Reached Silver I."] : [])],
    }, ...rankChangeLog(event, updated, timestamp, logId)],
  }
}

export function deleteLoHRaceSet(event: LoH, id: string, timestamp = new Date().toISOString()): LoH {
  const history = getLoHProgress(event)
  const removed = history.raceSets.find(set => set.id === id)
  if (!removed) throw new Error("Race set not found.")
  const stage = getLoHMainStage(event)
  assertActiveLoHDay(event, removed.day, stage)
  const updated = synchronizeLoHProgress({ ...event, mainStage: { completedDays: stage.completedDays } }, (event.raceSets ?? []).filter(set => set.id !== id))
  assertLoHTicketBudget(stage, getLoHMainStage(updated))
  const logId = `${id}-deleted-${timestamp}`
  return { ...updated, log: [...event.log, { id: logId, timestamp, type: "raceSetDeleted", message: `Day ${removed.day} · Race Set #${removed.setNumber} deleted.` }, ...rankChangeLog(event, updated, timestamp, logId)] }
}

export function getLoHDailySummaries(event: LoH) {
  const days = new Map<number, { day: number; sets: LoHCalculatedRaceSet[]; races: number; rawScore: number; awardedScore: number }>()
  for (const set of getLoHProgress(event).raceSets) {
    const day = days.get(set.day) ?? { day: set.day, sets: [], races: 0, rawScore: 0, awardedScore: 0 }
    day.sets.push(set)
    day.races += set.races.length
    day.rawScore += set.rawScore
    day.awardedScore += set.awardedScore
    days.set(set.day, day)
  }
  return [...days.values()].sort((a, b) => a.day - b.day)
}

/** One derived view of day access, FREE/TICKET usage, carry and the inventory cap. */
export function getLoHMainStage(event: LoH, history = getLoHProgress(event)) {
  // Old profiles allowed arbitrary days. Preserve that history, treating earlier days as closed.
  const legacyLastDay = Math.max(1, ...history.raceSets.map(set => set.day))
  const completedDays = event.completed ? Array.from({ length: LOH_MAIN_STAGE_DAYS }, (_, i) => i + 1)
    : event.mainStage?.completedDays ?? Array.from({ length: legacyLastDay - 1 }, (_, i) => i + 1)
  const complete = completedDays.length === LOH_MAIN_STAGE_DAYS
  const activeDay = complete ? null : completedDays.length + 1
  let tickets = 0
  const days = Array.from({ length: LOH_MAIN_STAGE_DAYS }, (_, index) => {
    const day = index + 1
    const state: LoHDayState = completedDays.includes(day) ? "completed" : day === activeDay ? "active" : "locked"
    const sets = history.raceSets.filter(set => set.day === day)
    const ticketedSets = sets.filter(set => set.ticketUsed).length
    const ticketsAtStart = state === "locked" ? 0 : Math.min(LOH_TICKET_CAP, tickets + LOH_TICKETS_PER_DAY)
    const ticketDeficit = state === "locked" ? ticketedSets : Math.max(0, ticketedSets - ticketsAtStart)
    if (state !== "locked") tickets = Math.max(0, ticketsAtStart - ticketedSets)
    return { day, state, sets, races: sets.reduce((sum, set) => sum + set.races.length, 0),
      freeSets: sets.length - ticketedSets, ticketedSets, ticketsAtStart,
      ticketsRemaining: state === "locked" ? 0 : tickets, ticketDeficit,
      rawScore: sets.reduce((sum, set) => sum + set.rawScore, 0), awardedScore: sets.reduce((sum, set) => sum + set.awardedScore, 0) }
  })
  const canAddSet = !event.completed && activeDay !== null && (history.leagueScore < LOH_BRONZE_CAP || days[activeDay - 1].ticketsRemaining > 0)
  return { days, completedDays: [...completedDays], activeDay, complete, ticketsRemaining: tickets, canAddSet,
    qualified: complete && Number.isSafeInteger(event.overallRank) && event.overallRank !== null && event.overallRank >= 1 && event.overallRank <= LOH_EXTRA_STAGE_CUTOFF }
}

export function isLoHMainStageLineupLocked(event: LoH): boolean {
  return getLoHMainStage(event).complete
}

function assertActiveLoHDay(event: LoH, day: number, stage = getLoHMainStage(event)) {
  if (event.completed || stage.days[day - 1]?.state !== "active") throw new Error(`Day ${day} is locked or completed. Only the active day can be changed.`)
}

function assertLoHTicketBudget(before: ReturnType<typeof getLoHMainStage>, after: ReturnType<typeof getLoHMainStage>) {
  if (after.days.some((day, index) => day.ticketDeficit > before.days[index].ticketDeficit)) throw new Error("Not enough League Tickets. This change would exceed the day's ticket inventory.")
}

export function finishLoHDay(event: LoH, day: number): LoH {
  const stage = getLoHMainStage(event)
  assertActiveLoHDay(event, day, stage)
  return { ...event, mainStage: { completedDays: [...stage.completedDays, day] }, ...(day === LOH_MAIN_STAGE_DAYS ? { overallRank: null } : {}) }
}

export function finishLoHEvent(event: LoH, timestamp = new Date().toISOString()): LoH {
  const stage = getLoHMainStage(event)
  if (!stage.complete || !Number.isSafeInteger(event.overallRank) || event.overallRank! < 1 || (stage.qualified && !event.extraStage?.result)) throw new Error("Confirm the Main Stage rank and record Extra Stage when qualified before ending LoH.")
  if (event.completed) return event
  return { ...event, completed: true, log: event.log.some(entry => entry.type === "completed")
    ? event.log : [...event.log, { ...getLoHCompletionLog(event), timestamp }] }
}

export function confirmLoHMainStageRank(event: LoH, rank: number): LoH {
  if (getLoHPhase(event) !== "AWAITING_MAIN_STAGE_RANK") throw new Error("The final Main Stage rank can only be confirmed once, after Day 6.")
  if (!Number.isSafeInteger(rank) || rank < 1) throw new Error("Enter a positive integer for Final Overall Rank.")
  return { ...event, overallRank: rank }
}

export function registerLoHExtraStageLineup(event: LoH, keys: readonly string[], registeredAt = new Date().toISOString(), versions: readonly LoHVersionIdentity[] = []): LoH {
  if (getLoHPhase(event) !== "EXTRA_STAGE_QUALIFIED") throw new Error("Register Extra Stage after confirming a Top 96 rank.")
  if (keys.length !== LOH_LINEUP_SIZE || new Set(keys).size !== LOH_LINEUP_SIZE) throw new Error("Choose exactly three different Umas.")
  const candidates = getLoHExtraStageCandidates(event, getLoHProgress(event).raceSets)
  const lineupSnapshot = keys.map(key => candidates.find(uma => getLoHConfigurationKey(uma) === key) ??
    // Older callers can pass a version ID only when it identifies exactly one configuration.
    (candidates.filter(uma => uma.umaId === key).length === 1 ? candidates.find(uma => uma.umaId === key) : undefined))
  if (lineupSnapshot.some(uma => !uma)) throw new Error("Choose participants from this LoH's Main Stage history.")
  const updated = { ...event, extraStage: { registeredAt, lineupSnapshot: lineupSnapshot.map(uma => snapshotLoHConfiguration(uma!)) } }
  assertLoHExtraStage(updated, versions)
  return updated
}

export function saveLoHExtraStageResult(event: LoH, input: LoHExtraStageResult): LoH {
  if (getLoHPhase(event) !== "EXTRA_STAGE_READY") throw new Error("Register an Extra Stage lineup before recording its single final race. A recorded result is read-only.")
  const updated: LoH = { ...event, extraStage: { ...event.extraStage!, result: {
    id: input.id, createdAt: input.createdAt, weather: input.weather, condition: input.condition,
    placements: input.placements.map(item => ({ ...item })),
  } } }
  assertLoHExtraStage(updated)
  return synchronizeLoHProgress(updated)
}

/** The final form records the single Extra Stage race and completes LoH in one action. */
export function completeLoHExtraStage(event: LoH, input: LoHExtraStageResult): LoH {
  return finishLoHEvent(saveLoHExtraStageResult(event, input))
}
