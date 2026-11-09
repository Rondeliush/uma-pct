import type { LegacyLoH, LoH, LoHUma, LoHEventDetails, LoHLineupMember, LoHRaceSet } from "./types"
import { TRACK_CONDITIONS, TRACK_DIRECTIONS, TRACK_SEASONS, TRACK_WEATHER, TRACK_SURFACES, TRACK_LENGTHS } from "../types/types"
import { normalizeRunningStyle, RUNNING_STYLE_LABELS } from "../CMs/cmParticipantConfiguration"
import { isValidEventNumber } from "../components/event-form/eventFormData"
import { LOH_EVENT_RANDOM, LOH_LOG_ENTRY_TYPES, LOH_MAIN_STAGE_DAYS } from "./constants"
import { getLoHRankFromScore } from "./ranks"
import { assertLoHRaceSet, getLoHLineupSnapshot, isLoHMainStageLineupLocked, synchronizeLoHProgress } from "./progress"
import { getLoHConfigurationKey, snapshotLoHConfiguration } from "./configurations"
import { isLoHPlacement } from "./scoring"
import { assertLoHExtraStage, getLoHPhase, isLoHExtraStagePlacement } from "./extraStage"
export { formatLoHNumber } from "./format"

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

const isCount = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0
const isStringArray = (value: unknown): value is string[] => Array.isArray(value) && value.every(item => typeof item === "string")
const isOption = (value: unknown, options: readonly string[]) => typeof value === "string" && options.includes(value)

function isLineupMember(value: unknown): value is LoHLineupMember {
  return isRecord(value) && typeof value.umaId === "string" && value.umaId.trim() !== "" &&
    (value.runningStyle === undefined || value.runningStyle === null || (typeof value.runningStyle === "string" && Object.hasOwn(RUNNING_STYLE_LABELS, value.runningStyle))) &&
    ["ace", "debuffer", "autoRun"].every(key => value[key] === undefined || typeof value[key] === "boolean")
}

function isParticipant(value: unknown): value is LoHUma {
  if (!isRecord(value) || !isLineupMember(value)) return false
  const stats = value as Record<string, unknown>
  return [stats.races, stats.wins, stats.top3Finishes].every(isCount) &&
    (stats.totalPoints === undefined || isCount(stats.totalPoints)) &&
    (stats.avgPlace === undefined || stats.avgPlace === null || (isCount(stats.avgPlace) && stats.avgPlace >= 1 && stats.avgPlace <= 12)) &&
    (stats.participatedInExtraStage === undefined || typeof stats.participatedInExtraStage === "boolean") &&
    (stats.extraStagePlacement === undefined || isLoHExtraStagePlacement(stats.extraStagePlacement))
}

function isStoredRaceSet(value: unknown): value is LoHRaceSet {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.createdAt !== "string" || typeof value.day !== "number" || (value.ticketUsed !== undefined && typeof value.ticketUsed !== "boolean") ||
    !(value.weather === null || isOption(value.weather, TRACK_WEATHER)) || !(value.condition === null || isOption(value.condition, TRACK_CONDITIONS)) ||
    !Array.isArray(value.lineupSnapshot) || !value.lineupSnapshot.every(isLineupMember) || !Array.isArray(value.races) ||
    !value.races.every(race => isRecord(race) && typeof race.id === "string" && Array.isArray(race.placements) && race.placements.every(item => isRecord(item) && typeof item.umaId === "string" && isLoHPlacement(item.place)))) return false
  try { assertLoHRaceSet(value as unknown as LoHRaceSet); return true } catch { return false }
}

