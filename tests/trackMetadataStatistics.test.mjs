import assert from "node:assert/strict"
import test from "node:test"
import { importTS } from "./helpers/importTS.mjs"

const { getGlobalTrackMetadataPerformance } = await importTS(new URL("../src/Statistics/trackMetadataStatistics.ts", import.meta.url))
const { calculateTrackStatistics } = await importTS(new URL("../src/Statistics/trackStatistics.ts", import.meta.url))
const { getTrackPerformanceBreakdowns } = await importTS(new URL("../src/Statistics/trackPerformanceBreakdowns.ts", import.meta.url))
const { getTrackWeatherSeasonPerformance } = await importTS(new URL("../src/Statistics/trackWeatherSeasonStatistics.ts", import.meta.url))
const { calculateTrackDetailsStatistics } = await importTS(new URL("../src/Statistics/trackDetailsStatistics.ts", import.meta.url))
const { TRACK_CONDITIONS, TRACK_WEATHER, TRACK_SEASONS, TRACK_DIRECTIONS } = await importTS(new URL("../src/types/types.ts", import.meta.url))
const { formatUmaWinRate } = await importTS(new URL("../src/Statistics/umaStatistics.ts", import.meta.url))

const attempt = (racesPlayed, wins = [0, 0, 0]) => ({ racesPlayed, umaWins: wins.map((wins, index) => ({ cmUmaId: String(index), wins })) })
const event = (number, fields = {}) => ({ number, track: "Hanshin", distance: 1600, surface: "Turf", direction: "Right", condition: "Firm", weather: "Sunny", season: "Autumn", participants: [], attempts: [attempt(10, [3, 1, 1])], finalPlace: "", ...fields })
const totals = ({ rows }) => rows.reduce((sum, row) => ({ races: sum.races + row.races, wins: sum.wins + row.wins }), { races: 0, wins: 0 })
const values = ({ rows }) => rows.map(row => [row.label, row.races, row.wins, row.winRate])

test("global ground conditions aggregate batches and tracks with weighted rates in canonical order", () => {
  const result = getGlobalTrackMetadataPerformance([
    event(1, { attempts: [attempt(20, [10]), attempt(80, [35, 20, 5])] }),
    event(2, { track: "Tokyo", attempts: [attempt(50, [10])] }),
    event(3, { condition: "Good", attempts: [attempt(25, [5])] }),
    event(4, { condition: "Heavy", attempts: [attempt(10, [9])] }),
  ]).conditions
  assert.deepEqual(values(result), [["Firm", 150, 80, 80 / 150 * 100], ["Good", 25, 5, 20], ["Yielding", 0, 0, null], ["Soft", 0, 0, null], ["Heavy", 10, 9, 90]])
  assert.equal(result.unknownRaces, 0)
})

test("weather aggregates globally across multiple racetracks rather than creating track-specific rows", () => {
  const result = getGlobalTrackMetadataPerformance([
    event(1, { attempts: [attempt(20, [10])] }),
    event(2, { track: "Tokyo", attempts: [attempt(80, [60])] }),
    event(3, { track: "Ooi", weather: "Rainy", attempts: [attempt(30, [9])] }),
    event(4, { track: "Niigata", weather: "Snowy", attempts: [attempt(5)] }),
  ]).weather
  assert.deepEqual(values(result), [["Sunny", 100, 70, 70], ["Cloudy", 0, 0, null], ["Rainy", 30, 9, 30], ["Snowy", 5, 0, 0]])
})

test("season aggregates recorded events using Spring/Summer/Autumn/Winter without renaming Autumn", () => {
  const result = getGlobalTrackMetadataPerformance([
    event(1, { season: "Summer", attempts: [attempt(20, [10])] }),
    event(2, { track: "Tokyo", season: "Summer", attempts: [attempt(80, [60])] }),
    event(3, { season: "Spring", attempts: [attempt(10, [9])] }),
    event(4, { season: "Winter", attempts: [attempt(50, [20])] }),
    event(5, { season: "Autumn", attempts: [attempt(40)] }),
  ]).seasons
  assert.deepEqual(values(result), [["Spring", 10, 9, 90], ["Summer", 100, 70, 70], ["Autumn", 40, 0, 0], ["Winter", 50, 20, 40]])
})

test("direction uses the saved Course Performance direction, never a direction inferred from track name", () => {
  const cms = [
    event(1, { attempts: [attempt(80, [40])] }),
    event(2, { track: "Tokyo", direction: "Left", attempts: [attempt(80, [60])] }),
    event(3, { track: "Niigata", direction: "Straight", attempts: [attempt(20, [5])] }),
    event(4, { track: "Hanshin", direction: "Left", attempts: [attempt(10, [5])] }),
  ]
  const result = getGlobalTrackMetadataPerformance(cms).directions
  assert.deepEqual(values(result), [["Left", 90, 65, 65 / 90 * 100], ["Right", 80, 40, 50], ["Straight", 20, 5, 25]])
  const courseRows = ["hanshin", "tokyo", "niigata"].flatMap(id => calculateTrackDetailsStatistics(cms, id).courses)
  for (const row of result.rows) {
    assert.equal(row.races, courseRows.filter(course => course.direction === row.label).reduce((sum, course) => sum + course.races, 0))
  }
})

test("one race with three Umas counts once in every global breakdown, with one combined team win", () => {
  const cms = [event(1, { participants: ["a", "b", "c"].map(umaId => ({ umaId })), attempts: [attempt(1, [0, 1, 0])] })]
  for (const card of Object.values(getGlobalTrackMetadataPerformance(cms))) {
    assert.deepEqual(totals(card), { races: 1, wins: 1 })
    assert.equal(card.rows.find(row => row.races > 0).winRate, 100)
  }
})

