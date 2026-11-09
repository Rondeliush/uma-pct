import assert from "node:assert/strict"
import test from "node:test"
import { importTS } from "./helpers/importTS.mjs"

const { getUmaDetailPerformanceScopes } = await importTS(new URL("../src/Statistics/umaDetailPerformance.ts", import.meta.url))
const { calculateUmaDetailStatistics, getUmaDetailInsights, getUmaDistancePerformance } = await importTS(new URL("../src/Statistics/umaDetailStatistics.ts", import.meta.url))
const { calculateUmaRunningStyleStatistics } = await importTS(new URL("../src/Statistics/umaRunningStyleStatistics.ts", import.meta.url))
const { getUmaRunningStyleDisplayRows } = await importTS(new URL("../src/Statistics/umaRunningStylePresentation.ts", import.meta.url))
const { calculateUmaRoleStatistics } = await importTS(new URL("../src/Statistics/umaRoleStatistics.ts", import.meta.url))
const { calculateUmaEntrySourceStatistics } = await importTS(new URL("../src/Statistics/umaEntrySourceStatistics.ts", import.meta.url))
const { createLoHEvent } = await importTS(new URL("../src/LoH/lohData.ts", import.meta.url))
const { getLoHLineupSnapshot, getLoHParticipantStats } = await importTS(new URL("../src/LoH/progress.ts", import.meta.url))

function cm() {
  return { number: 1, name: "CM", track: "Tokyo", surface: "Turf", distance: 1600, length: "Mile", finalPlace: "", participants: [],
    attempts: [{ day: 1, attempt: 1, racesPlayed: 10, retired: false, umaWins: [{ cmUmaId: "a", wins: 6,
      configuration: { umaVersionId: "original", runningStyle: "front_runner", ace: true, debuffer: false, entrySource: "manual", configurationSource: "recorded" } }] }] }
}
function loh(number = 1, version = "original", places = [1, 2, 3, 4, 5]) {
  const event = createLoHEvent([], { number, name: "LoH", racecourse: "Tokyo", surface: "Dirt", distance: 1600, length: "Mile", direction: "Left", season: "Spring",
    lineup: [version, "teio", "ship"].map(id => ({ id, name: id, style: "End Closer", ace: false, debuffer: true, autoRun: true })),
  }, `event-${number}`)
  event.raceSets = [{ id: `set-${number}`, day: 1, order: 1, createdAt: "2026-11-01T01:00:00Z", weather: "Sunny", condition: "Firm", lineupSnapshot: getLoHLineupSnapshot(event),
    races: places.map((place, index) => {
      const others = [1, 2, 3].filter(value => value !== place)
      return { id: `race-${index}`, placements: [{ umaId: version, place }, { umaId: "teio", place: others[0] }, { umaId: "ship", place: others[1] }] }
    }),
  }]
  return event
}
function extra(event) {
  return { ...event, extraStage: { registeredAt: "2026-11-02T01:00:00Z", lineupSnapshot: getLoHLineupSnapshot(event).map((uma, i) => i ? uma : { ...uma, runningStyle: "runaway", ace: false, debuffer: false, autoRun: false }),
    result: { id: "extra", createdAt: "2026-11-02T02:00:00Z", placements: [{ umaId: event.currentLineup[0], placement: "first" }, { umaId: "teio", placement: "second" }, { umaId: "ship", placement: "third" }] },
  } }
}

