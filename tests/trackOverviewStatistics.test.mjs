import assert from "node:assert/strict"
import test from "node:test"
import { importTS } from "./helpers/importTS.mjs"

const { getTrackOverviewStatistics } = await importTS(new URL("../src/Statistics/trackOverviewStatistics.ts", import.meta.url))
const { calculateTrackStatistics } = await importTS(new URL("../src/Statistics/trackStatistics.ts", import.meta.url))
const { getGlobalTrackMetadataPerformance } = await importTS(new URL("../src/Statistics/trackMetadataStatistics.ts", import.meta.url))
const { getLoHEventStatistics } = await importTS(new URL("../src/LoH/eventStatistics.ts", import.meta.url))
const { createLoHEvent } = await importTS(new URL("../src/LoH/lohData.ts", import.meta.url))
const { getLoHLineupSnapshot } = await importTS(new URL("../src/LoH/progress.ts", import.meta.url))

function cm(number, fields = {}) {
  return { number, track: "Hanshin", surface: "Turf", league: "Graded League", weather: "Sunny", condition: "Firm", season: "Autumn", direction: "Right", participants: [], attempts: [{ racesPlayed: 10, umaWins: [{ cmUmaId: "a", wins: 4 }] }], finalPlace: "", ...fields }
}
function loh(number, fields = {}) {
  const event = createLoHEvent([], { number, name: `LoH ${number}`, racecourse: "Hanshin", surface: "Turf", distance: 1600, length: "Mile", direction: "Right", season: "Autumn",
    lineup: ["a", "b", "c"].map(id => ({ id, name: id, style: "Pace Chaser", ace: false, debuffer: false, autoRun: false })),
  }, `loh-${number}`)
  return { ...event, raceSets: [{ id: `set-${number}`, day: 1, order: 1, createdAt: "2026-11-01T01:00:00Z", weather: "Rainy", condition: "Heavy", lineupSnapshot: getLoHLineupSnapshot(event),
    races: Array.from({ length: 5 }, (_, i) => ({ id: `race-${i}`, placements: ["a", "b", "c"].map((umaId, p) => ({ umaId, place: p + (i < 3 ? 1 : 2) })) })),
  }], ...fields }
}
const extra = event => ({ ...event, extraStage: { registeredAt: "2026-11-02T01:00:00Z", lineupSnapshot: getLoHLineupSnapshot(event), result: {
  id: "extra", createdAt: "2026-11-02T02:00:00Z", weather: "Snowy", condition: "Good", placements: ["a", "b", "c"].map((umaId, i) => ({ umaId, placement: ["first", "second", "third"][i] })),
} } })
const row = (group, label) => group.rows.find(row => row.label === label)

test("CM scope exactly preserves existing track and metadata calculations, including final-only and unknown tracks", () => {
  const cms = [cm(1), cm(2, { track: "Oi", surface: "Dirt", attempts: [], finalPlace: "1st" }), cm(3, { track: "", weather: null })]
  const actual = getTrackOverviewStatistics(cms, [loh(1)], "cm")
  assert.deepEqual({ overall: actual.overall, tracks: actual.tracks }, calculateTrackStatistics(cms))
  assert.deepEqual(actual.metadata, getGlobalTrackMetadataPerformance(cms))
})

test("LoH uses native team totals once per race including Extra Stage, with real set-level weather and condition", () => {
  const event = extra(loh(1, { weather: "Sunny", condition: "Firm" }))
  const native = getLoHEventStatistics([event]).totals
  const actual = getTrackOverviewStatistics([cm(1)], [event], "loh")
  assert.equal(actual.overall.races, native.races)
  assert.equal(actual.overall.wins, native.wins)
  assert.deepEqual(actual.overall, { tracksUsed: 1, races: 6, wins: 4, winRate: 4 / 6 * 100 })
  assert.deepEqual(row(actual.metadata.weather, "Rainy"), { label: "Rainy", races: 5, wins: 3, winRate: 60 })
  assert.equal(row(actual.metadata.weather, "Snowy").races, 1)
  assert.equal(row(actual.metadata.weather, "Sunny").races, 0)
  assert.equal(row(actual.metadata.conditions, "Heavy").races, 5)
  assert.equal(row(actual.metadata.conditions, "Good").wins, 1)
  assert.equal(row(actual.metadata.conditions, "Firm").races, 0)
  assert.equal(row(actual.metadata.seasons, "Autumn").races, 6)
  assert.equal(actual.metadata.weather.unknownRaces, 0)
})

