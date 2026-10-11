import type { CM, CMParticipantConfiguration } from "../types/types"

export type HistoricalParticipantEntry = {
  key: string
  configuration: CMParticipantConfiguration
  races: number
  wins: number
  winRate: number | null
  finalAppearances: number
  finalWins: number
  hasInferredConfiguration: boolean
  hasRecordedConfiguration: boolean
}

export function getParticipantConfigurationKey(configuration: CMParticipantConfiguration) {
  return JSON.stringify([configuration.umaVersionId, configuration.runningStyle,
    configuration.ace, configuration.debuffer, configuration.entrySource])
}

/** Presentation grouping only. Snapshot provenance is not a configuration distinction. */
export function getHistoricalParticipantEntries(cm: CM): HistoricalParticipantEntry[] {
  const entries = new Map<string, HistoricalParticipantEntry>()
  const getEntry = (configuration: CMParticipantConfiguration) => {
    const key = getParticipantConfigurationKey(configuration)
    const entry = entries.get(key) ?? { key, configuration, races: 0, wins: 0, winRate: null,
      finalAppearances: 0, finalWins: 0, hasInferredConfiguration: false, hasRecordedConfiguration: false }
    entry.hasInferredConfiguration ||= configuration.configurationSource === "legacy_inferred"
    entry.hasRecordedConfiguration ||= configuration.configurationSource === "recorded"
    entries.set(key, entry)
    return entry
  }
  for (const attempt of cm.attempts) {
    for (const result of attempt.umaWins) {
      const entry = getEntry(result.configuration)
      entry.races += attempt.racesPlayed
      entry.wins += result.wins
    }
  }
  // Retain All Participants' existing convention: each recorded final contributes one race.
  if (["1st", "2nd", "3rd"].includes(cm.finalPlace)) {
    for (const result of cm.finalResults ?? []) {
      const entry = getEntry(result.configuration)
      entry.races += 1
      entry.finalAppearances += 1
      if (cm.finalPlace === "1st" && result.won) { entry.wins += 1; entry.finalWins += 1 }
    }
  }
  return Array.from(entries.values(), (entry) => ({ ...entry,
    winRate: entry.races > 0 ? entry.wins / entry.races * 100 : null,
  }))
}
