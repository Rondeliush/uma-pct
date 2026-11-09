import { trackImages } from "../data/trackData"
import type { CM } from "../types/types"
import type { LoH } from "../LoH/types"
import { getLoHEventStatistics } from "../LoH/eventStatistics"
import { getLoHProgress } from "../LoH/progress"
import { getLoHExtraStageOutcome } from "../LoH/extraStage"
import { getRecordedTrackId } from "./trackDetailsStatistics"
import { getTrackOverviewStatistics } from "./trackOverviewStatistics"
import type { TrackOverviewScope, TrackOverviewSurface, TrackOverviewLeague } from "./trackOverviewStatistics"
import { getTrackEventHistory } from "./trackEventHistoryStatistics"
import { MIN_RACES_FOR_WIN_RATE } from "./umaStatistics"

function best<T extends { races: number; wins: number; winRate: number | null }>(rows: T[]) {
  return rows.filter(row => row.races >= MIN_RACES_FOR_WIN_RATE)
    .sort((a, b) => b.winRate! - a.winRate! || b.races - a.races)[0] ?? null
}

/** A selected-track projection of the same scopes and totals used by the Tracks overview. */
export function getIndividualTrackStatistics(cms: CM[], lohs: LoH[], trackId: string, scope: TrackOverviewScope = "overall", surface: TrackOverviewSurface = "all", league: TrackOverviewLeague = "all") {
  const track = trackImages.find(track => track.id === trackId)
  if (!track) return null
  const matchingCms = cms.filter(cm => getRecordedTrackId(cm.track ?? "") === trackId)
  const matchingLohs = lohs.filter(event => getRecordedTrackId(event.racecourse) === trackId)
  const statistics = getTrackOverviewStatistics(matchingCms, matchingLohs, scope, surface, league)
  return {
    track, statistics,
    overall: { events: statistics.tracks[0]?.events ?? 0, races: statistics.overall.races, wins: statistics.overall.wins, winRate: statistics.overall.winRate },
    highlights: {
      distance: best(statistics.distances),
      condition: best(statistics.metadata.conditions.rows.filter(row => row.label !== "Yielding")),
      weather: best(statistics.metadata.weather.rows),
      season: best(statistics.metadata.seasons.rows),
    },
  }
}

export function getIndividualTrackHistory(cms: CM[], lohs: LoH[], trackId: string) {
  const cmRows = getTrackEventHistory(cms, trackId).map(row => ({ ...row, type: "cm" as const, key: `cm-${row.number}`,
    league: cms.find(cm => cm.number === row.number)?.league ?? null }))
  const lohRows = getLoHEventStatistics(lohs.filter(event => getRecordedTrackId(event.racecourse) === trackId)).rows
    .filter(row => row.races > 0).map(({ event, races, wins, winRate }) => {
      const progress = getLoHProgress(event)
      const extra = getLoHExtraStageOutcome(event) !== null ? event.extraStage?.result : null
      const conditions = (field: "weather" | "condition") => {
        const values = new Set<string | null>(progress.raceSets.filter(set => set.races.length > 0).map(set => set[field]))
        if (extra) values.add(extra[field])
        if (progress.racesPlayed > progress.raceSets.reduce((sum, set) => sum + set.races.length, 0)) values.add(null)
        return values.size > 1 ? "Mixed" : [...values][0] ?? null
      }
      return { type: "loh" as const, key: `loh-${event.id}`, number: event.number, name: event.name, league: null,
        distance: Number.isFinite(event.distance) && event.distance! > 0 ? event.distance : null,
        surface: event.surface, direction: event.direction, condition: conditions("condition"), weather: conditions("weather"), races, wins, winRate }
    })
  return [...cmRows, ...lohRows].sort((a, b) => b.number - a.number || a.type.localeCompare(b.type, "en"))
}

export type IndividualTrackHistoryRow = ReturnType<typeof getIndividualTrackHistory>[number]
