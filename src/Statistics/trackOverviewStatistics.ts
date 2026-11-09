import type { CM } from "../types/types"
import { TRACK_CONDITIONS, TRACK_DIRECTIONS, TRACK_SEASONS, TRACK_WEATHER } from "../types/types"
import { getTrackName } from "../data/trackData"
import { getLoHEventStatistics } from "../LoH/eventStatistics"
import { getLoHExtraStageOutcome } from "../LoH/extraStage"
import { getLoHProgress } from "../LoH/progress"
import type { LoH } from "../LoH/types"
import { calculateTrackEventResults, calculateTrackStatistics, withWinRate } from "./trackStatistics"
import type { TrackPerformance } from "./trackStatistics"
import { getGlobalTrackMetadataPerformance } from "./trackMetadataStatistics"
import { getUmaDistancePerformance, recordedCategory, UMA_DISTANCE_CATEGORIES } from "./umaDetailStatistics"

export type TrackOverviewScope = "overall" | "cm" | "loh"
export type TrackOverviewSurface = "all" | "Turf" | "Dirt"
export type TrackOverviewLeague = "all" | "Graded League" | "Open League"
export type TrackOverviewMetadata = ReturnType<typeof getGlobalTrackMetadataPerformance>
type MetadataBatch = { races: number; wins: number; weather: string | null; condition: string | null; season: string | null; direction: string | null }

function mergeTracks(groups: TrackPerformance[][]) {
  const tracks = new Map<string, TrackPerformance>()
  for (const group of groups) for (const row of group) {
    const old = tracks.get(row.racetrack)
    tracks.set(row.racetrack, old ? withWinRate({ racetrack: row.racetrack, events: old.events + row.events, races: old.races + row.races, wins: old.wins + row.wins }) : { ...row })
  }
  return [...tracks.values()]
}

/** LoH team totals come from the same projection as Statistics > Events. */
function lohTracks(rows: ReturnType<typeof getLoHEventStatistics>["rows"]) {
  return mergeTracks(rows.filter(row => row.races > 0 && row.event.racecourse.trim()).map(row => [withWinRate({
    racetrack: getTrackName(row.event.racecourse) ?? row.event.racecourse,
    events: 1, races: row.races, wins: row.wins,
  })]))
}

function lohMetadata(rows: ReturnType<typeof getLoHEventStatistics>["rows"], totals: { races: number }): TrackOverviewMetadata {
  const batches: MetadataBatch[] = []
  for (const { event, races, wins } of rows) {
    let recordedRaces = 0, recordedWins = 0
    const add = (count: number, victories: number, weather: string | null, condition: string | null) => {
      batches.push({ races: count, wins: victories, weather, condition, season: event.season, direction: event.direction })
      recordedRaces += count; recordedWins += victories
    }
    for (const set of getLoHProgress(event).raceSets) {
      const victories = set.races.reduce((sum, race) => sum + race.placements.filter(p => p.place === 1).length, 0)
      add(set.races.length, victories, set.weather, set.condition)
    }
    const extra = event.extraStage?.result
    const outcome = getLoHExtraStageOutcome(event)
    if (extra && outcome !== null) add(1, Number(outcome === "winner"), extra.weather, extra.condition)
    // Legacy totals have no set-level conditions. Never borrow event-level Random or old Sunny/Firm.
    if (races > recordedRaces) add(races - recordedRaces, wins - recordedWins, null, null)
  }
  const group = <T extends string>(field: "condition" | "weather" | "season" | "direction", values: readonly T[]) => {
    const rows = values.map(label => withWinRate({ label,
      races: batches.filter(batch => batch[field] === label).reduce((sum, batch) => sum + batch.races, 0),
      wins: batches.filter(batch => batch[field] === label).reduce((sum, batch) => sum + batch.wins, 0),
    }))
    return { rows, unknownRaces: totals.races - rows.reduce((sum, row) => sum + row.races, 0) }
  }
  return { conditions: group("condition", TRACK_CONDITIONS), weather: group("weather", TRACK_WEATHER), seasons: group("season", TRACK_SEASONS), directions: group("direction", TRACK_DIRECTIONS) }
}

function mergeMetadata(cm: TrackOverviewMetadata, loh: TrackOverviewMetadata): TrackOverviewMetadata {
  const group = <T extends string>(a: { rows: { label: T; races: number; wins: number }[]; unknownRaces: number }, b: typeof a) => ({
    rows: a.rows.map((row, i) => withWinRate({ label: row.label, races: row.races + b.rows[i].races, wins: row.wins + b.rows[i].wins })),
    unknownRaces: a.unknownRaces + b.unknownRaces,
  })
  return { conditions: group(cm.conditions, loh.conditions), weather: group(cm.weather, loh.weather), seasons: group(cm.seasons, loh.seasons), directions: group(cm.directions, loh.directions) }
}

/** Filters are local to this overview. CM's existing totals and event mechanics stay unchanged. */
export function getTrackOverviewStatistics(cms: CM[], lohs: LoH[], scope: TrackOverviewScope = "overall", surface: TrackOverviewSurface = "all", league: TrackOverviewLeague = "all") {
  const selectedCms = scope === "loh" ? [] : cms.filter(cm => (surface === "all" || cm.surface === surface) && (scope !== "cm" || league === "all" || cm.league === league))
  const selectedLohs = scope === "cm" ? [] : lohs.filter(event => surface === "all" || event.surface === surface)
  const cm = calculateTrackStatistics(selectedCms)
  const loh = getLoHEventStatistics(selectedLohs)
  const tracks = mergeTracks([cm.tracks, lohTracks(loh.rows)])
  const surfaces = (value: "Turf" | "Dirt") => mergeTracks([
    calculateTrackStatistics(selectedCms.filter(cm => cm.surface === value)).tracks,
    lohTracks(loh.rows.filter(row => row.event.surface === value)),
  ])
  const distance = getUmaDistancePerformance([
    ...selectedCms.map(event => ({ ...calculateTrackEventResults(event), distance: event.distance, category: recordedCategory(event.length), surface: event.surface })),
    ...loh.rows.map(({ event, races, wins }) => ({ races, wins, distance: event.distance ?? 0, category: event.length ? recordedCategory(event.length) : null, surface: event.surface ?? "Unknown" })),
  ])
  return {
    overall: withWinRate({ tracksUsed: tracks.length, races: cm.overall.races + loh.totals.races, wins: cm.overall.wins + loh.totals.wins }),
    tracks, turfTracks: surfaces("Turf"), dirtTracks: surfaces("Dirt"),
    distances: distance.distances,
    distanceCategories: UMA_DISTANCE_CATEGORIES.map(category => distance.categories.find(row => row.category === category)
      ?? { category, races: 0, wins: 0, winRate: null }),
    metadata: mergeMetadata(getGlobalTrackMetadataPerformance(selectedCms), lohMetadata(loh.rows, loh.totals)),
  }
}