test("CM scope preserves all existing individual performance helpers, including raced final snapshots", () => {
  const event = cm()
  event.finalPlace = "1st"
  event.finalResults = [{ cmUmaId: "a", placement: "second", placementSource: "recorded", won: false,
    configuration: { ...event.attempts[0].umaWins[0].configuration, runningStyle: "late_surger", ace: false, debuffer: true, entrySource: "autorun" } }]
  const { cm: result } = getUmaDetailPerformanceScopes([event], [], "original")
  const detail = calculateUmaDetailStatistics([event], "original")
  assert.deepEqual(result.events, detail.events)
  assert.deepEqual(result.surfaces, getUmaDetailInsights(detail).surfaces)
  assert.deepEqual(result.distances, getUmaDistancePerformance(detail.events).distances)
  assert.deepEqual(result.roles, calculateUmaRoleStatistics([event], "original"))
  assert.deepEqual(result.entrySources, calculateUmaEntrySourceStatistics([event], "original"))
  const styles = calculateUmaRunningStyleStatistics([event], "original")
  assert.deepEqual(result.runningStyles, { ...styles, rows: getUmaRunningStyleDisplayRows(styles) })
})

test("Overall recomputes weighted rates from CM and LoH rather than averaging percentages", () => {
  const events = [extra(loh())]
  const result = getUmaDetailPerformanceScopes([cm()], events, "original")
  assert.deepEqual(result.overall.distances, [{ distance: 1600, races: 16, wins: 8, winRate: 50 }])
  assert.deepEqual(result.overall.surfaces, [{ surface: "Turf", races: 10, wins: 6, winRate: 60 }, { surface: "Dirt", races: 6, wins: 2, winRate: 2 / 6 * 100 }])
  assert.equal(result.overall.categories[0].races, 16)
  assert.equal(result.overall.categories[0].wins, 8)
  assert.equal(result.overall.runningStyles.rows.find(row => row.style === "front_runner").usage, 62.5)
  assert.equal(result.overall.runningStyles.rows.find(row => row.style === "runaway").usage, 6.25)
  assert.equal(result.overall.entrySources.rows.find(row => row.source === "manual").races, 11)
  assert.equal(result.overall.entrySources.rows.find(row => row.source === "manual").usage, 11 / 16 * 100)
  assert.equal(result.overall.roles.rows.find(row => row.role === "ace").usage, 62.5)
})

test("LoH uses this version's historical Main and Extra Stage configuration instead of today's flags", () => {
  const event = extra(loh())
  event.participants[0] = { ...event.participants[0], runningStyle: "pace_chaser", ace: true, debuffer: true, autoRun: true }
  const before = structuredClone(event)
  const result = getUmaDetailPerformanceScopes([], [event], "original").loh
  const canonical = getLoHParticipantStats(event).find(row => row.umaId === "original")
  assert.deepEqual(result.distances.map(row => [row.races, row.wins]), [[canonical.races, canonical.wins]])
  assert.equal(result.runningStyles.rows.find(row => row.style === "end_closer").races, 5)
  assert.equal(result.runningStyles.rows.find(row => row.style === "runaway").races, 1)
  assert.equal(result.runningStyles.rows.find(row => row.style === "pace_chaser").races, 0)
  assert.equal(result.roles.rows.find(row => row.role === "debuffer").races, 5)
  assert.equal(result.roles.rows.find(row => row.role === "no_special_role").races, 1)
  assert.equal(result.entrySources.rows.find(row => row.source === "autorun").races, 5)
  assert.equal(result.entrySources.rows.find(row => row.source === "manual").races, 1)
  assert.deepEqual(event, before)
})

test("alternate versions, unused lineups and other Umas' wins never enter the selected version scope", () => {
  const event = loh(1, "original", Array(5).fill(3))
  const alternate = extra(loh(2, "alternate"))
  const unused = loh(3)
  unused.raceSets = []
  const result = getUmaDetailPerformanceScopes([], [event, alternate, unused], "original").loh
  assert.equal(result.events.length, 1)
  assert.deepEqual([result.distances[0].races, result.distances[0].wins], [5, 0])
  assert.equal(result.entrySources.rows.find(row => row.source === "autorun").wins, 0)
})

