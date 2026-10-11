import { getCMFinalResults, getParticipantRunningStyle, snapshotParticipantConfiguration, synchronizeFinalWinners } from "../CMs/cmParticipantConfiguration"
import { assertCMFinalResults } from "../CMs/cmFinalPlacements"
import type { CM, CMUma } from "../types/types"

export const PROFILE_DATA_VERSION = 2

/** Pure, idempotent migration. Never expands batches or changes competitive counts. */
export function migrateCMConfiguration(cm: CM): CM {
  let changed = false
  const participants = cm.participants.map((participant) => {
    const legacy = participant as CMUma & { style?: unknown }
    const runningStyle = getParticipantRunningStyle(participant)
    if (!Object.hasOwn(legacy, "style") && participant.runningStyle === runningStyle) return participant
    const current = { ...legacy, runningStyle }
    delete current.style
    changed = true
    return current
  })
  const attempts = cm.attempts.map((attempt) => {
    let attemptChanged = false
    const umaWins = attempt.umaWins.map((result) => {
      if (result.configuration) return result
      attemptChanged = changed = true
      return {
        ...result,
        configuration: snapshotParticipantConfiguration(
          cm.participants.find((participant) => participant.cmUmaId === result.cmUmaId), "legacy_inferred",
        ),
      }
    })
    return attemptChanged ? { ...attempt, umaWins } : attempt
  })
  const inferFinal = cm.finalResults === undefined && ["1st", "2nd", "3rd"].includes(cm.finalPlace)
  const finalResults = cm.finalResults || inferFinal ? getCMFinalResults(cm) : undefined
  const finalChanged = inferFinal || finalResults?.some((result, index) => result !== cm.finalResults?.[index])
  const migrated = changed || finalChanged ? {
    ...cm, participants, attempts,
    ...(finalResults ? { finalResults } : {}),
  } : cm
  const current = synchronizeFinalWinners(migrated)
  // Preserve team-only or wholly unknown legacy history, while validating every attributed result.
  assertCMFinalResults(current, {
    requireWinner: cm.phase === "completed" && (cm.finalResults?.length ?? 0) > 0,
    allowLegacyUnknown: true,
  })
  return current
}

export function migrateProfileData<T extends { cms: CM[]; dataVersion?: number }>(data: T): T {
  if (data.dataVersion !== undefined && (!Number.isInteger(data.dataVersion) || data.dataVersion < 0 || data.dataVersion > PROFILE_DATA_VERSION)) {
    throw new Error("This profile uses an unsupported data version. Nothing was overwritten.")
  }
  const cms = data.cms.map(migrateCMConfiguration)
  return data.dataVersion === PROFILE_DATA_VERSION && cms.every((cm, index) => cm === data.cms[index])
    ? data : { ...data, dataVersion: PROFILE_DATA_VERSION, cms }
}
