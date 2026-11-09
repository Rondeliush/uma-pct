import type { LoH, LoHExtraStagePlacement, LoHExtraStageResult, LoHLineupMember, LoHPhase, LoHRaceSetInput } from "./types"
import { LOH_EXTRA_STAGE_CUTOFF, LOH_LINEUP_SIZE, LOH_MAIN_STAGE_DAYS } from "./constants"
import { TRACK_CONDITIONS, TRACK_WEATHER } from "../types/types"
import { CM_FINAL_PLACEMENTS, CM_FINAL_PLACEMENT_LABELS, isCMFinalPlacement } from "../CMs/cmFinalPlacements"
import { getLoHConfigurationKey, getLoHConfigurations, getLoHUnderlyingUmaIdentity } from "./configurations"
import type { LoHVersionIdentity } from "./configurations"

export const LOH_EXTRA_STAGE_PLACEMENTS = CM_FINAL_PLACEMENTS
export const LOH_EXTRA_STAGE_PLACEMENT_LABELS = CM_FINAL_PLACEMENT_LABELS
export const isLoHExtraStagePlacement = (value: unknown): value is LoHExtraStagePlacement => value !== null && isCMFinalPlacement(value)

export function getLoHPhase(event: LoH): LoHPhase {
  if (event.completed) return "COMPLETED"
  if (event.mainStage?.completedDays.length !== LOH_MAIN_STAGE_DAYS) return "MAIN_STAGE"
  if (event.overallRank === null) return "AWAITING_MAIN_STAGE_RANK"
  if (event.overallRank > LOH_EXTRA_STAGE_CUTOFF) return "NOT_QUALIFIED"
  if (event.extraStage?.result) return "EXTRA_STAGE_RESULT_RECORDED"
  return event.extraStage ? "EXTRA_STAGE_READY" : "EXTRA_STAGE_QUALIFIED"
}

/** Each recorded configuration (and current selection) is an independent choice. */
export function getLoHExtraStageCandidates(event: LoH, history: readonly LoHRaceSetInput[] = event.raceSets ?? []): LoHLineupMember[] {
  return [...new Map([...getLoHConfigurations(event, history), ...(event.extraStageCandidates ?? [])]
    .map(uma => [getLoHConfigurationKey(uma), { ...uma }])).values()]
}

export function getLoHExtraStageOutcome(event: LoH): "winner" | "participated" | null {
  const result = event.extraStage?.result
  return result ? result.placements.some(item => item.placement === "first") ? "winner" : "participated" : null
}

export function assertLoHExtraStageResult(result: LoHExtraStageResult, lineup: readonly LoHLineupMember[]) {
  if (typeof result.id !== "string" || !result.id.trim() || typeof result.createdAt !== "string" || !Number.isFinite(Date.parse(result.createdAt))) throw new Error("Invalid Extra Stage race identifier or date.")
  if (!TRACK_WEATHER.includes(result.weather) || !TRACK_CONDITIONS.includes(result.condition)) throw new Error("Choose Weather and Condition for Extra Stage.")
  if (!Array.isArray(result.placements) || result.placements.length !== LOH_LINEUP_SIZE || new Set(result.placements.map(item => item?.umaId)).size !== LOH_LINEUP_SIZE ||
    result.placements.some(item => !item || !lineup.some(uma => uma.umaId === item.umaId) || !isLoHExtraStagePlacement(item.placement))) throw new Error("Record a placement for each of the three registered Umas.")
  const exact = result.placements.filter(item => item.placement !== "fourth_or_lower").map(item => item.placement)
  if (new Set(exact).size !== exact.length) throw new Error("1st, 2nd and 3rd must be unique. 4th+ can repeat.")
}

export function assertLoHExtraStage(event: LoH, versions: readonly LoHVersionIdentity[] = []) {
  const extra = event.extraStage
  if (!extra) return
  if ((!event.completed && event.mainStage?.completedDays.length !== LOH_MAIN_STAGE_DAYS) || !Number.isSafeInteger(event.overallRank) || event.overallRank === null || event.overallRank < 1 || event.overallRank > LOH_EXTRA_STAGE_CUTOFF) throw new Error("Extra Stage requires a confirmed Top 96 Main Stage rank.")
  if (!Number.isFinite(Date.parse(extra.registeredAt)) || extra.lineupSnapshot.length !== LOH_LINEUP_SIZE || new Set(extra.lineupSnapshot.map(uma => getLoHUnderlyingUmaIdentity(uma, versions))).size !== LOH_LINEUP_SIZE) throw new Error("Register exactly three different Extra Stage Umas.")
  const candidates = getLoHExtraStageCandidates(event)
  if (extra.lineupSnapshot.some(uma => !candidates.some(candidate => getLoHConfigurationKey(candidate) === getLoHConfigurationKey(uma)))) throw new Error("Choose configurations from this LoH's Main Stage history, current lineup or Extra Stage candidates.")
  if (extra.result) assertLoHExtraStageResult(extra.result, extra.lineupSnapshot)
}
