import { aggregateUmaCompetitiveRecords } from "./umaComparison"
import type { UmaCompetitiveRecord } from "./umaComparison"
import type { UmaDetailStatistics } from "./umaDetailStatistics"

/** CM is currently the only supported mode; add compatible records when other modes are implemented. */
export function getUmaCareerOverall(statistics: UmaDetailStatistics, additionalModes: UmaCompetitiveRecord[] = []): UmaCompetitiveRecord {
  return aggregateUmaCompetitiveRecords([
    { races: statistics.races, wins: statistics.wins, winRate: statistics.winRate, events: statistics.cmEvents },
    ...additionalModes,
  ])
}