/** Accept old backups as well as the current model, without trusting new fields blindly. */
export function isLoHData(value: unknown): value is LoH | LegacyLoH {
  if (!isRecord(value) || typeof value.name !== "string" || !isCount(value.number) || !Number.isSafeInteger(value.number) ||
    !(value.notes === undefined || typeof value.notes === "string") ||
    ![value.racesPlayed, value.firstPlaces, value.top3Finishes].every(isCount) || typeof value.completed !== "boolean" ||
    !Array.isArray(value.participants) || !value.participants.every(isParticipant)) return false

  if (!("id" in value || "leagueScore" in value || "racecourse" in value)) {
    return value.raceSets === undefined && value.legacyProgress === undefined && typeof value.track === "string" && typeof value.rank === "string" && isCount(value.score)
  }

  if (value.raceSets !== undefined && (!Array.isArray(value.raceSets) || !value.raceSets.every(isStoredRaceSet) || new Set(value.raceSets.map(set => set.id)).size !== value.raceSets.length)) return false
  if (value.extraStageCandidates !== undefined && (!Array.isArray(value.extraStageCandidates) || !value.extraStageCandidates.every(isLineupMember) ||
    new Set(value.extraStageCandidates.map(getLoHConfigurationKey)).size !== value.extraStageCandidates.length)) return false
  if (value.mainStage !== undefined) {
    if (!isRecord(value.mainStage) || !Array.isArray(value.mainStage.completedDays) || value.mainStage.completedDays.length > LOH_MAIN_STAGE_DAYS ||
      !value.mainStage.completedDays.every((day, index) => day === index + 1)) return false
    const completedCount = value.mainStage.completedDays.length
    if (Array.isArray(value.raceSets) && value.raceSets.some(set => set.day > Math.min(LOH_MAIN_STAGE_DAYS, completedCount + 1))) return false
  }
  if (value.legacyProgress !== undefined && (value.raceSets === undefined || !isRecord(value.legacyProgress) ||
    ![value.legacyProgress.leagueScore, value.legacyProgress.racesPlayed, value.legacyProgress.firstPlaces, value.legacyProgress.top3Finishes].every(isCount) ||
    !Array.isArray(value.legacyProgress.participants) || !value.legacyProgress.participants.every(isParticipant))) return false
  if (value.extraStage !== undefined) {
    const extra = value.extraStage
    if (!isRecord(extra) || typeof extra.registeredAt !== "string" || !Array.isArray(extra.lineupSnapshot) || !extra.lineupSnapshot.every(isLineupMember) ||
      (extra.result !== undefined && !isRecord(extra.result))) return false
    try { assertLoHExtraStage(value as unknown as LoH) } catch { return false }
  }

  const participants = value.participants as LoHUma[]
  const participantIds = participants.map(item => item.umaId)
  return typeof value.id === "string" && value.id.trim() !== "" && typeof value.racecourse === "string" &&
    isCount(value.leagueScore) && typeof value.leagueRank === "string" &&
    (value.overallRank === null || (isCount(value.overallRank) && Number.isSafeInteger(value.overallRank) && value.overallRank >= 1)) &&
    (value.surface === null || isOption(value.surface, TRACK_SURFACES)) &&
    (value.distance === null || (isCount(value.distance) && Number.isSafeInteger(value.distance) && value.distance > 0)) &&
    (value.length === null || isOption(value.length, TRACK_LENGTHS)) &&
    (value.direction === null || isOption(value.direction, TRACK_DIRECTIONS)) &&
    (value.weather === LOH_EVENT_RANDOM || value.weather === null || isOption(value.weather, TRACK_WEATHER)) &&
    (value.season === null || isOption(value.season, TRACK_SEASONS)) &&
    (value.condition === LOH_EVENT_RANDOM || value.condition === null || isOption(value.condition, TRACK_CONDITIONS)) &&
    isStringArray(value.currentLineup) && value.currentLineup.length <= 3 &&
    new Set(value.currentLineup).size === value.currentLineup.length && value.currentLineup.every(id => participantIds.includes(id)) &&
    Array.isArray(value.log) && value.log.every(entry => isRecord(entry) &&
      typeof entry.id === "string" && typeof entry.timestamp === "string" && Number.isFinite(Date.parse(entry.timestamp)) &&
      isOption(entry.type, LOH_LOG_ENTRY_TYPES) &&
      typeof entry.message === "string" && (entry.details === undefined || isStringArray(entry.details)))
}

export function normalizeLoH(event: LoH | LegacyLoH): LoH {
  if (!isLoHData(event)) throw new Error("Invalid League of Heroes event. Nothing was overwritten.")
  if ("id" in event) {
    const current: LoH = event.weather === LOH_EVENT_RANDOM && event.condition === LOH_EVENT_RANDOM
      ? event : { ...event, weather: LOH_EVENT_RANDOM, condition: LOH_EVENT_RANDOM }
    if (current.raceSets !== undefined || current.extraStage?.result) {
      const updated = synchronizeLoHProgress(current)
      return JSON.stringify(updated) === JSON.stringify(current) ? current : updated
    }
    const leagueRank = getLoHRankFromScore(current.leagueScore)
    return current.leagueRank === leagueRank ? current : { ...current, leagueRank }
  }
  return {
    ...event,
    id: `loh-${event.number}`,
    racecourse: event.track,
    surface: null, distance: null, length: null, direction: null,
    weather: LOH_EVENT_RANDOM, season: null, condition: LOH_EVENT_RANDOM,
    leagueScore: event.score,
    leagueRank: getLoHRankFromScore(event.score),
    overallRank: null,
    currentLineup: [],
    log: [],
  }
}

export function createLoHEvent(
  events: readonly LoH[],
  details: LoHEventDetails,
  id: string = crypto.randomUUID(),
  timestamp = new Date().toISOString(),
): LoH {
  if (!isValidEventNumber(details.number)) throw new Error("Enter a valid event number.")
  if (events.some(event => event.number === details.number)) throw new Error(`LoH ${details.number} already exists.`)
  const { lineup = [], ...eventDetails } = details
  const selectedUmas = lineup.filter(uma => uma.id !== "")
  if (lineup.length > 3 || new Set(selectedUmas.map(uma => uma.id)).size !== selectedUmas.length) {
    throw new Error("Choose up to three different Umas.")
  }
  const participants: LoHUma[] = selectedUmas.map(uma => ({
    umaId: uma.id,
    runningStyle: normalizeRunningStyle(uma.style),
    ace: uma.ace, debuffer: uma.debuffer, autoRun: uma.autoRun,
    races: 0, wins: 0, top3Finishes: 0,
  }))
  const event: LoH = {
    ...eventDetails,
    weather: LOH_EVENT_RANDOM, condition: LOH_EVENT_RANDOM,
    name: details.name.trim(),
    racecourse: details.racecourse.trim(),
    id,
    leagueScore: 0, leagueRank: getLoHRankFromScore(0), overallRank: null,
    currentLineup: participants.map(uma => uma.umaId), participants,
    racesPlayed: 0, firstPlaces: 0, top3Finishes: 0, completed: false, mainStage: { completedDays: [] },
    log: [{ id: `${id}-created`, timestamp, type: "created", message: "LoH created." }],
  }
  if (!event.name || !event.racecourse || !isLoHData(event)) throw new Error("Enter a valid event name, racecourse and race conditions.")
  return event
}

