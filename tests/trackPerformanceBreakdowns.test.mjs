import assert from "node:assert/strict"
import test from "node:test"
import { importTS } from "./helpers/importTS.mjs"

const { getTrackPerformanceBreakdowns } = await importTS(new URL("../src/Statistics/trackPerformanceBreakdowns.ts", import.meta.url))
const { calculateTrackDetailsStatistics } = await importTS(new URL("../src/Statistics/trackDetailsStatistics.ts", import.meta.url))
const { UMA_DISTANCE_CATEGORIES } = await importTS(new URL("../src/Statistics/umaDetailStatistics.ts", import.meta.url))
const { TRACK_CONDITIONS } = await importTS(new URL("../src/types/types.ts", import.meta.url))
const { formatUmaWinRate } = await importTS(new URL("../src/Statistics/umaStatistics.ts", import.meta.url))

const attempt = (racesPlayed, wins = [0, 0, 0]) => ({ racesPlayed, umaWins: wins.map((wins, index) => ({ cmUmaId: String(index), wins })) })
const event = (number, fields = {}) => ({ number, track: "Hanshin", distance: 1600, length: "Mile", surface: "Turf", direction: "Right", condition: "Firm", participants: [], attempts: [attempt(10, [3, 1, 1])], finalPlace: "", ...fields })
const totals = (rows) => rows.reduce((sum, row) => ({ races: sum.races + row.races, wins: sum.wins + row.wins }), { races: 0, wins: 0 })

test("breakdowns include only the selected canonical track, including its recorded aliases", () => {
  const cms = [event(1), event(2, { track: "HANSHIN_racecourse" }), event(3, { track: "Tokyo", attempts: [attempt(100, [80])] }), event(4, { track: "Unknown Circuit" })]
  const result = getTrackPerformanceBreakdowns(cms, "hanshin")
  assert.deepEqual(totals(result.distance.distances), { races: 20, wins: 10 })
  assert.deepEqual(totals(result.conditions), { races: 20, wins: 10 })
  assert.deepEqual(totals(getTrackPerformanceBreakdowns(cms, "tokyo").conditions), { races: 100, wins: 80 })
  assert.deepEqual(getTrackPerformanceBreakdowns(cms, "missing").distance.distances, [])
})

test("exact distances combine courses, surfaces and attempts and sort numerically", () => {
  const result = getTrackPerformanceBreakdowns([
    event(1, { distance: 10000, length: "Long" }),
    event(2, { distance: 900, length: "Short" }),
    event(3, { attempts: [attempt(20, [6, 3, 1]), attempt(30, [12, 3, 0])] }),
    event(4, { surface: "Dirt", direction: "Left", weather: "Rainy", attempts: [attempt(50, [10, 10, 5])] }),
  ], "hanshin")
  assert.deepEqual(result.distance.distances, [
    { distance: 900, races: 10, wins: 5, winRate: 50 },
    { distance: 1600, races: 100, wins: 50, winRate: 50 },
    { distance: 10000, races: 10, wins: 5, winRate: 50 },
  ])
})

test("categories reuse the Uma recorded taxonomy and retain all canonical rows", () => {
  const result = getTrackPerformanceBreakdowns([
    event(1, { distance: 1600, length: "Short" }), // Saved category takes priority over guessing from metres.
    event(2, { distance: 1200, length: "Sprint" }),
    event(3, { length: "Miles" }), event(4, { length: "Mile" }),
    event(5, { distance: 2000, length: "Medium" }), event(6, { distance: 2500, length: "Long" }),
    event(7, { distance: 1800, length: null }),
  ], "hanshin")
  assert.deepEqual(result.distance.categories.map(row => row.category), UMA_DISTANCE_CATEGORIES)
  assert.deepEqual(result.distance.categories.map(row => [row.category, row.races, row.wins]), [["Sprint", 20, 10], ["Mile", 20, 10], ["Medium", 10, 5], ["Long", 10, 5]])
  assert.equal(result.distance.uncategorizedRaces, 10)
  assert.equal(totals(result.distance.distances).races, 70)
})

const mixedSurfaces = [
  event(1, { distance: 1200, length: "Short", attempts: [attempt(20, [10])] }),
  event(2, { attempts: [attempt(100, [60])] }),
  event(3, { surface: "Dirt", attempts: [attempt(30, [15])] }),
  event(4, { surface: "Dirt", distance: 1800, attempts: [attempt(10, [2])] }),
  event(5, { surface: null, length: null, attempts: [attempt(5, [1])] }),
]

test("Turf filter excludes Dirt and unknown surfaces in exact and category modes", () => {
  const result = getTrackPerformanceBreakdowns(mixedSurfaces, "hanshin", "Turf")
  assert.deepEqual(result.distance.distances.map(row => [row.distance, row.races, row.wins]), [[1200, 20, 10], [1600, 100, 60]])
  assert.deepEqual(result.distance.categories.map(row => row.races), [20, 100, 0, 0])
  assert.equal(result.distance.uncategorizedRaces, 0)
})

test("Dirt filter excludes Turf and unknown surfaces in exact and category modes", () => {
  const result = getTrackPerformanceBreakdowns(mixedSurfaces, "hanshin", "Dirt")
  assert.deepEqual(result.distance.distances.map(row => [row.distance, row.races, row.wins]), [[1600, 30, 15], [1800, 10, 2]])
  assert.deepEqual(result.distance.categories.map(row => row.races), [0, 40, 0, 0])
  assert.equal(formatUmaWinRate(result.distance.categories[1].winRate), "42.5%")
})

