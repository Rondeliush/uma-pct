import type { UmaVersion } from "../types/types"
import { snapshotParticipantConfiguration } from "../CMs/cmParticipantConfiguration"
import { getParticipantConfigurationKey } from "../CMs/cmParticipantPresentation"
import type { LoH, LoHLineupMember, LoHRaceSetInput } from "./types"

export type LoHVersionIdentity = Pick<UmaVersion, "id" | "characterId">

/** Use CM's configuration identity; counters and snapshot provenance are not part of it. */
export function getLoHConfigurationKey(uma: LoHLineupMember): string {
  return getParticipantConfigurationKey(snapshotParticipantConfiguration(uma))
}

export function snapshotLoHConfiguration(uma: LoHLineupMember): LoHLineupMember {
  return { umaId: uma.umaId, runningStyle: uma.runningStyle, ace: uma.ace, debuffer: uma.debuffer, autoRun: uma.autoRun }
}

/** Historical snapshots remain authoritative even when the current version uses another style. */
export function getLoHConfigurations(event: LoH, history: readonly LoHRaceSetInput[] = event.raceSets ?? []): LoHLineupMember[] {
  const configurations = new Map<string, LoHLineupMember>()
  const add = (uma: LoHLineupMember) => configurations.set(getLoHConfigurationKey(uma), snapshotLoHConfiguration(uma))
  for (const uma of event.legacyProgress?.participants ?? (event.raceSets === undefined ? event.participants : [])) if (uma.races > 0) add(uma)
  for (const set of history) for (const uma of set.lineupSnapshot) {
    if (set.races.some(race => race.placements.some(item => item.umaId === uma.umaId))) add(uma)
  }
  for (const id of event.currentLineup) {
    const uma = event.participants.find(item => item.umaId === id)
    if (uma) add(uma)
  }
  return [...configurations.values()]
}

/** As in CM, configuration identity selects the card; character identity limits team slots. */
export function getLoHUnderlyingUmaIdentity(uma: LoHLineupMember, versions: readonly LoHVersionIdentity[] = []): string {
  const characterId = versions.find(version => version.id === uma.umaId)?.characterId
  return characterId ? `character:${characterId}` : `version:${uma.umaId}`
}

export function isLoHExtraStageCandidateLocked(candidate: LoHLineupMember, selected: readonly LoHLineupMember[], versions: readonly LoHVersionIdentity[]): boolean {
  return !selected.some(uma => getLoHConfigurationKey(uma) === getLoHConfigurationKey(candidate)) &&
    (selected.length >= 3 || selected.some(uma => getLoHUnderlyingUmaIdentity(uma, versions) === getLoHUnderlyingUmaIdentity(candidate, versions)))
}