test("unknown LoH snapshots retain missing styles, roles and sources without borrowing current lineup flags", () => {
  const unknown = loh()
  unknown.raceSets[0].lineupSnapshot[0] = { umaId: "original" }
  const known = loh(2)
  const result = getUmaDetailPerformanceScopes([], [unknown, known], "original").loh
  assert.equal(result.runningStyles.unknownStyleRaces, 5)
  assert.equal(result.runningStyles.rows.find(row => row.style === "end_closer").usage, 50)
  assert.equal(result.roles.unknownRoleRaces, 5)
  assert.equal(result.roles.rows.find(row => row.role === "unknown").races, 5)
  assert.equal(result.roles.rows.find(row => row.role === "unknown").usage, 50)
  assert.equal(result.entrySources.unknownSourceRaces, 5)
  assert.equal(result.entrySources.attributedRaces, 5)
  assert.equal(result.entrySources.rows.find(row => row.source === "autorun").usage, 100)
})

test("legacy aggregates preserve known distance totals and leave unrecorded configurations unknown", () => {
  const legacy = loh()
  delete legacy.raceSets
  legacy.participants[0] = { umaId: "original", races: 8, wins: 2, top3Finishes: 4 }
  legacy.racesPlayed = 8
  legacy.firstPlaces = 2
  const result = getUmaDetailPerformanceScopes([], [legacy], "original").loh
  assert.deepEqual([result.distances[0].races, result.distances[0].wins], [8, 2])
  assert.equal(result.runningStyles.unknownStyleRaces, 8)
  assert.equal(result.roles.unknownRoleRaces, 8)
  assert.equal(result.entrySources.unknownSourceRaces, 8)
})

test("empty scopes have no synthetic performance, NaN rates or mutated input data", () => {
  const inputs = { cms: [cm()], lohs: [loh()] }
  const before = structuredClone(inputs)
  const scopes = getUmaDetailPerformanceScopes(inputs.cms, inputs.lohs, "unused")
  for (const scope of Object.values(scopes)) {
    assert.equal(scope.events.length, 0)
    assert.equal(scope.distances.length, 0)
    assert.equal(scope.surfaces.length, 0)
    for (const performance of [scope.roles, scope.runningStyles, scope.entrySources]) assert.ok(performance.rows.every(row => row.races === 0 && row.winRate === null && row.usage === null))
  }
  assert.deepEqual(inputs, before)
})

test("missing surfaces and categories are not guessed and exact-distance filtering still works", () => {
  const unknown = loh()
  unknown.surface = null
  unknown.length = null
  const known = loh(2)
  const result = getUmaDetailPerformanceScopes([], [unknown, known], "original").loh
  assert.equal(result.unknownSurfaceRaces, 5)
  assert.equal(result.uncategorizedRaces, 5)
  assert.equal(result.surfaces[0].races, 5)
  assert.equal(result.categories[0].races, 5)
  assert.equal(getUmaDistancePerformance(result.events, "Dirt").distances[0].races, 5)
})

