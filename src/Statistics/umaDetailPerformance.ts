import type { CM } from "../types/types"
import { TRACK_SURFACES } from "../types/types"
import type { LoH } from "../LoH/types"
import { getLoHUmaPerformance } from "../LoH/umaPerformance"
import { calculateUmaDetailStatistics, getUmaDistancePerformance } from "./umaDetailStatistics"
import type { UmaSurfaceFilter } from "./umaDetailStatistics"
import { calculateUmaRunningStyleStatistics } from "./umaRunningStyleStatistics"
import { getUmaRunningStyleDisplayRows } from "./umaRunningStylePresentation"
import { calculateUmaRoleStatistics } from "./umaRoleStatistics"
import { calculateUmaEntrySourceStatistics } from "./umaEntrySourceStatistics"
import { withWinRate } from "./trackStatistics"
import type { UmaResultLeague } from "./umaResultRankings"

type Performance = ReturnType<typeof getLoHUmaPerformance>

function mergeRows<T extends { races: number; wins: number; usage: number | null }>(rows: T[], key: (row: T) => string, denominator: number): T[] {
  const totals = new Map<string, T>()
  for (const row of rows) {
    const old = totals.get(key(row))
    totals.set(key(row), old ? { ...old, races: old.races + row.races, wins: old.wins + row.wins } : { ...row })
  }
  return [...totals.values()].map(row => ({ ...row, ...withWinRate(row), usage: denominator ? row.races / denominator * 100 : null }))
}

function withSurfaces(performance: Performance) {
  const surfaces = TRACK_SURFACES.flatMap(surface => {
    const rows = performance.events.filter(row => row.surface === surface && row.races > 0)
    return rows.length ? [withWinRate({ surface, races: rows.reduce((sum, row) => sum + row.races, 0), wins: rows.reduce((sum, row) => sum + row.wins, 0) })] : []
  })
  const unknownSurfaceRaces = performance.events.filter(row => !TRACK_SURFACES.some(surface => surface === row.surface)).reduce((sum, row) => sum + row.races, 0)
  return { ...performance, surfaces, unknownSurfaceRaces, ...getUmaDistancePerformance(performance.events) }
}

/** Keep the native CM calculation intact; Overall recomputes weighted rates from both modes. */
export function getUmaDetailPerformanceScopes(cms: CM[], lohs: LoH[], versionId: string, league: UmaResultLeague = "all", surface: UmaSurfaceFilter = "All") {
  const events = cms.filter(cm => (league === "all" || cm.league === league) && (surface === "All" || cm.surface === surface))
  const runningStyles = calculateUmaRunningStyleStatistics(events, versionId)
  const cm: Performance = { events: calculateUmaDetailStatistics(events, versionId).events,
    runningStyles: { ...runningStyles, rows: getUmaRunningStyleDisplayRows(runningStyles) },
    roles: calculateUmaRoleStatistics(events, versionId), entrySources: calculateUmaEntrySourceStatistics(events, versionId) }
  const loh = getLoHUmaPerformance(surface === "All" ? lohs : lohs.filter(event => event.surface === surface), versionId)
  const totalRaces = cm.runningStyles.totalRaces + loh.runningStyles.totalRaces
  const attributedRaces = cm.entrySources.attributedRaces + loh.entrySources.attributedRaces
  const overall: Performance = {
    events: [...cm.events, ...loh.events],
    runningStyles: { totalRaces, unknownStyleRaces: cm.runningStyles.unknownStyleRaces + loh.runningStyles.unknownStyleRaces,
      rows: mergeRows([...cm.runningStyles.rows, ...loh.runningStyles.rows], row => row.style, totalRaces) },
    roles: { totalRaces, unknownRoleRaces: cm.roles.unknownRoleRaces + loh.roles.unknownRoleRaces,
      rows: mergeRows([...cm.roles.rows, ...loh.roles.rows], row => row.role, totalRaces) },
    entrySources: { totalRaces, attributedRaces, unknownSourceRaces: cm.entrySources.unknownSourceRaces + loh.entrySources.unknownSourceRaces,
      unknownSourceWins: cm.entrySources.unknownSourceWins + loh.entrySources.unknownSourceWins,
      rows: mergeRows([...cm.entrySources.rows, ...loh.entrySources.rows], row => row.source, attributedRaces) },
  }
  return { cm: withSurfaces(cm), loh: withSurfaces(loh), overall: withSurfaces(overall) }
}
