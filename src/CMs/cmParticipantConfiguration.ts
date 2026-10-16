import type {
  CM, CMAttempt, CMAttemptUmaResult, CMFinalPlacement, CMFinalUmaResult, CMParticipantConfiguration, CMUma, RunningStyle, UmaStyle,
} from "../types/types"
import { assertCMFinalResults, isCMFinalPlacement, isCMFinalPlacementAllowed, isCMTeamPlacement, normalizeCMFinalResults } from "./cmFinalPlacements"

export const RUNNING_STYLE_LABELS: Record<RunningStyle, UmaStyle> = {
  runaway: "Runaway",
  front_runner: "Front Runner",
  pace_chaser: "Pace Chaser",
  late_surger: "Late Surger",
  end_closer: "End Closer",
}

const legacyStyles: Record<string, RunningStyle> = {
  runaway: "runaway", frontrunner: "front_runner", front: "front_runner",
  pacechaser: "pace_chaser", leader: "pace_chaser",
  latesurger: "late_surger", betweener: "late_surger",
  endcloser: "end_closer", chaser: "end_closer",
}

export function normalizeRunningStyle(value: unknown): RunningStyle | null {
  if (typeof value !== "string") return null
  const key = value.trim().toLowerCase().replace(/[\s_-]+/g, "")
  return Object.hasOwn(legacyStyles, key) ? legacyStyles[key] : null
}

/** Presentation adapter only; no second mutable style field is stored. */
export function getRunningStyleLabel(value: RunningStyle | null | undefined): UmaStyle | "" {
  return value ? RUNNING_STYLE_LABELS[value] : ""
}

export function getParticipantRunningStyle(participant: CMUma | undefined): RunningStyle | null {
  if (!participant) return null
  const legacy = participant as CMUma & { style?: unknown }
  return normalizeRunningStyle(Object.hasOwn(legacy, "runningStyle") ? legacy.runningStyle : legacy.style)
}

export function hasCompleteCMLineup(cm: CM): boolean {
  const ids = cm.currentLineup ?? []
  return ids.length === 3 && new Set(ids).size === 3 && ids.every((id) =>
    id.trim() !== "" && (cm.participants ?? []).some((participant) =>
      participant.cmUmaId === id && typeof participant.umaId === "string" && participant.umaId.trim() !== "",
    ),
  )
}

export function snapshotParticipantConfiguration(
  participant: CMUma | undefined,
  configurationSource: CMParticipantConfiguration["configurationSource"] = "recorded",
): CMParticipantConfiguration {
  return {
    umaVersionId: typeof participant?.umaId === "string" ? participant.umaId : null,
    runningStyle: getParticipantRunningStyle(participant),
    ace: typeof participant?.ace === "boolean" ? participant.ace : null,
    debuffer: typeof participant?.debuffer === "boolean" ? participant.debuffer : null,
    entrySource: typeof participant?.autoRun === "boolean" ? participant.autoRun ? "autorun" : "manual" : null,
    configurationSource,
  }
}

/** Snapshot values, including nulls, always take precedence over the current lineup. */
export function getResultConfiguration(cm: CM, result: CMAttemptUmaResult): CMParticipantConfiguration {
  return result.configuration ?? snapshotParticipantConfiguration(
    (cm.participants ?? []).find((participant) => participant.cmUmaId === result.cmUmaId), "legacy_inferred",
  )
}

/** Correcting counts on an existing attempt must retain its original configurations. */
export function snapshotAttemptResults(cm: CM, attempt: Omit<CMAttempt, "umaWins"> & {
  umaWins: Omit<CMAttemptUmaResult, "configuration">[]
}): CMAttempt {
  const previous = cm.attempts.find((item) => item.day === attempt.day && item.attempt === attempt.attempt)
  return {
    ...attempt,
    umaWins: attempt.umaWins.map((result) => {
      const saved = previous?.umaWins.find((item) => item.cmUmaId === result.cmUmaId)
      return {
        ...result,
        configuration: saved ? getResultConfiguration(cm, saved) : snapshotParticipantConfiguration(
          cm.participants.find((participant) => participant.cmUmaId === result.cmUmaId),
        ),
      }
    }),
  }
}

