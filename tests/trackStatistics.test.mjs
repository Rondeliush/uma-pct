import assert from "node:assert/strict"
import test from "node:test"
import { importTS } from "./helpers/importTS.mjs"

const { calculateTrackStatistics, sortTrackPerformance } = await importTS(new URL("../src/Statistics/trackStatistics.ts", import.meta.url))
const { calculateUmaStatistics, formatUmaWinRate, MIN_RACES_FOR_WIN_RATE } = await importTS(new URL("../src/Statistics/umaStatistics.ts", import.meta.url))
const attempt = (racesPlayed, wins = [0, 0, 0]) => ({ day: 1, attempt: 1, racesPlayed, retired: false, umaWins: wins.map((wins, index) => ({ cmUmaId: String(index), wins })) })
const event = (number, track, fields = {}) => ({ number, track, surface: "Turf", distance: 1600, length: "Mile", finalPlace: "", participants: [], attempts: [], ...fields })

test("different events and course configurations aggregate into one racetrack row", () => {
  const cms = [
    event(1, "Hanshin", { attempts: [attempt(10, [3, 2, 0]), attempt(10, [3, 2, 0])] }),
    event(2, "Hanshin", { distance: 2200, length: "Medium", surface: "Dirt", direction: "Right", weather: "Rainy", condition: "Soft", season: "Winter", attempts: [attempt(10, [2, 1, 0])] }),
    event(3, "Tokyo", { attempts: [attempt(5, [3, 1, 0])] }),
  ]
  const before = structuredClone(cms)
  const result = calculateTrackStatistics(cms)
  assert.deepEqual(result.tracks.map(row => [row.racetrack, row.events, row.races, row.wins, formatUmaWinRate(row.winRate)]), [["Hanshin", 2, 30, 13, "43.3%"], ["Tokyo", 1, 5, 4, "80.0%"]])
  assert.deepEqual(result.overall, { tracksUsed: 2, races: 35, wins: 17, winRate: 17 / 35 * 100 })
  assert.deepEqual(cms, before)
})

test("event identities count once per racetrack despite multiple batches or repeated references", () => {
  const result = calculateTrackStatistics([
    event(12, "Hanshin", { attempts: [attempt(5), attempt(5), attempt(5)] }),
    event(12, "Hanshin", { attempts: [attempt(5)] }),
    event(13, "Hanshin", { attempts: [attempt(5)] }),
  ])
  assert.equal(result.tracks[0].events, 2)
  assert.equal(result.tracks[0].races, 25)
})

test("canonical track names and aliases use the existing database resolver", () => {
  const result = calculateTrackStatistics([
    event(1, "Hanshin", { attempts: [attempt(5)] }), event(2, "HANSHIN_racecourse", { attempts: [attempt(5)] }),
    event(3, "santa-anita", { attempts: [attempt(5)] }), event(4, "Santa Anita Racecourse", { attempts: [attempt(5)] }),
    event(5, "My Circuit (Indoor)", { attempts: [attempt(5)] }),
  ])
  assert.deepEqual(result.tracks.map(row => [row.racetrack, row.events]), [["Hanshin", 2], ["Santa Anita Park", 2], ["My Circuit (Indoor)", 1]])
  assert.equal(result.overall.tracksUsed, 3)
})

test("global races and wins reconcile with Uma statistics without multiplying three participants", () => {
  const cms = [event(1, "Tokyo", { participants: ["a", "b", "c"].map((umaId, i) => ({ cmUmaId: String(i), umaId })), attempts: [attempt(100, [35, 20, 5])] })]
  const tracks = calculateTrackStatistics(cms), umas = calculateUmaStatistics(cms, [], [])
  assert.equal(umas.umas.reduce((sum, uma) => sum + uma.races, 0), 300)
  assert.deepEqual(tracks.tracks, [{ racetrack: "Tokyo", events: 1, races: 100, wins: 60, winRate: 60 }])
  for (const key of ["races", "wins", "winRate"]) assert.equal(tracks.overall[key], umas.overall[key])
  assert.equal(tracks.tracks[0].races, umas.surfaces[0].races)
})

