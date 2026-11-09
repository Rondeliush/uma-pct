import type { CM, CMParticipantConfiguration, CMUma, UmaVersion } from "../types/types"
import { getHistoricalParticipantEntries, getParticipantConfigurationKey } from "./cmParticipantPresentation"
import type { HistoricalParticipantEntry } from "./cmParticipantPresentation"
import { snapshotParticipantConfiguration } from "./cmParticipantConfiguration"

type VersionIdentity = Pick<UmaVersion, "id" | "characterId" | "displayName">

export type FinalLineupCandidate = HistoricalParticipantEntry & {
  participantId: string | null
  umaVersionId: string
  umaIdentity: string
}

function umaIdentity(versionId: string, versions: readonly VersionIdentity[]) {
  const characterId = versions.find(version => version.id === versionId)?.characterId
  return characterId ? `character:${characterId}` : `version:${versionId}`
}

/** Configuration identity controls the tiles; Uma identity controls lineup uniqueness. */
export function getFinalLineupCandidates(cm: CM, versions: readonly VersionIdentity[], draft: readonly FinalLineupCandidate[] = []): FinalLineupCandidate[] {
  const participants = new Map<string, CMUma>()
  for (const participant of cm.participants) {
    if (!participants.has(participant.umaId) || cm.currentLineup.includes(participant.cmUmaId)) participants.set(participant.umaId, participant)
  }
  const candidates = new Map<string, FinalLineupCandidate>()
  for (const entry of getHistoricalParticipantEntries(cm)) {
    const versionId = entry.configuration.umaVersionId
    if (!versionId) continue
    candidates.set(entry.key, { ...entry, winRate: entry.winRate ?? 0,
      participantId: participants.get(versionId)?.cmUmaId ?? null,
      umaVersionId: versionId, umaIdentity: umaIdentity(versionId, versions) })
  }
  for (const participant of cm.participants) {
    const configuration = snapshotParticipantConfiguration(participant)
    const key = getParticipantConfigurationKey(configuration)
    if (candidates.has(key)) continue
    candidates.set(key, { key, configuration, participantId: participants.get(participant.umaId)?.cmUmaId ?? null,
      umaVersionId: participant.umaId, umaIdentity: umaIdentity(participant.umaId, versions),
      races: 0, wins: 0, winRate: 0, finalAppearances: 0, finalWins: 0,
      hasInferredConfiguration: false, hasRecordedConfiguration: true })
  }
  // An unsaved choice must survive editing its current configuration through Add New.
  for (const candidate of draft) if (!candidates.has(candidate.key)) candidates.set(candidate.key, candidate)
  return [...candidates.values()]
}

export function isFinalLineupCandidateLocked(candidate: FinalLineupCandidate, draft: readonly FinalLineupCandidate[]): boolean {
  return !draft.some(selected => selected.key === candidate.key)
    && (draft.length >= 3 || draft.some(selected => selected.umaIdentity === candidate.umaIdentity))
}

export function toggleFinalLineupCandidate(draft: readonly FinalLineupCandidate[], candidate: FinalLineupCandidate): FinalLineupCandidate[] {
  if (draft.some(selected => selected.key === candidate.key)) return draft.filter(selected => selected.key !== candidate.key)
  if (isFinalLineupCandidateLocked(candidate, draft)) return [...draft]
  return [...draft, { ...candidate, configuration: { ...candidate.configuration } }]
}

/** Bind the selected snapshots to final participant IDs without editing the current team. */
export function saveFinalLineupCandidates(cm: CM, draft: readonly FinalLineupCandidate[], versions: readonly VersionIdentity[], options: { timestamp?: string; logId?: string } = {}): CM {
  if (cm.phase !== "finalLineup") throw new Error("Final registration is closed.")
  if (draft.length !== 3 || new Set(draft.map(candidate => umaIdentity(candidate.umaVersionId, versions))).size !== 3) throw new Error("Select three different Umas for the Final.")
  if (draft.some(candidate => candidate.configuration.umaVersionId !== candidate.umaVersionId || getParticipantConfigurationKey(candidate.configuration) !== candidate.key)) throw new Error("Invalid final configuration snapshot.")
  const participants = cm.participants.map(participant => ({ ...participant, finalParticipant: false, won: false }))
  let nextId = participants.reduce((highest, participant) => Math.max(highest, Number(participant.cmUmaId.match(/-uma-(\d+)$/)?.[1] ?? 0)), 0) + 1
  const finalResults = draft.map(candidate => {
    let participant = participants.find(uma => uma.cmUmaId === candidate.participantId && uma.umaId === candidate.umaVersionId)
      ?? participants.find(uma => uma.umaId === candidate.umaVersionId)
    if (!participant) {
      // Old snapshots can outlive their original participant record.
      const configuration: CMParticipantConfiguration = candidate.configuration
      participant = { cmUmaId: `cm${cm.number}-uma-${nextId++}`, umaId: candidate.umaVersionId,
        runningStyle: configuration.runningStyle, ace: configuration.ace ?? undefined, debuffer: configuration.debuffer ?? undefined,
        autoRun: configuration.entrySource === null ? undefined : configuration.entrySource === "autorun", finalParticipant: false, won: false }
      participants.push(participant)
    }
    participant.finalParticipant = true
    return { cmUmaId: participant.cmUmaId, placement: null, placementSource: "recorded" as const, won: false,
      configuration: { ...candidate.configuration } }
  })
  return { ...cm, participants, finalResults, phase: "finalResult", log: [...(cm.log ?? []), {
    id: options.logId ?? `cm${cm.number}-final-lineup-${Date.now()}`, timestamp: options.timestamp ?? new Date().toISOString(),
    type: "finalLineupSet", message: "Final Lineup set.",
    details: draft.map(candidate => versions.find(version => version.id === candidate.umaVersionId)?.displayName ?? "Unknown Uma"),
  }] }
}