test("missing and invalid metadata is independently excluded without fallback or normalization", () => {
  for (const [field, key, invalid] of [
    ["condition", "conditions", "firm"], ["weather", "weather", "sunny"],
    ["season", "seasons", "Fall"], ["direction", "directions", "right"],
  ]) {
    const unknown = [undefined, null, "", invalid, "Unknown", "constructor", "__proto__"]
    const cms = [event(1, { attempts: [attempt(5, [2])] }), ...unknown.map((value, index) => event(index + 2, { [field]: value }))]
    const result = getGlobalTrackMetadataPerformance(cms)
    assert.deepEqual(totals(result[key]), { races: 5, wins: 2 })
    assert.equal(result[key].unknownRaces, 70)
    for (const [otherKey, card] of Object.entries(result)) {
      if (otherKey === key) continue
      assert.deepEqual(totals(card), { races: 75, wins: 37 })
      assert.equal(card.unknownRaces, 0)
    }
    assert.equal(calculateTrackStatistics(cms).overall.races, 75)
  }
})

test("zero-use categories remain visible in model order and format unavailable rates as a dash", () => {
  for (const cms of [[], [event(1, { attempts: [] })], [event(1, { attempts: undefined })], [event(1, { attempts: [attempt(0)] })], [event(1, { attempts: [], finalPlace: "1st" })]]) {
    const result = getGlobalTrackMetadataPerformance(cms)
    for (const [key, labels] of Object.entries({ conditions: TRACK_CONDITIONS, weather: TRACK_WEATHER, seasons: TRACK_SEASONS, directions: TRACK_DIRECTIONS })) {
      assert.deepEqual(result[key].rows.map(row => row.label), labels)
      assert.equal(result[key].unknownRaces, 0)
      for (const row of result[key].rows) {
        assert.deepEqual([row.races, row.wins, row.winRate], [0, 0, null])
        assert.equal(formatUmaWinRate(row.winRate), "\u2014")
      }
    }
  }
})

test("complete metadata reconciles all category races and wins with Overall even for missing/custom tracks", () => {
  const cms = [
    event(1), event(2, { track: "Tokyo", weather: "Rainy", direction: "Left", condition: "Good", season: "Spring", attempts: [attempt(30, [9])] }),
    event(3, { track: "Unknown Circuit", direction: "Straight", condition: "Heavy", season: "Winter", attempts: [attempt(15, [6])] }),
    event(4, { track: null, attempts: [attempt(20, [10])] }),
    event(5, { track: "", attempts: [attempt(5, [2])] }),
  ]
  const { races, wins } = calculateTrackStatistics(cms).overall
  assert.deepEqual({ races, wins }, { races: 80, wins: 32 })
  for (const card of Object.values(getGlobalTrackMetadataPerformance(cms))) {
    assert.deepEqual(totals(card), { races, wins })
    assert.equal(card.unknownRaces, 0)
  }
})

test("global classifications match the existing per-track helpers after combining selected track results", () => {
  const cms = [event(1), event(2, { track: "HANSHIN_racecourse", condition: "Good", weather: "Rainy", season: "Summer" }), event(3, { track: "Tokyo", condition: null, weather: null, season: null }), event(4, { track: "Tokyo", condition: "Heavy", weather: "Snowy", season: "Winter" })]
  const global = getGlobalTrackMetadataPerformance(cms)
  for (const [field, key] of [["condition", "conditions"], ["weather", "weather"], ["season", "seasons"]]) {
    const details = ["hanshin", "tokyo"].map(id => ({ ...getTrackPerformanceBreakdowns(cms, id), ...getTrackWeatherSeasonPerformance(cms, id) }))
    for (const row of global[key].rows) {
      const matched = details.flatMap(detail => detail[key]).filter(detailRow => detailRow[field] === row.label)
      assert.equal(row.races, matched.reduce((sum, entry) => sum + entry.races, 0))
      assert.equal(row.wins, matched.reduce((sum, entry) => sum + entry.wins, 0))
    }
    const unknownKey = { condition: "unknownConditionRaces", weather: "unknownWeatherRaces", season: "unknownSeasonRaces" }[field]
    assert.equal(global[key].unknownRaces, details.reduce((sum, detail) => sum + detail[unknownKey], 0))
  }
})

test("existing retired/participant-free batches retain recorded race accounting and no finals are invented", () => {
  const cms = [event(1, { attempts: [{ ...attempt(10, [4]), retired: true }, attempt(5, [])] }), event(2, { attempts: [], finalPlace: "1st", finalResults: [{ placement: "first" }] })]
  for (const card of Object.values(getGlobalTrackMetadataPerformance(cms))) assert.deepEqual(totals(card), { races: 15, wins: 4 })
})

test("global aggregation preserves saved data, existing statistics and deterministic canonical ordering", () => {
  const cms = [event(1, { attempts: [{ ...attempt(10, [4]), umaWins: [{ cmUmaId: "a", wins: 4, configuration: { umaVersionId: "historical", runningStyle: "end_closer", entrySource: "manual" } }] }] }), event(2, { track: "Tokyo", condition: "Heavy", weather: "Snowy", season: "Winter", direction: "Straight" })]
  const before = structuredClone(cms), overall = calculateTrackStatistics(cms), details = calculateTrackDetailsStatistics(cms, "hanshin")
  assert.deepEqual(getGlobalTrackMetadataPerformance(cms), getGlobalTrackMetadataPerformance([...cms].reverse()))
  assert.deepEqual(cms, before)
  assert.deepEqual(calculateTrackStatistics(cms), overall)
  assert.deepEqual(calculateTrackDetailsStatistics(cms, "hanshin"), details)
})