export function getCMFinalResults(cm: CM): CMFinalUmaResult[] {
  const results = cm.finalResults ?? (cm.participants ?? []).filter((participant) => participant.finalParticipant).map((participant) => ({
    cmUmaId: participant.cmUmaId,
    won: participant.won,
    configuration: snapshotParticipantConfiguration(participant, "legacy_inferred"),
  } as CMFinalUmaResult))
  return normalizeCMFinalResults(results, cm.finalPlace)
}

/** Final results have their own participant snapshots, separate from round batches. */
export function snapshotFinalResults(cm: CM, options: { lineupChanged?: boolean } = {}): CM {
  if (!isCMTeamPlacement(cm.finalPlace)) {
    const current = { ...cm }
    delete current.finalResults
    return synchronizeFinalWinners(current)
  }
  const previous = cm.finalResults ? getCMFinalResults(cm) : []
  const finalResults = cm.finalResults && !options.lineupChanged ? previous
    : cm.participants.filter((participant) => participant.finalParticipant).map((participant) => {
      const saved = previous.find((result) => result.cmUmaId === participant.cmUmaId)
      return saved ?? {
        cmUmaId: participant.cmUmaId,
        placement: null,
        placementSource: "recorded" as const,
        won: false,
        configuration: snapshotParticipantConfiguration(participant),
      }
    })
  return synchronizeFinalWinners({ ...cm, finalResults })
}

export function synchronizeFinalWinners(cm: CM): CM {
  const winners = new Set((cm.finalResults ?? []).filter((result) => result.placement === "first").map((result) => result.cmUmaId))
  const participants = cm.participants.map((participant) => {
    const won = cm.finalPlace === "1st" && winners.has(participant.cmUmaId)
    return participant.won === won ? participant : { ...participant, won }
  })
  return participants.every((participant, index) => participant === cm.participants[index]) ? cm : { ...cm, participants }
}

/** Only newly invalid selections are cleared; surviving placements/configurations are retained. */
export function changeCMTeamResult(cm: CM, finalPlace: string): CM {
  if (finalPlace !== "" && !isCMTeamPlacement(finalPlace)) throw new Error("Invalid team final result.")
  const saved = snapshotFinalResults(cm)
  const next = snapshotFinalResults({ ...saved, finalPlace,
    ...(saved.finalResults ? { finalResults: saved.finalResults.map((result) => {
      const placement = isCMFinalPlacementAllowed(finalPlace, result.placement) ? result.placement : null
      return { ...result, placement, placementSource: "recorded", won: placement === "first" }
    }) } : {}),
    phase: cm.phase === "completed" ? "finalResult" : cm.phase,
  })
  assertCMFinalResults(next)
  return next
}

export function changeCMUmaPlacement(cm: CM, cmUmaId: string, placement: CMFinalPlacement | null): CM {
  if (!isCMTeamPlacement(cm.finalPlace)) throw new Error("Select the team result first.")
  if (!isCMFinalPlacement(placement)) throw new Error("Invalid individual Uma placement.")
  const saved = snapshotFinalResults(cm)
  if (!saved.finalResults?.some((result) => result.cmUmaId === cmUmaId)) throw new Error("This Uma is not in the saved Final Lineup.")
  const next = synchronizeFinalWinners({ ...saved,
    finalResults: saved.finalResults.map((result) => result.cmUmaId === cmUmaId
      ? { ...result, placement, placementSource: "recorded", won: placement === "first" } : result),
    phase: cm.phase === "completed" ? "finalResult" : cm.phase,
  })
  assertCMFinalResults(next)
  return next
}

export function completeCMFinal(cm: CM): CM {
  const saved = snapshotFinalResults(cm)
  assertCMFinalResults(saved, { requireWinner: true })
  return { ...saved, phase: "completed" }
}

/** Includes exact historical IDs even after a current participant changes or is removed. */
export function getCMVersionIds(cm: CM): string[] {
  return Array.from(new Set([
    ...(cm.participants ?? []).map((participant) => participant.umaId),
    ...(cm.attempts ?? []).flatMap((attempt) => attempt.umaWins.map((result) => getResultConfiguration(cm, result).umaVersionId)),
    ...getCMFinalResults(cm).map((result) => result.configuration.umaVersionId),
  ].filter((id): id is string => id !== null)))
}