test("Overall sums CM and LoH totals and weighted rates, merging aliases while keeping same-number events distinct", () => {
  const actual = getTrackOverviewStatistics([cm(1, { track: "Oi", surface: "Dirt" })], [loh(1, { racecourse: "Ooi", surface: "Dirt" })])
  assert.equal(actual.tracks.length, 1)
  assert.equal(actual.tracks[0].racetrack, "Ooi")
  assert.equal(actual.tracks[0].events, 2)
  assert.equal(actual.overall.races, 15)
  assert.equal(actual.overall.wins, 7)
  assert.equal(actual.overall.winRate, 7 / 15 * 100)
  assert.equal(actual.turfTracks.length, 0)
  assert.deepEqual(actual.dirtTracks, actual.tracks)
})

test("surface filters apply to all totals/metadata/highlights; league filters apply only to CM and never leak to Overall/LoH", () => {
  const cms = [cm(1), cm(2, { track: "Oi", surface: "Dirt", league: "Open League" }), cm(3, { league: undefined })]
  const lohs = [loh(1), loh(2, { surface: "Dirt" })]
  const before = structuredClone({ cms, lohs })
  const graded = getTrackOverviewStatistics(cms, lohs, "cm", "Turf", "Graded League")
  assert.equal(graded.overall.races, 10)
  assert.equal(graded.dirtTracks.length, 0)
  assert.equal(row(graded.metadata.weather, "Sunny").races, 10)
  assert.equal(getTrackOverviewStatistics(cms, lohs, "cm", "Dirt", "Open League").overall.races, 10)
  assert.equal(getTrackOverviewStatistics(cms, lohs, "cm", "Dirt", "Graded League").overall.races, 0)
  for (const scope of ["overall", "loh"]) assert.deepEqual(getTrackOverviewStatistics(cms, lohs, scope, "Dirt", "Graded League"), getTrackOverviewStatistics(cms, lohs, scope, "Dirt", "all"))
  assert.equal(getTrackOverviewStatistics(cms, lohs, "overall", "Dirt").overall.races, 15)
  assert.deepEqual({ cms, lohs }, before)
})

test("legacy and missing LoH set conditions stay unknown without borrowing event-level conditions", () => {
  const event = loh(1, { weather: "Sunny", condition: "Firm" })
  event.raceSets[0].weather = null; event.raceSets[0].condition = null
  event.legacyProgress = { leagueScore: 0, racesPlayed: 7, firstPlaces: 2, top3Finishes: 0, participants: [] }
  const actual = getTrackOverviewStatistics([], [event], "loh")
  assert.equal(actual.overall.races, 12)
  assert.equal(actual.overall.wins, 5)
  assert.equal(actual.metadata.weather.unknownRaces, 12)
  assert.equal(actual.metadata.conditions.unknownRaces, 12)
  assert.equal(row(actual.metadata.weather, "Sunny").races, 0)
  assert.equal(row(actual.metadata.directions, "Right").races, 12)
})

test("unused events and empty scopes never fabricate results or NaN rates", () => {
  const actual = getTrackOverviewStatistics([cm(1, { attempts: [] })], [loh(1, { raceSets: [] })])
  assert.deepEqual(actual.overall, { tracksUsed: 0, races: 0, wins: 0, winRate: null })
  assert.equal(actual.tracks.length, 0)
  assert.deepEqual(actual.distances, [])
  assert.ok(Object.values(actual.metadata).every(group => group.rows.every(row => row.races === 0 && row.winRate === null)))
})

test("distance tab sums team races by exact distance, including LoH Extra Stage, using weighted win rates", () => {
  const cms = [cm(1, { distance: 1600, length: "Mile" }), cm(2, { distance: 2000, length: "Medium" })]
  const lohs = [extra(loh(1))]
  const actual = getTrackOverviewStatistics(cms, lohs)
  assert.deepEqual(actual.distances, [
    { distance: 1600, races: 16, wins: 8, winRate: 50 },
    { distance: 2000, races: 10, wins: 4, winRate: 40 },
  ])
  assert.equal(actual.distances.reduce((sum, row) => sum + row.races, 0), actual.overall.races)
  assert.deepEqual(getTrackOverviewStatistics(cms, lohs, "cm").distances, [
    { distance: 1600, races: 10, wins: 4, winRate: 40 },
    { distance: 2000, races: 10, wins: 4, winRate: 40 },
  ])
  assert.deepEqual(getTrackOverviewStatistics(cms, lohs, "loh").distances, [
    { distance: 1600, races: 6, wins: 4, winRate: 4 / 6 * 100 },
  ])
})

