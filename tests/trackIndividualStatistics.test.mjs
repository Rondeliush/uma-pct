import assert from "node:assert/strict"
import test from "node:test"
import { importTS } from "./helpers/importTS.mjs"

const { getIndividualTrackStatistics, getIndividualTrackHistory } = await importTS(new URL("../src/Statistics/trackIndividualStatistics.ts", import.meta.url))
const { getTrackOverviewStatistics } = await importTS(new URL("../src/Statistics/trackOverviewStatistics.ts", import.meta.url))
const { getTrackEventHistory } = await importTS(new URL("../src/Statistics/trackEventHistoryStatistics.ts", import.meta.url))
const { createLoHEvent } = await importTS(new URL("../src/LoH/lohData.ts", import.meta.url))
const { getLoHLineupSnapshot } = await importTS(new URL("../src/LoH/progress.ts", import.meta.url))

function cm(number, fields = {}) {
  return { number, name: `CM ${number}`, track: "Hanshin", surface: "Turf", distance: 1600, length: "Mile", league: "Graded League", weather: "Sunny", condition: "Firm", season: "Autumn", direction: "Right", finalPlace: "", participants: [], attempts: [{ racesPlayed: 10, umaWins: [{ cmUmaId: "a", wins: 4 }] }], ...fields }
}
function loh(number, fields = {}) {
  const event = createLoHEvent([], { number, name: `LoH ${number}`, racecourse: "Hanshin", surface: "Turf", distance: 1600, length: "Mile", direction: "Right", season: "Autumn",
    lineup: ["a", "b", "c"].map(id => ({ id, name: id, style: "Pace Chaser", ace: false, debuffer: false, autoRun: false })),
  }, `loh-${number}`)
  return { ...event, weather: "Random", condition: "Random", raceSets: [{ id: `set-${number}`, day: 1, order: 1, createdAt: "2026-11-01T01:00:00Z", weather: "Rainy", condition: "Heavy", lineupSnapshot: getLoHLineupSnapshot(event),
    races: Array.from({ length: 5 }, (_, i) => ({ id: `race-${i}`, placements: ["a", "b", "c"].map((umaId, p) => ({ umaId, place: p + (i < 3 ? 1 : 2) })) })),
  }], ...fields }
}
const extra = event => ({ ...event, extraStage: { registeredAt: "2026-11-02T01:00:00Z", lineupSnapshot: getLoHLineupSnapshot(event), result: {
  id: "extra", createdAt: "2026-11-02T02:00:00Z", weather: "Snowy", condition: "Good", placements: ["a", "b", "c"].map((umaId, i) => ({ umaId, placement: ["first", "second", "third"][i] })),
} } })

test("track details reuse overview scope/filter totals, resolve aliases and exclude every other track", () => {
  const cms = [cm(1, { track: "Oi", surface: "Dirt" }), cm(2, { track: "Ooi", league: "Open League" }), cm(3)]
  const lohs = [extra(loh(1, { racecourse: "ohi", surface: "Dirt" })), loh(2)]
  for (const scope of ["overall", "cm", "loh"]) for (const surface of ["all", "Turf", "Dirt"]) for (const league of ["all", "Graded League", "Open League"]) {
    const details = getIndividualTrackStatistics(cms, lohs, "ooi", scope, surface, league)
    const overview = getTrackOverviewStatistics(cms.slice(0, 2), lohs.slice(0, 1), scope, surface, league)
    assert.equal(details.track.name, "Ooi")
    assert.deepEqual(details.statistics, overview)
    assert.deepEqual(details.overall, { events: overview.tracks[0]?.events ?? 0, races: overview.overall.races, wins: overview.overall.wins, winRate: overview.overall.winRate })
  }
  const overall = getIndividualTrackStatistics(cms, lohs, "ooi").overall
  assert.deepEqual(overall, { events: 3, races: 26, wins: 12, winRate: 12 / 26 * 100 })
})

