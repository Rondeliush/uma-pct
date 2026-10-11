import assert from "node:assert/strict"
import test from "node:test"
import { importTS } from "./helpers/importTS.mjs"

const { getGlobalUmaDistancePerformance } = await importTS(new URL("../src/Statistics/umaGlobalDistanceStatistics.ts", import.meta.url))
const { calculateUmaStatistics, formatUmaWinRate } = await importTS(new URL("../src/Statistics/umaStatistics.ts", import.meta.url))

const attempt = (racesPlayed, wins, fields = {}) => ({
  day: 1, attempt: 1, racesPlayed, retired: false,
  umaWins: [{ cmUmaId: "a", wins }], ...fields,
})
const event = (distance, length, surface, races, wins, fields = {}) => ({
  number: 1, distance, length, surface, participants: [], finalPlace: "",
  attempts: [attempt(races, wins)], ...fields,
})
const totals = rows => rows.reduce((total, row) => ({ races: total.races + row.races, wins: total.wins + row.wins }), { races: 0, wins: 0 })

test("global categories reuse recorded distance lengths and retain weighted team totals", () => {
  const cms = [
    event(2500, "Long", "Turf", 18, 10), event(1600, "Mile", "Dirt", 80, 40),
    event(1200, "Short", "Turf", 20, 10), event(2000, "Medium", "Turf", 100, 68),
  ]
  const before = structuredClone(cms)
  const performance = getGlobalUmaDistancePerformance(cms)
  assert.deepEqual(performance.categories.map(row => [row.category, row.races, row.wins, formatUmaWinRate(row.winRate)]), [
    ["Sprint", 20, 10, "50.0%"], ["Mile", 80, 40, "50.0%"], ["Medium", 100, 68, "68.0%"], ["Long", 18, 10, "55.6%"],
  ])
  assert.deepEqual(performance.distances.map(row => row.distance), [1200, 1600, 2000, 2500])
  assert.deepEqual(performance.distances, calculateUmaStatistics(cms, [], []).distances)
  assert.equal(performance.uncategorizedRaces, 0)
  assert.deepEqual(cms, before)
})

test("multiple exact distances and batches in one category use a weighted combined rate", () => {
  const cms = [event(1800, "Mile", "Turf", 80, 40), event(1600, "Mile", "Turf", 20, 5), event(1600, "Mile", "Dirt", 10, 8)]
  const performance = getGlobalUmaDistancePerformance(cms)
  assert.deepEqual(performance.distances, [
    { distance: 1600, races: 30, wins: 13, winRate: 13 / 30 * 100 },
    { distance: 1800, races: 80, wins: 40, winRate: 50 },
  ])
  assert.deepEqual(performance.categories[1], { category: "Mile", races: 110, wins: 53, winRate: 53 / 110 * 100 })
  assert.equal(formatUmaWinRate(performance.categories[1].winRate), "48.2%")
})

test("All, Turf and Dirt filters apply to both distance modes and reconcile with global surface totals", () => {
  const cms = [
    event(1600, "Mile", "Turf", 100, 60), event(1800, "Mile", "Dirt", 20, 5),
    event(2000, "Medium", "Turf", 50, 20), event(1600, "Mile", "Dirt", 10, 2),
  ]
  const statistics = calculateUmaStatistics(cms, [], [])
  for (const surface of ["All", "Turf", "Dirt"]) {
    const performance = getGlobalUmaDistancePerformance(cms, surface)
    const expected = surface === "All" ? statistics.overall : statistics.surfaces.find(row => row.surface === surface)
    assert.deepEqual(totals(performance.distances), { races: expected.races, wins: expected.wins })
    assert.deepEqual(totals(performance.categories), totals(performance.distances))
  }
  assert.deepEqual(getGlobalUmaDistancePerformance(cms, "Turf").distances.map(row => [row.distance, row.races, row.wins]), [[1600, 100, 60], [2000, 50, 20]])
  assert.deepEqual(getGlobalUmaDistancePerformance(cms, "Dirt").distances.map(row => [row.distance, row.races, row.wins]), [[1600, 10, 2], [1800, 20, 5]])
  assert.deepEqual(getGlobalUmaDistancePerformance(cms).distances, statistics.distances)
})