/** Edit event metadata and current configuration without replacing recorded results. */
export function updateLoHEvent(
  event: LoH,
  events: readonly LoH[],
  details: LoHEventDetails,
  timestamp = new Date().toISOString(),
  logId = crypto.randomUUID(),
): LoH {
  const candidate = createLoHEvent(events.filter(item => item.id !== event.id), details, event.id, timestamp)
  const lineupLocked = isLoHMainStageLineupLocked(event)
  if (lineupLocked && details.lineup !== undefined) {
    const current = getLoHLineupSnapshot(event).map(getLoHConfigurationKey)
    const incoming = getLoHLineupSnapshot(candidate).map(getLoHConfigurationKey)
    if (current.length !== incoming.length || current.some((key, index) => key !== incoming[index])) throw new Error("Main Stage lineup is locked after completing Day 6.")
  }
  const participants = [...event.participants]
  if (details.lineup !== undefined && !lineupLocked) {
    for (const selected of candidate.participants) {
      const index = participants.findIndex(item => item.umaId === selected.umaId)
      if (index < 0) participants.push(selected)
      else participants[index] = {
        ...participants[index], runningStyle: selected.runningStyle,
        ace: selected.ace, debuffer: selected.debuffer, autoRun: selected.autoRun,
      }
    }
  }
  const updated: LoH = {
    ...event,
    number: candidate.number, name: candidate.name, racecourse: candidate.racecourse,
    surface: candidate.surface, distance: candidate.distance, length: candidate.length,
    direction: candidate.direction, weather: candidate.weather, season: candidate.season, condition: candidate.condition,
    participants,
  }
  const withLineup = details.lineup === undefined || lineupLocked ? updated : updateLoHLineup(updated, candidate.currentLineup, timestamp, `${logId}-team`)
  return { ...withLineup, log: [...withLineup.log, { id: `${event.id}-edited-${logId}`, timestamp, type: "eventUpdated", message: "LoH updated." }] }
}

/** Extra Stage Add New uses Edit LoH's fields without editing the completed Main Stage team. */
export function saveLoHExtraStageCandidates(event: LoH, events: readonly LoH[], details: LoHEventDetails, timestamp = new Date().toISOString(), logId = crypto.randomUUID()): LoH {
  if (getLoHPhase(event) !== "EXTRA_STAGE_QUALIFIED") throw new Error("Add New is only available during Extra Stage lineup registration.")
  const candidate = createLoHEvent(events.filter(item => item.id !== event.id), details, event.id, timestamp)
  const updated = updateLoHEvent(event, events, { ...details, lineup: undefined }, timestamp, logId)
  const configurations = new Map((event.extraStageCandidates ?? []).map(uma => [getLoHConfigurationKey(uma), snapshotLoHConfiguration(uma)]))
  for (const uma of candidate.participants) configurations.set(getLoHConfigurationKey(uma), snapshotLoHConfiguration(uma))
  return { ...updated, extraStageCandidates: [...configurations.values()] }
}

/** Only the current selection changes; former participants keep their recorded totals. */
export function updateLoHLineup(event: LoH, ids: readonly string[], timestamp = new Date().toISOString(), logId = crypto.randomUUID()): LoH {
  const currentLineup = [...ids].filter(id => id !== "")
  if (currentLineup.length > 3 || new Set(currentLineup).size !== currentLineup.length) throw new Error("Choose up to three different Umas.")
  if (currentLineup.length === event.currentLineup.length && currentLineup.every((id, index) => id === event.currentLineup[index])) return event
  if (isLoHMainStageLineupLocked(event)) throw new Error("Main Stage lineup is locked after completing Day 6.")
  const participants = [...event.participants]
  for (const umaId of currentLineup) {
    if (!participants.some(item => item.umaId === umaId)) participants.push({ umaId, races: 0, wins: 0, top3Finishes: 0 })
  }
  return {
    ...event, currentLineup, participants,
    log: [...event.log, { id: `${event.id}-lineup-${logId}`, timestamp, type: "lineupUpdated", message: "Lineup updated.", details: [
      ...event.currentLineup.filter(id => !currentLineup.includes(id)).map(id => `Removed: ${id}`),
      ...currentLineup.filter(id => !event.currentLineup.includes(id)).map(id => `Added: ${id}`),
    ] }],
  }
}