test("highlights rank weighted results with the same ten-race threshold and no Yielding highlight", () => {
  const cms = [cm(1, { distance: 1200, weather: "Sunny", condition: "Firm", season: "Spring" }),
    cm(2, { distance: 2000, weather: "Cloudy", condition: "Good", attempts: [{ racesPlayed: 20, umaWins: [{ wins: 18 }] }] }),
    cm(3, { distance: 2000, weather: "Cloudy", condition: "Good", attempts: [{ racesPlayed: 10, umaWins: [{ wins: 2 }] }] }),
    cm(4, { distance: 2500, weather: "Snowy", condition: "Yielding", season: "Winter", attempts: [{ racesPlayed: 1, umaWins: [{ wins: 1 }] }] })]
  const { highlights } = getIndividualTrackStatistics(cms, [], "hanshin")
  assert.deepEqual(highlights.distance, { distance: 2000, races: 30, wins: 20, winRate: 20 / 30 * 100 })
  assert.equal(highlights.weather.label, "Cloudy")
  assert.equal(highlights.condition.label, "Good")
  assert.equal(highlights.season.label, "Autumn")
})

test("history preserves existing CM accounting and separates a same-number LoH event", () => {
  const cms = [cm(7), cm(10, { track: "Tokyo" }), cm(2, { attempts: [], finalPlace: "2nd" })]
  const lohs = [extra(loh(7)), loh(20, { racecourse: "Tokyo" })]
  const rows = getIndividualTrackHistory(cms, lohs, "hanshin")
  const cmRows = rows.filter(row => row.type === "cm").map(({ type, key, league, ...row }) => row)
  assert.deepEqual(cmRows, getTrackEventHistory(cms, "hanshin"))
  assert.deepEqual(rows.map(row => [row.type, row.number]), [["cm", 7], ["loh", 7], ["cm", 2]])
  assert.equal(new Set(rows.map(row => row.key)).size, 3)
  assert.deepEqual(rows.filter(row => row.type === "loh").map(row => [row.races, row.wins, row.winRate]), [[6, 4, 4 / 6 * 100]])
  assert.equal(rows[0].league, "Graded League")
})

test("LoH history shows actual set conditions, mixed conditions including Extra Stage and legacy unknowns", () => {
  const main = getIndividualTrackHistory([], [loh(1)], "hanshin")[0]
  assert.equal(main.weather, "Rainy")
  assert.equal(main.condition, "Heavy")
  const mixed = getIndividualTrackHistory([], [extra(loh(1))], "hanshin")[0]
  assert.equal(mixed.weather, "Mixed")
  assert.equal(mixed.condition, "Mixed")
  const legacy = loh(3, { raceSets: [], legacyProgress: { leagueScore: 0, racesPlayed: 7, firstPlaces: 2, top3Finishes: 0, participants: [] } })
  const unknown = getIndividualTrackHistory([], [legacy], "hanshin")[0]
  assert.equal(unknown.races, 7)
  assert.equal(unknown.weather, null)
  assert.equal(unknown.condition, null)
})

test("empty tracks and invalid IDs remain safe; reading either projection never changes profile data", () => {
  const cms = [cm(1)], lohs = [loh(1)]
  const before = structuredClone({ cms, lohs })
  assert.equal(getIndividualTrackStatistics(cms, lohs, "invalid"), null)
  const empty = getIndividualTrackStatistics(cms, lohs, "sapporo")
  assert.deepEqual(empty.overall, { events: 0, races: 0, wins: 0, winRate: null })
  assert.ok(Object.values(empty.highlights).every(value => value === null))
  assert.deepEqual(getIndividualTrackHistory(cms, lohs, "sapporo"), [])
  getIndividualTrackStatistics(cms, lohs, "hanshin", "cm", "Turf", "Graded League")
  getIndividualTrackHistory(cms, lohs, "hanshin")
  assert.deepEqual({ cms, lohs }, before)
})