test("unused and filtered-out categories remain visible with zero counts and unavailable rates", () => {
  const cms = [event(1600, "Mile", "Dirt", 20, 5)]
  assert.deepEqual(getGlobalUmaDistancePerformance(cms, "Dirt").categories.map(row => [row.category, row.races, row.wins, formatUmaWinRate(row.winRate)]), [
    ["Sprint", 0, 0, "—"], ["Mile", 20, 5, "25.0%"], ["Medium", 0, 0, "—"], ["Long", 0, 0, "—"],
  ])
  for (const history of [[], cms, [event(1600, "Mile", "Turf", 0, 0)], [event(1600, "Mile", "Turf", 0, 0, { attempts: [], finalPlace: "1st" })]]) {
    const performance = getGlobalUmaDistancePerformance(history, "Turf")
    assert.deepEqual(performance.distances, [])
    assert.deepEqual(performance.categories.map(row => row.category), ["Sprint", "Mile", "Medium", "Long"])
    assert.ok(performance.categories.every(row => row.races === 0 && row.wins === 0 && row.winRate === null))
  }
})

test("surface filters use recorded metadata without guessing unknown surfaces or distance categories", () => {
  const cms = [event(1600, "", "Grass", 20, 10), event(2000, "Medium", "turf", 10, 5)]
  const all = getGlobalUmaDistancePerformance(cms)
  assert.deepEqual(all.distances.map(row => row.distance), [1600, 2000])
  assert.equal(all.uncategorizedRaces, 20)
  assert.equal(all.categories[1].races, 0)
  assert.equal(all.categories[2].races, 10)
  for (const surface of ["Turf", "Dirt"]) {
    const performance = getGlobalUmaDistancePerformance(cms, surface)
    assert.deepEqual(performance.distances, [])
    assert.ok(performance.categories.every(row => row.races === 0))
    assert.equal(performance.uncategorizedRaces, 0)
  }
  const aliases = getGlobalUmaDistancePerformance([event(1200, "Sprint", "Turf", 5, 2), event(1600, "Miles", "Turf", 5, 3)])
  assert.equal(aliases.categories[0].races, 5)
  assert.equal(aliases.categories[1].races, 5)
})

test("global distance accounting counts each team batch once regardless of participating Uma count", () => {
  const cms = [event(1600, "Mile", "Turf", 100, 0, {
    participants: ["one", "two", "three"].map((umaId, index) => ({ cmUmaId: String(index), umaId, won: false, finalParticipant: false })),
    attempts: [attempt(100, 0, { umaWins: [35, 20, 5].map((wins, index) => ({ cmUmaId: String(index), wins })) })],
  })]
  const statistics = calculateUmaStatistics(cms, [], [])
  const performance = getGlobalUmaDistancePerformance(cms)
  assert.equal(statistics.umas.reduce((sum, uma) => sum + uma.races, 0), 300)
  assert.deepEqual(performance.distances, [{ distance: 1600, races: 100, wins: 60, winRate: 60 }])
  assert.deepEqual(performance.categories[1], { category: "Mile", races: 100, wins: 60, winRate: 60 })
  assert.deepEqual(totals(performance.distances), { races: statistics.overall.races, wins: statistics.overall.wins })
})

test("exact distances preserve existing batch accounting for retired, unresolved and participant-free records", () => {
  const cms = [event(1800, "Mile", "Dirt", 0, 0, {
    attempts: [attempt(4, 1, { retired: true }), attempt(5, 0, { umaWins: [] }), attempt(0, 0)],
  }), event(0, "Medium", "Turf", 5, 2), event(Infinity, "Long", "Turf", 5, 1)]
  const before = structuredClone(cms)
  const performance = getGlobalUmaDistancePerformance(cms)
  assert.deepEqual(performance.distances, calculateUmaStatistics(cms, [], []).distances)
  assert.deepEqual(performance.distances, [{ distance: 1800, races: 9, wins: 1, winRate: 1 / 9 * 100 }])
  assert.deepEqual(performance.categories[1], { category: "Mile", races: 9, wins: 1, winRate: 1 / 9 * 100 })
  assert.equal(performance.categories[2].races, 0)
  assert.equal(performance.categories[3].races, 0)
  assert.deepEqual(cms, before)
})
