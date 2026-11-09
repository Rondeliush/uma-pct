import { getLoHConfigurationStats, getLoHParticipantStats, getLoHProgress } from "./progress"
import { getLoHExtraStageOutcome } from "./extraStage"
import type { LoH } from "./types"
import type { UmaStatisticsEntry } from "../Statistics/umaStatistics"
import type { OverviewUma, UmaOverviewData } from "../Statistics/umaOverviewTypes"
import { getUmaDistancePerformance, recordedCategory } from "../Statistics/umaDetailStatistics"
import { withWinRate } from "../Statistics/trackStatistics"
import { RUNNING_STYLE_LABELS } from "../CMs/cmParticipantConfiguration"
import type { RunningStyle } from "../types/types"
import { calculateUmaRoleStatistics, getRole } from "../Statistics/umaRoleStatistics"
import type { UmaRole } from "../Statistics/umaRoleStatistics"

/** Read-only projection of LoH's canonical history; no scores or snapshots are rewritten. */
export function calculateLoHUmaStatistics(events: LoH[], catalogue: UmaStatisticsEntry[]): UmaOverviewData {
  const entries = new Map(catalogue.map(uma => [uma.versionId, uma]))
  const umas = new Map<string, OverviewUma>()
  const batches: { distance: number; category: ReturnType<typeof recordedCategory>; surface: string; races: number; wins: number }[] = []
  const styles = new Map<RunningStyle, { races: number; wins: number }>()
  const roles = calculateUmaRoleStatistics([]).rows
  const roleTotals = new Map<UmaRole, { races: number; wins: number }>()
  let races = 0, wins = 0
  for (const event of events) {
    const history = getLoHProgress(event)
    const eventRaces = history.racesPlayed + Number(!!event.extraStage?.result)
    const eventWins = history.firstPlaces + Number(getLoHExtraStageOutcome(event) === "winner")
    races += eventRaces; wins += eventWins
    batches.push({ distance: event.distance ?? 0, category: event.length ? recordedCategory(event.length) : null, surface: event.surface ?? "Unknown", races: eventRaces, wins: eventWins })
    for (const participant of getLoHParticipantStats(event, history)) {
      if (!participant.races) continue
      const id = participant.umaId
      const uma = umas.get(id) ?? {
        ...(entries.get(id) ?? { versionId: id, name: `Unresolved Uma (${id})`, avatar: "", unresolved: true }),
        races: 0, wins: 0, winRate: null, cmEvents: 0, finalAppearances: 0, finalWins: 0, distances: [], lohEvents: 0, extraStageAppearances: 0, rawPoints: 0,
      }
      uma.races += participant.races; uma.wins += participant.wins; uma.lohEvents = (uma.lohEvents ?? 0) + 1
      uma.extraStageAppearances = (uma.extraStageAppearances ?? 0) + Number(!!participant.participatedInExtraStage)
      uma.rawPoints = uma.rawPoints === null || participant.totalPoints === undefined ? null : (uma.rawPoints ?? 0) + participant.totalPoints
      if (event.distance && event.distance > 0) {
        const distance = uma.distances.find(row => row.distance === event.distance) ?? { distance: event.distance, races: 0, wins: 0, winRate: null }
        if (!uma.distances.includes(distance)) uma.distances.push(distance)
        distance.races += participant.races; distance.wins += participant.wins
        Object.assign(distance, withWinRate(distance))
      }
      umas.set(id, uma)
    }
    for (const configuration of getLoHConfigurationStats(event)) {
      // Classify the recorded flags with the shared role helper, never today's lineup.
      const role = getRole({ umaVersionId: configuration.umaId, runningStyle: configuration.runningStyle ?? null,
        ace: configuration.ace ?? null, debuffer: configuration.debuffer ?? null, entrySource: null, configurationSource: "recorded" })
      const roleTotal = roleTotals.get(role) ?? { races: 0, wins: 0 }
      roleTotal.races += configuration.races; roleTotal.wins += configuration.wins; roleTotals.set(role, roleTotal)
      const style = configuration.runningStyle
      if (!style || !Object.hasOwn(RUNNING_STYLE_LABELS, style)) continue
      const total = styles.get(style) ?? { races: 0, wins: 0 }
      total.races += configuration.races; total.wins += configuration.wins; styles.set(style, total)
    }
  }
  const distance = getUmaDistancePerformance(batches)
  const knownStyleRaces = [...styles.values()].reduce((sum, row) => sum + row.races, 0)
  const knownRoleRaces = roles.reduce((sum, row) => sum + (roleTotals.get(row.role)?.races ?? 0), 0)
  return {
    umas: [...umas.values()].map(uma => withWinRate(uma)),
    overall: withWinRate({ races, wins, umasUsed: umas.size }),
    surfaces: (["Turf", "Dirt"] as const).map(surface => withWinRate({ surface, races: batches.filter(row => row.surface === surface).reduce((sum, row) => sum + row.races, 0), wins: batches.filter(row => row.surface === surface).reduce((sum, row) => sum + row.wins, 0) })),
    ...distance,
    runningStyles: (Object.keys(RUNNING_STYLE_LABELS) as RunningStyle[]).map(style => {
      const total = styles.get(style) ?? { races: 0, wins: 0 }
      return { ...withWinRate(total), style, label: RUNNING_STYLE_LABELS[style], usage: knownStyleRaces ? total.races / knownStyleRaces * 100 : null }
    }),
    roles: roles.map(row => {
      const total = roleTotals.get(row.role) ?? { races: 0, wins: 0 }
      return { ...row, ...withWinRate(total), usage: knownRoleRaces ? total.races / knownRoleRaces * 100 : null }
    }),
  }
}
