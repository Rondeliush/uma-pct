import { snapshotParticipantConfiguration } from "../CMs/cmParticipantConfiguration"
import { getLoHConfigurationKey, snapshotLoHConfiguration } from "./configurations"
import { getLoHConfigurationStats, getLoHLineupSnapshot, getLoHProgress } from "./progress"
import type { LoH, LoHLineupMember } from "./types"

type ConfigurationStats = ReturnType<typeof getLoHConfigurationStats>[number]

/** Umas groups a version/style across role changes; recorded configurations keep their full identity. */
function displayKey(uma: LoHLineupMember): string {
  const configuration = snapshotParticipantConfiguration(uma)
  return JSON.stringify([configuration.umaVersionId, configuration.runningStyle])
}

export function getLoHParticipantEntries(event: LoH, configurations = getLoHConfigurationStats(event)): ConfigurationStats[] {
  const groups = new Map<string, ConfigurationStats[]>()
  const displayed = new Map<string, LoHLineupMember>()
  const remember = (uma: LoHLineupMember) => displayed.set(displayKey(uma), snapshotLoHConfiguration(uma))
  for (const configuration of configurations) {
    remember(configuration)
    if (configuration.races === 0) continue
    const key = displayKey(configuration)
    groups.set(key, [...(groups.get(key) ?? []), configuration])
  }
  // Retired styles show their latest recorded roles; the current team shows its current roles.
  for (const set of getLoHProgress(event).raceSets) for (const uma of set.lineupSnapshot) remember(uma)
  if (event.extraStage?.result) for (const uma of event.extraStage.lineupSnapshot) remember(uma)
  for (const uma of getLoHLineupSnapshot(event)) remember(uma)

  return [...groups].map(([key, entries]) => {
    const uma = displayed.get(key)!
    const races = entries.reduce((sum, entry) => sum + entry.races, 0)
    const wins = entries.reduce((sum, entry) => sum + entry.wins, 0)
    const extra = entries.find(entry => entry.participatedInExtraStage)
    return {
      ...uma, key: getLoHConfigurationKey(uma), races, wins,
      rawPoints: entries.some(entry => entry.rawPoints === null) ? null : entries.reduce((sum, entry) => sum + entry.rawPoints!, 0),
      winRate: wins / races * 100,
      averagePlacement: entries.some(entry => entry.averagePlacement === null) ? null
        : entries.reduce((sum, entry) => sum + entry.averagePlacement! * entry.races, 0) / races,
      participatedInExtraStage: !!extra, extraStagePlacement: extra?.extraStagePlacement,
    }
  })
}
