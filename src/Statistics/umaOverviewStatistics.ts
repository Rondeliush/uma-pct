import type { CM, UmaCharacter, UmaVersion } from "../types/types"
import type { LoH } from "../LoH/types"
import { calculateLoHUmaStatistics } from "../LoH/umaStatistics"
import { calculateUmaStatistics, getUmaStatisticsCatalogue } from "./umaStatistics"
import { calculateUmaRunningStyleStatistics } from "./umaRunningStyleStatistics"
import { calculateUmaRoleStatistics } from "./umaRoleStatistics"
import { getGlobalUmaDistancePerformance } from "./umaGlobalDistanceStatistics"
import { withWinRate } from "./trackStatistics"
import type { RaceStatistics } from "./umaStatistics"
import type { OverviewUma, UmaOverviewData } from "./umaOverviewTypes"

function mergeRows<T extends RaceStatistics>(rows: T[], key: (row: T) => string | number): T[] {
  const merged = new Map<string | number, T>()
  for (const row of rows) {
    const previous = merged.get(key(row))
    merged.set(key(row), previous ? { ...previous, ...withWinRate({ races: previous.races + row.races, wins: previous.wins + row.wins }) } : { ...row })
  }
  return [...merged.values()]
}

export function getUmaOverviewStatistics(cms: CM[], lohs: LoH[], characters: UmaCharacter[], versions: UmaVersion[]) {
  const recorded = calculateUmaStatistics(cms, characters, versions)
  const cm: UmaOverviewData = { ...recorded, ...getGlobalUmaDistancePerformance(cms), runningStyles: calculateUmaRunningStyleStatistics(cms).rows, roles: calculateUmaRoleStatistics(cms).rows }
  const loh = calculateLoHUmaStatistics(lohs, getUmaStatisticsCatalogue(versions, recorded.umas))
  const umas = new Map<string, OverviewUma>()
  for (const uma of [...cm.umas, ...loh.umas]) {
    const old = umas.get(uma.versionId)
    umas.set(uma.versionId, old ? {
      ...old, ...withWinRate({ races: old.races + uma.races, wins: old.wins + uma.wins }),
      cmEvents: old.cmEvents + uma.cmEvents, lohEvents: (old.lohEvents ?? 0) + (uma.lohEvents ?? 0),
      finalAppearances: old.finalAppearances + uma.finalAppearances, finalWins: old.finalWins + uma.finalWins,
      extraStageAppearances: (old.extraStageAppearances ?? 0) + (uma.extraStageAppearances ?? 0), rawPoints: uma.rawPoints,
      distances: mergeRows([...old.distances, ...uma.distances], row => row.distance),
    } : { ...uma, distances: uma.distances.map(row => ({ ...row })) })
  }
  const styles = mergeRows([...cm.runningStyles, ...loh.runningStyles], row => row.style)
  const knownStyleRaces = styles.reduce((sum, row) => sum + row.races, 0)
  const roles = mergeRows([...cm.roles, ...loh.roles], row => row.role)
  const knownRoleRaces = roles.reduce((sum, row) => sum + row.races, 0)
  const overall: UmaOverviewData = {
    umas: [...umas.values()], overall: withWinRate({ races: cm.overall.races + loh.overall.races, wins: cm.overall.wins + loh.overall.wins, umasUsed: umas.size }),
    distances: mergeRows([...cm.distances, ...loh.distances], row => row.distance).sort((a, b) => a.distance - b.distance),
    categories: mergeRows([...cm.categories, ...loh.categories], row => row.category),
    surfaces: mergeRows([...cm.surfaces, ...loh.surfaces], row => row.surface),
    uncategorizedRaces: cm.uncategorizedRaces + loh.uncategorizedRaces,
    runningStyles: styles.map(row => ({ ...row, usage: knownStyleRaces ? row.races / knownStyleRaces * 100 : null })),
    roles: roles.map(row => ({ ...row, usage: knownRoleRaces ? row.races / knownRoleRaces * 100 : null })),
  }
  return { cm, loh, overall }
}
