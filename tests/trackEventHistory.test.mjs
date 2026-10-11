import assert from "node:assert/strict"
import test from "node:test"
import { importTS } from "./helpers/importTS.mjs"

const { getTrackEventHistory } = await importTS(new URL("../src/Statistics/trackEventHistoryStatistics.ts", import.meta.url))
const { calculateTrackDetailsStatistics } = await importTS(new URL("../src/Statistics/trackDetailsStatistics.ts", import.meta.url))
const { formatUmaWinRate } = await importTS(new URL("../src/Statistics/umaStatistics.ts", import.meta.url))
const attempt = (racesPlayed, wins = [0, 0, 0]) => ({ racesPlayed, umaWins: wins.map((wins, i) => ({ cmUmaId: String(i), wins })) })
const event = (number, track, fields = {}) => ({ number, name: `Saved CM ${number}`, track, distance: 1600, surface: "Turf", direction: "Right", condition: "Firm", weather: "Sunny", finalPlace: "", attempts: [], ...fields })

test("history includes only recorded events resolving to the selected canonical track", () => {
  const cms = [event(1, "Hanshin", { attempts: [attempt(5)] }), event(2, "HANSHIN_racecourse", { attempts: [attempt(5)] }), event(3, "Tokyo", { attempts: [attempt(5)] }), event(4, "Custom Hanshin", { attempts: [attempt(5)] }), event(5, "Hanshin")]
  assert.deepEqual(getTrackEventHistory(cms, "hanshin").map(row => row.number), [2, 1])
  assert.deepEqual(getTrackEventHistory(cms, "tokyo").map(row => row.number), [3])
  assert.deepEqual(getTrackEventHistory(cms, "missing"), [])
})

test("multiple attempts produce one event row and aggregate recorded team races and wins", () => {
  const rows = getTrackEventHistory([event(12, "Hanshin", { participants: [{ umaId: "a" }, { umaId: "b" }, { umaId: "c" }], attempts: [attempt(20, [6, 3, 1]), attempt(60, [12, 12, 6])] })], "hanshin")
  assert.equal(rows.length, 1)
  assert.equal(rows[0].number, 12)
  assert.equal(rows[0].races, 80)
  assert.equal(rows[0].wins, 40)
  assert.equal(rows[0].winRate, 50)
})

test("duplicate event references remain one row while retaining the existing totals convention", () => {
  const cms = [event(1, "Hanshin", { attempts: [attempt(5, [2])] }), event(1, "hanshin racecourse", { attempts: [attempt(15, [8])] })]
  const rows = getTrackEventHistory(cms, "hanshin")
  assert.equal(rows.length, 1)
  assert.equal(rows[0].races, 20)
  assert.equal(rows[0].wins, 10)
  assert.equal(rows[0].winRate, 50)
  assert.equal(rows[0].races, calculateTrackDetailsStatistics(cms, "hanshin").overall.races)
})

test("event names and metadata come directly from the saved CM", () => {
  const [row] = getTrackEventHistory([event(17, "Hanshin", { name: "Libra Cup 2", distance: 1700, surface: "Dirt", direction: "Straight", condition: "Soft", weather: "Snowy", attempts: [attempt(5)] })], "hanshin")
  assert.deepEqual([row.number, row.name, row.distance, row.surface, row.direction, row.condition, row.weather], [17, "Libra Cup 2", 1700, "Dirt", "Straight", "Soft", "Snowy"])
})

test("missing recorded metadata stays unknown without catalog or participant inference", () => {
  const [row] = getTrackEventHistory([event(1, "Tokyo", { distance: undefined, surface: undefined, direction: undefined, condition: null, weather: null, participants: [{ surface: "Turf", distance: 1600, weather: "Sunny" }], attempts: [attempt(5, [2])] })], "tokyo")
  assert.deepEqual([row.distance, row.surface, row.direction, row.condition, row.weather], [null, null, null, null, null])
  assert.equal(row.races, 5)
  assert.equal(row.wins, 2)
})

test("invalid recorded distances remain unknown", () => {
  for (const distance of [null, undefined, 0, -1, NaN, Infinity]) {
    assert.equal(getTrackEventHistory([event(1, "Tokyo", { distance, attempts: [attempt(5)] })], "tokyo")[0].distance, null)
  }
})

test("history follows existing newest-first CM number chronology, never win-rate ranking", () => {
  const cms = [event(4, "Hanshin", { attempts: [attempt(5, [5])] }), event(30, "Hanshin", { attempts: [attempt(5, [0])] }), event(12, "Hanshin", { attempts: [attempt(5, [2])] })]
  assert.deepEqual(getTrackEventHistory(cms, "hanshin").map(row => row.number), [30, 12, 4])
  assert.deepEqual(getTrackEventHistory([...cms].reverse(), "hanshin"), getTrackEventHistory(cms, "hanshin"))
})

test("recorded final-only events remain visible without inventing races or unsafe rates", () => {
  const rows = getTrackEventHistory([event(1, "Tokyo", { finalPlace: "2nd", finalResults: [{ placement: "second" }] }), event(2, "Tokyo", { finalPlace: "1st", finalResults: [{ placement: "first" }] })], "tokyo")
  assert.equal(rows.length, 2)
  for (const row of rows) {
    assert.deepEqual([row.races, row.wins, row.winRate], [0, 0, null])
    assert.equal(formatUmaWinRate(row.winRate), "—")
  }
})

test("empty and pending-only tracks return no history rows", () => {
  assert.deepEqual(getTrackEventHistory([], "sapporo"), [])
  assert.deepEqual(getTrackEventHistory([event(1, "Sapporo"), event(2, "Sapporo", { attempts: [attempt(0)] }), event(3, "Tokyo", { attempts: [attempt(5)] })], "sapporo"), [])
})

test("history totals reconcile with Track Details across complete events and aliases", () => {
  const cms = [event(1, "Hanshin", { attempts: [attempt(20, [6, 3, 1]), attempt(20, [5, 3, 0])] }), event(2, "HANSHIN_racecourse", { attempts: [attempt(40, [12, 8, 2])] }), event(3, "Tokyo", { attempts: [attempt(100, [24, 12, 4])] }), event(4, "ohi", { surface: "Dirt", attempts: [attempt(5, [2])] }), event(5, "Ooi", { finalPlace: "3rd" })]
  for (const trackId of ["hanshin", "tokyo", "ooi"]) {
    const rows = getTrackEventHistory(cms, trackId)
    const { overall } = calculateTrackDetailsStatistics(cms, trackId)
    assert.equal(rows.length, overall.events)
    assert.equal(rows.reduce((sum, row) => sum + row.races, 0), overall.races)
    assert.equal(rows.reduce((sum, row) => sum + row.wins, 0), overall.wins)
  }
})

test("reading history preserves saved events, batches, participants and their order", () => {
  const cms = [event(1, "Hanshin", { participants: [{ umaId: "a", runningStyle: "end_closer" }], attempts: [attempt(5, [1, 1, 1])] }), event(2, "Hanshin", { attempts: [attempt(5)] })]
  const before = structuredClone(cms)
  assert.deepEqual(getTrackEventHistory(cms, "hanshin"), getTrackEventHistory(cms, "hanshin"))
  assert.deepEqual(cms, before)
})