test("distance tab respects the shared surface and CM-only league filters", () => {
  const cms = [cm(1, { distance: 1600 }), cm(2, { distance: 2000, surface: "Dirt", league: "Open League" })]
  const lohs = [loh(1), loh(2, { distance: 2000, surface: "Dirt" })]
  assert.deepEqual(getTrackOverviewStatistics(cms, lohs, "cm", "Dirt", "Open League").distances, [
    { distance: 2000, races: 10, wins: 4, winRate: 40 },
  ])
  assert.deepEqual(getTrackOverviewStatistics(cms, lohs, "cm", "Dirt", "Graded League").distances, [])
  assert.deepEqual(getTrackOverviewStatistics(cms, lohs, "overall", "Turf", "Open League").distances, [
    { distance: 1600, races: 15, wins: 7, winRate: 7 / 15 * 100 },
  ])
})

test("distance tab excludes unknown/nonpositive distances and never creates rows for unraced events", () => {
  const cms = [undefined, 0, -100, NaN, Infinity].map((distance, i) => cm(i, { distance }))
  cms.push(cm(10, { distance: 2400, attempts: [], finalPlace: "1st" }))
  const lohs = [loh(1, { distance: undefined }), loh(2, { distance: 1600, raceSets: [] })]
  const actual = getTrackOverviewStatistics(cms, lohs)
  assert.ok(actual.overall.races > 0)
  assert.deepEqual(actual.distances, [])
})

test("distance categories reuse saved category names, combine different exact distances, and weight CM/LoH totals", () => {
  const cms = [cm(1, { distance: 1200, length: "Short" }), cm(2, { distance: 1800, length: "Short" }), cm(3, { distance: 2000, length: "Mile" })]
  const lohs = [loh(1, { distance: 1000, length: "Short" }), extra(loh(2))]
  const before = structuredClone({ cms, lohs })
  const actual = getTrackOverviewStatistics(cms, lohs)
  assert.deepEqual(actual.distanceCategories, [
    { category: "Sprint", races: 25, wins: 11, winRate: 44 },
    { category: "Mile", races: 16, wins: 8, winRate: 50 },
    { category: "Medium", races: 0, wins: 0, winRate: null },
    { category: "Long", races: 0, wins: 0, winRate: null },
  ])
  assert.equal(actual.distanceCategories.reduce((sum, row) => sum + row.races, 0), actual.overall.races)
  assert.deepEqual({ cms, lohs }, before)
})

test("category mode uses the same scope/surface/league filters and keeps all four categories for empty data", () => {
  const cms = [cm(1, { distance: 1200, length: "Short" }), cm(2, { distance: 2400, length: "Long", surface: "Dirt", league: "Open League" })]
  const lohs = [loh(1, { distance: 2000, length: "Medium", surface: "Dirt" })]
  const categories = (scope, surface = "all", league = "all") => getTrackOverviewStatistics(cms, lohs, scope, surface, league).distanceCategories
  assert.deepEqual(categories("cm", "Dirt", "Open League").map(row => row.races), [0, 0, 0, 10])
  assert.deepEqual(categories("cm", "Dirt", "Graded League").map(row => row.races), [0, 0, 0, 0])
  assert.deepEqual(categories("loh", "Dirt", "Open League").map(row => row.races), [0, 0, 5, 0])
  assert.deepEqual(categories("overall", "Dirt", "Graded League").map(row => row.races), [0, 0, 5, 10])
  const empty = getTrackOverviewStatistics([], []).distanceCategories
  assert.deepEqual(empty.map(row => row.category), ["Sprint", "Mile", "Medium", "Long"])
  assert.ok(empty.every(row => row.races === 0 && row.wins === 0 && row.winRate === null))
})

test("legacy Yielding races remain in totals without changing their recorded conditions", () => {
  const cms = [cm(1, { condition: "Yielding" })]
  const event = loh(1)
  event.raceSets[0].condition = "Yielding"
  const before = structuredClone({ cms, event })
  const actual = getTrackOverviewStatistics(cms, [event])
  assert.equal(actual.overall.races, 15)
  assert.equal(actual.overall.wins, 7)
  assert.deepEqual(row(actual.metadata.conditions, "Yielding"), { label: "Yielding", races: 15, wins: 7, winRate: 7 / 15 * 100 })
  assert.deepEqual({ cms, event }, before)
})
