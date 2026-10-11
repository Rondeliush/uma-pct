import assert from "node:assert/strict"
import test from "node:test"
import { importTS } from "./helpers/importTS.mjs"

const { calculateTrackDetailsStatistics, getRecordedTrackId } = await importTS(new URL("../src/Statistics/trackDetailsStatistics.ts", import.meta.url))
const { calculateTrackStatistics } = await importTS(new URL("../src/Statistics/trackStatistics.ts", import.meta.url))
const { getTrackStatisticsHref, parseTrackStatisticsRoute } = await importTS(new URL("../src/Statistics/trackStatisticsRoute.ts", import.meta.url))
const { trackImages } = await importTS(new URL("../src/data/trackData.ts", import.meta.url))
const attempt = (racesPlayed, wins = [0, 0, 0]) => ({ day: 1, attempt: 1, racesPlayed, retired: false, umaWins: wins.map((wins, i) => ({ cmUmaId: String(i), wins })) })
const event = (number, track, fields = {}) => ({ number, track, distance: 1600, surface: "Turf", direction: "Right", weather: "Sunny", condition: "Firm", season: "Autumn", finalPlace: "", participants: [], attempts: [], ...fields })
const courseValues = (row) => [row.distance, row.surface, row.direction, row.events, row.races, row.wins, row.winRate]

test("canonical catalogue IDs share a single details route and lookup for every presentation", () => {
  for (const track of trackImages) {
    const href = getTrackStatisticsHref(track.id)
    assert.equal(href, `#/statistics/tracks/${track.id}`)
    assert.deepEqual(parseTrackStatisticsRoute(href), { trackId: track.id })
    assert.equal(calculateTrackDetailsStatistics([], track.id).track, track)
  }
  assert.deepEqual(parseTrackStatisticsRoute(getTrackStatisticsHref()), { trackId: null })
  assert.equal(parseTrackStatisticsRoute("#/statistics/uma"), null)
  assert.equal(parseTrackStatisticsRoute("#/statistics/tracks-extra"), null)
})

test("recorded aliases resolve through TrackData to canonical navigation IDs", () => {
  for (const track of trackImages) {
    for (const name of [track.name, track.id, ...track.aliases]) {
      assert.equal(getRecordedTrackId(name), track.id)
      assert.deepEqual(parseTrackStatisticsRoute(getTrackStatisticsHref(getRecordedTrackId(name))), { trackId: track.id })
    }
  }
  assert.equal(getRecordedTrackId("HANSHIN_racecourse"), "hanshin")
  assert.equal(getRecordedTrackId("My Circuit (Indoor)"), null)
  assert.equal(getRecordedTrackId(""), null)
})

test("invalid or malformed route IDs remain invalid without choosing a fallback track", () => {
  for (const id of ["missing", "Hanshin", "hanshin racecourse", "", "tokyo/extra", "%E0%A4"]) {
    assert.equal(calculateTrackDetailsStatistics([], id), null)
  }
  assert.deepEqual(parseTrackStatisticsRoute("#/statistics/tracks/%E0%A4"), { trackId: "%E0%A4" })
  assert.equal(calculateTrackDetailsStatistics([], parseTrackStatisticsRoute("#/statistics/tracks/tokyo/extra").trackId), null)
})

test("details totals exactly equal their overview row for every recorded canonical track", () => {
  const cms = [
    event(1, "Hanshin", { attempts: [attempt(20, [6, 3, 1]), attempt(20, [5, 3, 0])] }),
    event(2, "hanshin racecourse", { distance: 2200, attempts: [attempt(40, [12, 8, 2])] }),
    event(3, "Tokyo", { attempts: [attempt(100, [24, 12, 4])] }),
    event(4, "ohi", { surface: "Dirt", attempts: [attempt(5, [2, 0, 0])] }),
    event(5, "longchamp", { finalPlace: "2nd" }),
    event(6, "Santa Anita Racecourse", { attempts: [attempt(10, [4, 3, 3])] }),
    event(7, "del-mar", { attempts: [attempt(8, [1, 2, 1])] }),
  ]
  for (const row of calculateTrackStatistics(cms).tracks) {
    const details = calculateTrackDetailsStatistics(cms, getRecordedTrackId(row.racetrack))
    assert.deepEqual(details.overall, row)
    assert.equal(details.courses.reduce((sum, course) => sum + course.races, 0), row.races)
    assert.equal(details.courses.reduce((sum, course) => sum + course.wins, 0), row.wins)
  }
  const hanshin = calculateTrackDetailsStatistics(cms, "hanshin")
  assert.deepEqual(hanshin.overall, { racetrack: "Hanshin", events: 2, races: 80, wins: 40, winRate: 50 })
  assert.deepEqual(hanshin.courses.map(courseValues), [[1600, "Turf", "Right", 1, 40, 18, 45], [2200, "Turf", "Right", 1, 40, 22, 55.00000000000001]])
})

