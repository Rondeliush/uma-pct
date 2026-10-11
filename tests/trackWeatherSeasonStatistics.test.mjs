import assert from "node:assert/strict"
import test from "node:test"
import { importTS } from "./helpers/importTS.mjs"

const { getTrackWeatherSeasonPerformance } = await importTS(new URL("../src/Statistics/trackWeatherSeasonStatistics.ts", import.meta.url))
const { calculateTrackDetailsStatistics } = await importTS(new URL("../src/Statistics/trackDetailsStatistics.ts", import.meta.url))
const { getTrackPerformanceBreakdowns } = await importTS(new URL("../src/Statistics/trackPerformanceBreakdowns.ts", import.meta.url))
const { TRACK_WEATHER, TRACK_SEASONS } = await importTS(new URL("../src/types/types.ts", import.meta.url))
const { formatUmaWinRate } = await importTS(new URL("../src/Statistics/umaStatistics.ts", import.meta.url))

const attempt = (racesPlayed, wins = [0, 0, 0]) => ({ racesPlayed, retired: false, umaWins: wins.map((wins, index) => ({ cmUmaId: String(index), wins })) })
const event = (number, fields = {}) => ({ number, track: "Hanshin", distance: 1600, length: "Mile", surface: "Turf", direction: "Right", condition: "Firm", weather: "Sunny", season: "Autumn", participants: [], attempts: [attempt(10, [3, 1, 1])], finalPlace: "", ...fields })
const totals = rows => rows.reduce((sum, row) => ({ races: sum.races + row.races, wins: sum.wins + row.wins }), { races: 0, wins: 0 })

test("weather and season include only the selected track, resolving its saved aliases", () => {
  const cms = [event(1), event(2, { track: "HANSHIN_racecourse" }), event(3, { track: "Tokyo", attempts: [attempt(100, [80])] }), event(4, { track: "Unknown Circuit" }), event(5, { track: null })]
  const result = getTrackWeatherSeasonPerformance(cms, "hanshin")
  assert.deepEqual(totals(result.weather), { races: 20, wins: 10 })
  assert.deepEqual(totals(result.seasons), { races: 20, wins: 10 })
  assert.deepEqual(totals(getTrackWeatherSeasonPerformance(cms, "tokyo").weather), { races: 100, wins: 80 })
  assert.deepEqual(totals(getTrackWeatherSeasonPerformance(cms, "missing").seasons), { races: 0, wins: 0 })
})

test("weather combines attempts and events using weighted team wins and races", () => {
  const result = getTrackWeatherSeasonPerformance([
    event(1, { weather: "Snowy", attempts: [attempt(10, [9])] }),
    event(2, { attempts: [attempt(20, [10]), attempt(80, [35, 20, 5])] }),
    event(3, { weather: "Rainy", attempts: [attempt(40)] }),
    event(4, { weather: "Cloudy", attempts: [attempt(50, [10, 10])] }),
  ], "hanshin")
  assert.deepEqual(result.weather.map(row => [row.weather, row.races, row.wins, row.winRate]), [["Sunny", 100, 70, 70], ["Cloudy", 50, 20, 40], ["Rainy", 40, 0, 0], ["Snowy", 10, 9, 90]])
  assert.equal(result.unknownWeatherRaces, 0)
})

test("season combines actual race results in canonical Spring/Summer/Autumn/Winter order", () => {
  const result = getTrackWeatherSeasonPerformance([
    event(1, { season: "Winter", attempts: [attempt(50, [10, 10])] }),
    event(2, { season: "Summer", attempts: [attempt(20, [10]), attempt(80, [60])] }),
    event(3, { season: "Spring", attempts: [attempt(10, [9])] }),
    event(4, { season: "Autumn", attempts: [attempt(40)] }),
  ], "hanshin")
  assert.deepEqual(result.seasons.map(row => [row.season, row.races, row.wins, row.winRate]), [["Spring", 10, 9, 90], ["Summer", 100, 70, 70], ["Autumn", 40, 0, 0], ["Winter", 50, 20, 40]])
  assert.equal(result.unknownSeasonRaces, 0)
})

test("unknown weather is excluded without defaulting to Sunny or hiding known seasons", () => {
  const unknown = [undefined, null, "", "sunny", "Wet", "constructor", "__proto__"]
  const cms = [event(1, { attempts: [attempt(5, [2])] }), ...unknown.map((weather, index) => event(index + 2, { weather, season: "Summer" }))]
  const result = getTrackWeatherSeasonPerformance(cms, "hanshin")
  assert.deepEqual(totals(result.weather), { races: 5, wins: 2 })
  assert.equal(result.weather[0].races, 5)
  assert.equal(result.unknownWeatherRaces, 70)
  assert.deepEqual(totals(result.seasons), { races: 75, wins: 37 })
  assert.equal(result.unknownSeasonRaces, 0)
})

test("unknown season stays excluded and Fall is not silently renamed to canonical Autumn", () => {
  const unknown = [undefined, null, "", "Fall", "autumn", "Unknown", "constructor"]
  const cms = [event(1, { attempts: [attempt(5, [2])] }), ...unknown.map((season, index) => event(index + 2, { season, weather: "Rainy" }))]
  const result = getTrackWeatherSeasonPerformance(cms, "hanshin")
  assert.deepEqual(totals(result.seasons), { races: 5, wins: 2 })
  assert.equal(result.seasons.find(row => row.season === "Autumn").races, 5)
  assert.equal(result.unknownSeasonRaces, 70)
  assert.deepEqual(totals(result.weather), { races: 75, wins: 37 })
  assert.equal(result.unknownWeatherRaces, 0)
})