test("win rates use combined wins divided by combined races instead of averaging event rates", () => {
  const result = calculateTrackStatistics([event(1, "Hanshin", { attempts: [attempt(20, [10])] }), event(2, "Hanshin", { attempts: [attempt(80, [60])] })])
  assert.equal(result.tracks[0].winRate, 70)
  assert.equal(result.overall.winRate, 70)
})

test("pending or unused tracks do not invent events, while recorded finals preserve track use and zero-race rates", () => {
  const cms = [event(1, "Hanshin"), event(2, "Kyoto", { attempts: [attempt(0)] }), event(3, "Tokyo", { finalPlace: "1st" }), event(4, "Tokyo", { finalPlace: "2nd" })]
  const result = calculateTrackStatistics(cms)
  assert.deepEqual(result.tracks, [{ racetrack: "Tokyo", events: 2, races: 0, wins: 0, winRate: null }])
  assert.deepEqual(result.overall, { tracksUsed: 1, races: 0, wins: 0, winRate: null })
  assert.equal(formatUmaWinRate(result.tracks[0].winRate), "—")
  assert.equal(result.overall.races, calculateUmaStatistics(cms, [], []).overall.races)
  assert.deepEqual(calculateTrackStatistics([]), { overall: { tracksUsed: 0, races: 0, wins: 0, winRate: null }, tracks: [] })
})

test("missing track metadata retains global race results without fabricating a racetrack", () => {
  const cms = [event(1, "", { attempts: [attempt(5, [2])] }), event(2, "   ", { attempts: [attempt(5, [1])] })]
  const result = calculateTrackStatistics(cms)
  assert.deepEqual(result.tracks, [])
  assert.deepEqual(result.overall, { tracksUsed: 0, races: 10, wins: 3, winRate: 30 })
})

test("retired and participant-free batches retain the same existing global accounting", () => {
  const cms = [event(1, "Tokyo", { attempts: [{ ...attempt(4, [1]), retired: true }, { ...attempt(5), umaWins: [] }] })]
  const result = calculateTrackStatistics(cms)
  assert.equal(result.tracks[0].events, 1)
  assert.equal(result.tracks[0].races, 9)
  assert.equal(result.tracks[0].wins, 1)
  for (const key of ["races", "wins", "winRate"]) assert.equal(result.overall[key], calculateUmaStatistics(cms, [], []).overall[key])
})

test("all five sort modes use deterministic rankings and preserve the input order", () => {
  const tracks = [
    { racetrack: "Hanshin", events: 1, races: 20, wins: 10, winRate: 50 },
    { racetrack: "Tokyo", events: 3, races: 100, wins: 40, winRate: 40 },
    { racetrack: "Kyoto", events: 1, races: 5, wins: 5, winRate: 100 },
    { racetrack: "Nakayama", events: 1, races: 0, wins: 0, winRate: null },
  ]
  const before = structuredClone(tracks)
  for (const [sort, names] of Object.entries({ "win-rate": ["Hanshin", "Tokyo", "Kyoto", "Nakayama"], races: ["Tokyo", "Hanshin", "Kyoto", "Nakayama"], wins: ["Tokyo", "Hanshin", "Kyoto", "Nakayama"], events: ["Tokyo", "Hanshin", "Kyoto", "Nakayama"], racetrack: ["Hanshin", "Kyoto", "Nakayama", "Tokyo"] })) {
    assert.deepEqual(sortTrackPerformance(tracks, sort).map(row => row.racetrack), names)
  }
  assert.deepEqual(tracks, before)
})

test("Win Rate ranking reuses the inclusive ten-race threshold and resolves ties by volume then name", () => {
  const row = (racetrack, races, winRate) => ({ racetrack, events: 1, races, wins: races * (winRate ?? 0) / 100, winRate })
  const tracks = [row("Tiny Sample", MIN_RACES_FOR_WIN_RATE - 1, 100), row("Tokyo", 10, 50), row("Hanshin", 10, 50), row("Ooi", 20, 50), row("Kyoto", 0, null)]
  assert.deepEqual(sortTrackPerformance(tracks, "win-rate").map(row => row.racetrack), ["Ooi", "Hanshin", "Tokyo", "Tiny Sample", "Kyoto"])
})