test("weather, ground condition, season and distance category never split the same course", () => {
  const details = calculateTrackDetailsStatistics([
    event(1, "Hanshin", { attempts: [attempt(10, [3, 2])] }),
    event(2, "HANSHIN_racecourse", { weather: "Cloudy", condition: "Good", season: "Winter", length: "Medium", attempts: [attempt(20, [5, 5])] }),
  ], "hanshin")
  assert.deepEqual(details.courses.map(courseValues), [[1600, "Turf", "Right", 2, 30, 15, 50]])
})

test("distance, surface and direction distinguish course rows with deterministic sorting", () => {
  const cms = [
    event(1, "Tokyo", { distance: 2200, attempts: [attempt(5)] }),
    event(2, "Tokyo", { distance: 1200, attempts: [attempt(5)] }),
    event(3, "Tokyo", { direction: "Left", attempts: [attempt(5)] }),
    event(4, "Tokyo", { surface: "Dirt", direction: "Straight", attempts: [attempt(5)] }),
    event(5, "Tokyo", { attempts: [attempt(5)] }),
  ]
  const rows = calculateTrackDetailsStatistics(cms, "tokyo").courses
  assert.deepEqual(rows.map(row => [row.distance, row.surface, row.direction]), [[1200, "Turf", "Right"], [1600, "Dirt", "Straight"], [1600, "Turf", "Left"], [1600, "Turf", "Right"], [2200, "Turf", "Right"]])
  assert.deepEqual(calculateTrackDetailsStatistics([...cms].reverse(), "tokyo").courses, rows)
  assert.equal(new Set(rows.map(row => row.key)).size, 5)
})

test("multiple attempts and repeated event references do not inflate course Events", () => {
  const cms = [event(12, "Hanshin", { attempts: [attempt(5), attempt(5), attempt(5)] }), event(12, "Hanshin", { attempts: [attempt(5)] }), event(13, "Hanshin", { attempts: [attempt(5)] })]
  const details = calculateTrackDetailsStatistics(cms, "hanshin")
  assert.equal(details.overall.events, 2)
  assert.equal(details.courses[0].events, 2)
  assert.equal(details.courses[0].races, 25)
})

test("team races are counted once regardless of the number of Uma participants", () => {
  const details = calculateTrackDetailsStatistics([event(1, "Tokyo", { participants: ["a", "b", "c"].map((umaId, i) => ({ cmUmaId: String(i), umaId })), attempts: [attempt(100, [35, 20, 5])] })], "tokyo")
  assert.equal(details.overall.races, 100)
  assert.equal(details.courses[0].races, 100)
  assert.equal(details.courses[0].wins, 60)
  assert.equal(details.courses[0].winRate, 60)
})

test("course rates use combined wins and races instead of averaging event percentages", () => {
  const details = calculateTrackDetailsStatistics([event(1, "Tokyo", { attempts: [attempt(20, [10])] }), event(2, "Tokyo", { attempts: [attempt(80, [60])] })], "tokyo")
  assert.equal(details.courses[0].winRate, 70)
})

test("valid tracks with no recorded history retain their identity and return empty statistics", () => {
  const details = calculateTrackDetailsStatistics([event(1, "Hanshin"), event(2, "Hanshin", { attempts: [attempt(0)] }), event(3, "Tokyo", { attempts: [attempt(5)] })], "hanshin")
  assert.equal(details.track.id, "hanshin")
  assert.ok(details.track.image.endsWith("/Tracks/hanshin.png"))
  assert.deepEqual(details.overall, { racetrack: "Hanshin", events: 0, races: 0, wins: 0, winRate: null })
  assert.deepEqual(details.courses, [])
})

test("recorded finals establish course use but never invent round races or unsafe zero-race rates", () => {
  const details = calculateTrackDetailsStatistics([event(1, "Tokyo", { finalPlace: "1st", finalResults: [{ placement: "first" }] }), event(2, "Tokyo", { finalPlace: "3rd" })], "tokyo")
  assert.deepEqual(details.overall, { racetrack: "Tokyo", events: 2, races: 0, wins: 0, winRate: null })
  assert.deepEqual(details.courses.map(courseValues), [[1600, "Turf", "Right", 2, 0, 0, null]])
})

test("missing course fields stay unknown and do not discard recorded race results", () => {
  const details = calculateTrackDetailsStatistics([event(1, "Tokyo", { distance: undefined, surface: undefined, direction: undefined, attempts: [attempt(5, [2])] })], "tokyo")
  assert.deepEqual(details.courses.map(courseValues), [[null, null, null, 1, 5, 2, 40]])
  assert.equal(details.overall.races, 5)
})

test("details aggregation preserves saved event, attempt and participant data", () => {
  const cms = [event(1, "Hanshin", { participants: [{ umaId: "a", runningStyle: "end_closer" }], attempts: [attempt(5, [1, 1, 1])] })]
  const before = structuredClone(cms)
  assert.deepEqual(calculateTrackDetailsStatistics(cms, "hanshin"), calculateTrackDetailsStatistics(cms, "hanshin"))
  assert.deepEqual(cms, before)
})