test("weather and season do not multiply team races by participating Umas", () => {
  const cms = [event(1, { participants: ["a", "b", "c"].map(umaId => ({ umaId })), attempts: [attempt(100, [35, 20, 5])] })]
  const result = getTrackWeatherSeasonPerformance(cms, "hanshin")
  assert.deepEqual(totals(result.weather), { races: 100, wins: 60 })
  assert.deepEqual(totals(result.seasons), { races: 100, wins: 60 })
})

test("empty history, zero-race batches and final-only records retain zero rows and unavailable rates", () => {
  for (const cms of [[], [event(1, { attempts: [] })], [event(1, { attempts: undefined })], [event(1, { attempts: [attempt(0)] })], [event(1, { attempts: [], finalPlace: "1st" })]]) {
    const result = getTrackWeatherSeasonPerformance(cms, "hanshin")
    assert.deepEqual(result.weather.map(row => row.weather), TRACK_WEATHER)
    assert.deepEqual(result.seasons.map(row => row.season), TRACK_SEASONS)
    for (const row of [...result.weather, ...result.seasons]) {
      assert.equal(row.races, 0); assert.equal(row.wins, 0); assert.equal(row.winRate, null)
      assert.equal(formatUmaWinRate(row.winRate), "—")
    }
    assert.equal(result.unknownWeatherRaces, 0); assert.equal(result.unknownSeasonRaces, 0)
  }
})

test("unused canonical values stay visible and row order never follows performance or input order", () => {
  const cms = [event(1, { weather: "Snowy", season: "Winter", attempts: [attempt(10, [10])] }), event(2)]
  const result = getTrackWeatherSeasonPerformance(cms, "hanshin")
  assert.deepEqual(result, getTrackWeatherSeasonPerformance([...cms].reverse(), "hanshin"))
  assert.deepEqual(result.weather.map(row => row.weather), ["Sunny", "Cloudy", "Rainy", "Snowy"])
  assert.deepEqual(result.seasons.map(row => row.season), ["Spring", "Summer", "Autumn", "Winter"])
  assert.deepEqual(result.weather[1], { weather: "Cloudy", races: 0, wins: 0, winRate: null })
  assert.deepEqual(result.seasons[1], { season: "Summer", races: 0, wins: 0, winRate: null })
})

test("complete weather/season metadata reconciles with Overall, Course and existing breakdowns", () => {
  const cms = [
    event(1, { attempts: [attempt(20, [8])] }),
    event(2, { distance: 2200, length: "Medium", weather: "Rainy", season: "Summer", condition: "Good", attempts: [attempt(80, [45])] }),
    event(3, { track: "Tokyo", attempts: [attempt(500, [200])] }),
  ]
  const details = calculateTrackDetailsStatistics(cms, "hanshin"), previous = getTrackPerformanceBreakdowns(cms, "hanshin"), result = getTrackWeatherSeasonPerformance(cms, "hanshin")
  const expected = { races: details.overall.races, wins: details.overall.wins }
  for (const rows of [details.courses, previous.distance.distances, previous.conditions, result.weather, result.seasons]) assert.deepEqual(totals(rows), expected)
  assert.deepEqual(expected, { races: 100, wins: 53 })
})

test("unknown metadata yields independent attributable totals without forcing reconciliation", () => {
  const cms = [event(1, { weather: null, season: "Summer", attempts: [attempt(10, [2])] }), event(2, { weather: "Rainy", season: null, attempts: [attempt(30, [9])] }), event(3, { condition: null, attempts: [attempt(60, [45])] })]
  const result = getTrackWeatherSeasonPerformance(cms, "hanshin")
  assert.deepEqual(totals(result.weather), { races: 90, wins: 54 })
  assert.deepEqual(totals(result.seasons), { races: 70, wins: 47 })
  assert.equal(result.unknownWeatherRaces, 10); assert.equal(result.unknownSeasonRaces, 30)
  assert.equal(calculateTrackDetailsStatistics(cms, "hanshin").overall.races, 100)
})

test("new cards retain existing retired and participant-free batch accounting", () => {
  const cms = [event(1, { participants: [], attempts: [{ ...attempt(10, [4]), retired: true }] }), event(2, { participants: [], attempts: [attempt(5, [])] })]
  const result = getTrackWeatherSeasonPerformance(cms, "hanshin")
  assert.deepEqual(totals(result.weather), { races: 15, wins: 4 })
  assert.deepEqual(totals(result.seasons), { races: 15, wins: 4 })
})

test("weather/season aggregation leaves saved snapshots and existing statistics unchanged", () => {
  const cms = [event(1, { attempts: [{ ...attempt(10, [4]), umaWins: [{ cmUmaId: "a", wins: 4, configuration: { umaVersionId: "historical", runningStyle: "end_closer" } }] }] })]
  const before = structuredClone(cms), details = calculateTrackDetailsStatistics(cms, "hanshin"), previous = getTrackPerformanceBreakdowns(cms, "hanshin")
  getTrackWeatherSeasonPerformance(cms, "hanshin")
  assert.deepEqual(cms, before)
  assert.deepEqual(calculateTrackDetailsStatistics(cms, "hanshin"), details)
  assert.deepEqual(getTrackPerformanceBreakdowns(cms, "hanshin"), previous)
})