test("league filter scopes every CM breakdown and recomputes Overall without filtering LoH", () => {
  const graded = { ...cm(), league: "Graded League", finalPlace: "1st" }
  graded.finalResults = [{ cmUmaId: "a", placement: "first", placementSource: "recorded", won: true, configuration: graded.attempts[0].umaWins[0].configuration }]
  const open = { ...cm(), number: 2, league: "Open League", distance: 2400, length: "Long", surface: "Dirt" }
  open.attempts[0].racesPlayed = 20
  open.attempts[0].umaWins[0] = { ...open.attempts[0].umaWins[0], wins: 3, configuration: { ...open.attempts[0].umaWins[0].configuration, runningStyle: "end_closer", ace: false, debuffer: true, entrySource: "autorun" } }
  const legacy = { ...cm(), number: 3 }
  const cms = [graded, open, legacy]
  const lohs = [extra(loh())]
  const before = structuredClone({ cms, lohs })
  const all = getUmaDetailPerformanceScopes(cms, lohs, "original")
  for (const [league, selected] of [["Graded League", graded], ["Open League", open]]) {
    const filtered = getUmaDetailPerformanceScopes(cms, lohs, "original", league)
    assert.deepEqual(filtered, getUmaDetailPerformanceScopes([selected], lohs, "original"))
    assert.deepEqual(filtered.loh, all.loh)
    assert.equal(filtered.cm.events.length, 1)
    assert.equal(filtered.cm.events[0].number, selected.number)
    const races = league === "Graded League" ? 11 : 20
    const wins = league === "Graded League" ? 7 : 3
    assert.equal(filtered.overall.runningStyles.totalRaces, races + 6)
    assert.equal(filtered.overall.roles.rows.reduce((sum, row) => sum + row.wins, 0), wins + 2)
    assert.equal(filtered.overall.distances.reduce((sum, row) => sum + row.wins, 0), wins + 2)
    assert.equal(filtered.overall.entrySources.attributedRaces, races + 6)
  }
  assert.equal(all.cm.events.length, 3)
  assert.deepEqual(getUmaDetailPerformanceScopes([legacy], lohs, "original", "Graded League"), getUmaDetailPerformanceScopes([], lohs, "original"))
  assert.deepEqual({ cms, lohs }, before)
})

test("Surface filters all performance tables in CM, LoH and Overall using the existing event calculations", () => {
  const turfCM = { ...cm(), league: "Graded League" }
  const dirtCM = { ...cm(), number: 2, surface: "Dirt", distance: 2400, length: "Long", league: "Open League" }
  dirtCM.attempts[0].racesPlayed = 20
  dirtCM.attempts[0].umaWins[0] = { ...dirtCM.attempts[0].umaWins[0], wins: 3, configuration: { ...dirtCM.attempts[0].umaWins[0].configuration, runningStyle: "end_closer", ace: false, debuffer: true, entrySource: "autorun" } }
  const turfLoH = { ...loh(), surface: "Turf" }
  const dirtLoH = extra(loh(2))
  const unknownCM = { ...cm(), number: 3, surface: null }
  const unknownLoH = { ...loh(3), surface: null }
  const inputs = { cms: [turfCM, dirtCM, unknownCM], lohs: [turfLoH, dirtLoH, unknownLoH] }
  const before = structuredClone(inputs)
  for (const [surface, selectedCM, selectedLoH, races, wins] of [["Turf", turfCM, turfLoH, 15, 7], ["Dirt", dirtCM, dirtLoH, 26, 5]]) {
    const result = getUmaDetailPerformanceScopes(inputs.cms, inputs.lohs, "original", "all", surface)
    assert.deepEqual(result, getUmaDetailPerformanceScopes([selectedCM], [selectedLoH], "original"))
    assert.equal(result.overall.runningStyles.totalRaces, races)
    assert.equal(result.overall.roles.totalRaces, races)
    assert.equal(result.overall.entrySources.attributedRaces, races)
    assert.equal(result.overall.surfaces.length, 1)
    assert.equal(result.overall.surfaces[0].surface, surface)
    assert.equal(result.overall.surfaces[0].winRate, wins / races * 100)
    assert.equal(result.overall.distances.reduce((sum, row) => sum + row.races, 0), races)
    assert.equal(result.overall.categories.reduce((sum, row) => sum + row.wins, 0), wins)
  }
  const leagueAndSurface = getUmaDetailPerformanceScopes(inputs.cms, inputs.lohs, "original", "Graded League", "Dirt")
  assert.deepEqual(leagueAndSurface, getUmaDetailPerformanceScopes([], [dirtLoH], "original"))
  const all = getUmaDetailPerformanceScopes(inputs.cms, inputs.lohs, "original", "all", "All")
  assert.equal(all.cm.events.length, 3)
  assert.equal(all.loh.events.length, 3)
  assert.equal(all.overall.unknownSurfaceRaces, 15)
  assert.deepEqual(inputs, before)
})
