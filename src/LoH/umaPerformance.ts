import { snapshotParticipantConfiguration } from "../CMs/cmParticipantConfiguration"
import { getUmaDistancePerformance, recordedCategory } from "../Statistics/umaDetailStatistics"
import { calculateUmaRunningStyleStatistics } from "../Statistics/umaRunningStyleStatistics"
import { getUmaRunningStyleDisplayRows } from "../Statistics/umaRunningStylePresentation"
import { calculateUmaRoleStatistics, getRole } from "../Statistics/umaRoleStatistics"
import { calculateUmaEntrySourceStatistics } from "../Statistics/umaEntrySourceStatistics"
import { withWinRate } from "../Statistics/trackStatistics"
import { getLoHConfigurationStats, getLoHParticipantStats, getLoHProgress } from "./progress"
import type { LoH } from "./types"

/** Individual performance follows historical configurations, including the raced Extra Stage. */
export function getLoHUmaPerformance(events: LoH[], versionId: string) {
  const batches: Parameters<typeof getUmaDistancePerformance>[0] = []
  const runningStyles = calculateUmaRunningStyleStatistics([], versionId)
  runningStyles.rows = getUmaRunningStyleDisplayRows(runningStyles)
  const roles = calculateUmaRoleStatistics([], versionId)
  const entrySources = calculateUmaEntrySourceStatistics([], versionId)
  let totalRaces = 0, totalWins = 0
  for (const event of events) {
    const history = getLoHProgress(event)
    const uma = getLoHParticipantStats(event, history).find(row => row.umaId === versionId)
    if (!uma?.races) continue
    totalRaces += uma.races; totalWins += uma.wins
    batches.push({ races: uma.races, wins: uma.wins, distance: event.distance ?? 0,
      category: event.length ? recordedCategory(event.length) : null, surface: event.surface ?? "Unknown" })
    for (const configuration of getLoHConfigurationStats(event)) {
      if (configuration.umaId !== versionId || !configuration.races) continue
      const recorded = snapshotParticipantConfiguration(configuration)
      const style = runningStyles.rows.find(row => row.style === recorded.runningStyle)
      if (style) { style.races += configuration.races; style.wins += configuration.wins }
      const role = roles.rows.find(row => row.role === getRole(recorded))
      if (role) { role.races += configuration.races; role.wins += configuration.wins }
      const source = entrySources.rows.find(row => row.source === recorded.entrySource)
      if (source) { source.races += configuration.races; source.wins += configuration.wins }
    }
  }
  runningStyles.totalRaces = roles.totalRaces = entrySources.totalRaces = totalRaces
  runningStyles.unknownStyleRaces = totalRaces - runningStyles.rows.reduce((sum, row) => sum + row.races, 0)
  roles.unknownRoleRaces = totalRaces - roles.rows.reduce((sum, row) => sum + row.races, 0)
  if (roles.unknownRoleRaces > 0) roles.rows.push({ role: "unknown", label: "Unknown", races: roles.unknownRoleRaces,
    wins: totalWins - roles.rows.reduce((sum, row) => sum + row.wins, 0), winRate: null, usage: null })
  entrySources.attributedRaces = entrySources.rows.reduce((sum, row) => sum + row.races, 0)
  entrySources.unknownSourceRaces = totalRaces - entrySources.attributedRaces
  entrySources.unknownSourceWins = totalWins - entrySources.rows.reduce((sum, row) => sum + row.wins, 0)
  const rates = <T extends { races: number; wins: number; usage: number | null }>(row: T, denominator: number): T =>
    ({ ...row, ...withWinRate(row), usage: denominator ? row.races / denominator * 100 : null })
  runningStyles.rows = runningStyles.rows.map(row => rates(row, totalRaces))
  roles.rows = roles.rows.map(row => rates(row, totalRaces))
  entrySources.rows = entrySources.rows.map(row => rates(row, entrySources.attributedRaces))
  return { events: batches, runningStyles, roles, entrySources }
}