test("the distance surface filter never changes Ground Condition Performance", () => {
  const all = getTrackPerformanceBreakdowns(mixedSurfaces, "hanshin", "All")
  assert.deepEqual(totals(all.distance.distances), { races: 165, wins: 88 })
  for (const surface of ["Turf", "Dirt"]) assert.deepEqual(getTrackPerformanceBreakdowns(mixedSurfaces, "hanshin", surface).conditions, all.conditions)
})

test("ground conditions use canonical model order and combined race/win rates", () => {
  const cms = [
    event(1, { condition: "Heavy", attempts: [attempt(10, [9])] }),
    event(2, { condition: "Firm", attempts: [attempt(20, [10]), attempt(80, [60])] }),
    event(3, { condition: "Yielding", attempts: [attempt(40, [10])] }),
    event(4, { condition: "Good", attempts: [attempt(50, [10])] }),
    event(5, { condition: "Soft", attempts: [attempt(20, [3])] }),
  ]
  const result = getTrackPerformanceBreakdowns(cms, "hanshin")
  assert.deepEqual(result.conditions.map(row => row.condition), TRACK_CONDITIONS)
  assert.deepEqual(result.conditions.map(row => [row.condition, row.races, row.wins, row.winRate]), [["Firm", 100, 70, 70], ["Good", 50, 10, 20], ["Yielding", 40, 10, 25], ["Soft", 20, 3, 15], ["Heavy", 10, 9, 90]])
  assert.equal(result.unknownConditionRaces, 0)
})

test("missing and invalid conditions remain excluded without defaulting to Firm", () => {
  const unknown = [undefined, null, "", "firm", "Wet", "constructor"]
  const cms = [event(1, { attempts: [attempt(5, [2])] }), ...unknown.map((condition, index) => event(index + 2, { condition, attempts: [attempt(10, [4])] }))]
  const result = getTrackPerformanceBreakdowns(cms, "hanshin")
  assert.deepEqual(totals(result.conditions), { races: 5, wins: 2 })
  assert.equal(result.unknownConditionRaces, 60)
  assert.equal(result.conditions.find(row => row.condition === "Firm").races, 5)
  assert.equal(calculateTrackDetailsStatistics(cms, "hanshin").overall.races, 65)
})

test("both cards count actual team races once regardless of participant count", () => {
  const cms = [event(1, { participants: ["a", "b", "c"].map(umaId => ({ umaId })), attempts: [attempt(100, [35, 20, 5])] })]
  const result = getTrackPerformanceBreakdowns(cms, "hanshin")
  for (const rows of [result.distance.distances, result.distance.categories, result.conditions]) assert.deepEqual(totals(rows), { races: 100, wins: 60 })
})

test("complete metadata reconciles with Overall and Course Performance team totals", () => {
  const cms = [...mixedSurfaces.slice(0, 4), event(6, { distance: 2200, length: "Medium", condition: "Good" }), event(7, { track: "Tokyo" })]
  const details = calculateTrackDetailsStatistics(cms, "hanshin")
  const result = getTrackPerformanceBreakdowns(cms, "hanshin")
  const expected = { races: details.overall.races, wins: details.overall.wins }
  for (const rows of [details.courses, result.distance.distances, result.distance.categories, result.conditions]) assert.deepEqual(totals(rows), expected)
})

test("unknown distance/category metadata is not invented to force totals to match", () => {
  const result = getTrackPerformanceBreakdowns([event(1, { distance: null }), event(2, { distance: 0 }), event(3, { distance: 1800, length: "Unknown" })], "hanshin")
  assert.deepEqual(totals(result.distance.distances), { races: 10, wins: 5 })
  assert.deepEqual(totals(result.distance.categories), { races: 0, wins: 0 })
  assert.equal(result.distance.uncategorizedRaces, 10)
  assert.deepEqual(totals(result.conditions), { races: 30, wins: 15 })
})

test("unused tracks, zero races and final-only records keep zero categories and safe rates", () => {
  for (const cms of [[], [event(1, { attempts: [] })], [event(1, { attempts: [attempt(0)] })], [event(1, { attempts: [], finalPlace: "1st" })]]) {
    const result = getTrackPerformanceBreakdowns(cms, "hanshin")
    assert.deepEqual(result.distance.distances, [])
    assert.deepEqual(result.distance.categories.map(row => row.category), UMA_DISTANCE_CATEGORIES)
    assert.deepEqual(result.conditions.map(row => row.condition), TRACK_CONDITIONS)
    for (const row of [...result.distance.categories, ...result.conditions]) {
      assert.equal(row.races, 0); assert.equal(row.wins, 0); assert.equal(row.winRate, null)
      assert.equal(formatUmaWinRate(row.winRate), "—")
    }
    assert.equal(result.unknownConditionRaces, 0)
  }
})

test("new breakdowns leave event results, configurations and existing course aggregates unchanged", () => {
  const cms = mixedSurfaces.map((cm, index) => ({ ...cm, attempts: cm.attempts.map(attempt => ({ ...attempt, umaWins: attempt.umaWins.map(row => ({ ...row, configuration: { umaVersionId: "recorded-" + index, runningStyle: "end_closer" } })) })) }))
  const before = structuredClone(cms), details = calculateTrackDetailsStatistics(cms, "hanshin")
  for (const surface of ["All", "Turf", "Dirt"]) getTrackPerformanceBreakdowns(cms, "hanshin", surface)
  assert.deepEqual(cms, before)
  assert.deepEqual(calculateTrackDetailsStatistics(cms, "hanshin"), details)
})
