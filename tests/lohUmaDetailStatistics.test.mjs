import assert from "node:assert/strict"
import test from "node:test"
import { importTS } from "./helpers/importTS.mjs"

const { getLoHUmaDetailStatistics } = await importTS(new URL("../src/LoH/umaDetailStatistics.ts", import.meta.url))
const { getUmaLoHComparisonRecord } = await importTS(new URL("../src/LoH/umaComparison.ts", import.meta.url))
const { createLoHEvent } = await importTS(new URL("../src/LoH/lohData.ts", import.meta.url))
const { getLoHLineupSnapshot } = await importTS(new URL("../src/LoH/progress.ts", import.meta.url))

function event(number, places = [], version = "original") {
  const result = createLoHEvent([], { number, name: `LoH ${number}`, racecourse: "Tokyo", surface: "Turf", distance: 1600, length: "Mile", direction: "Left", season: "Spring",
    lineup: [version, "teio", "ship"].map(id => ({ id, name: id, style: "Pace Chaser", ace: false, debuffer: false, autoRun: false })),
  }, `event-${number}`)
  result.raceSets = Array.from({ length: places.length / 5 }, (_, set) => ({ id: `set-${number}-${set}`, day: 1, order: set + 1, createdAt: "2026-11-01T01:00:00Z", weather: "Sunny", condition: "Firm", lineupSnapshot: getLoHLineupSnapshot(result),
    races: places.slice(set * 5, set * 5 + 5).map((place, i) => {
      const others = [1, 2, 3].filter(value => value !== place)
      return { id: `race-${set}-${i}`, placements: [{ umaId: version, place }, { umaId: "teio", place: others[0] }, { umaId: "ship", place: others[1] }] }
    }),
  }))
  return result
}
function extra(event, placement) {
  const others = ["first", "second", "third"].filter(value => value !== placement)
  return { ...event, completed: true, overallRank: 74, extraStage: {
    registeredAt: "2026-11-02T01:00:00Z", lineupSnapshot: getLoHLineupSnapshot(event), result: {
      id: "extra", createdAt: "2026-11-02T02:00:00Z", placements: [{ umaId: event.currentLineup[0], placement }, { umaId: "teio", placement: others[0] }, { umaId: "ship", placement: others[1] }],
    },
  } }
}

test("individual LoH detail reuses Compare totals and separates Main Stage from raced Extra Stage", () => {
  const events = [extra(event(1, [1, 1, 2, 3, 5]), "first"), extra(event(2, Array(10).fill(2)), "third")]
  const before = structuredClone(events)
  const result = getLoHUmaDetailStatistics(events, "original")
  assert.deepEqual(result.totals, getUmaLoHComparisonRecord(events, "original"))
  assert.deepEqual(result.mainStage, { events: 2, races: 15, wins: 2, winRate: 2 / 15 * 100 })
  assert.deepEqual(result.extraStage, { events: 2, races: 2, wins: 1, winRate: 50 })
  assert.equal(result.sets, 3)
  assert.equal(result.averageRawPointsPerEvent, (320 + 600) / 2)
  assert.deepEqual(result.rows.map(row => row.event.number), [2, 1])
  assert.deepEqual(events, before)
})

test("historical configurations stay aggregated by exact Uma version, without counting current-only lineups", () => {
  const original = event(1, Array(10).fill(1))
  original.raceSets[1].lineupSnapshot[0] = { ...original.raceSets[1].lineupSnapshot[0], ace: true, autoRun: true }
  const result = getLoHUmaDetailStatistics([original, event(2, Array(5).fill(2), "alternate"), event(3)], "original")
  assert.equal(result.rows.length, 1)
  assert.equal(result.sets, 2)
  assert.equal(result.totals.races, 10)
  assert.equal(result.totals.rawPoints, 1000)
})

test("ranks count only completed Main Stages where this Uma actually raced", () => {
  const completed = extra(event(1, Array(5).fill(1)), "first")
  const active = event(2, Array(5).fill(1))
  const other = extra(event(3, Array(5).fill(1), "alternate"), "first")
  const result = getLoHUmaDetailStatistics([completed, active, other], "original")
  assert.deepEqual(result.ranks.map(row => row.count), [1, 0, 0, 0])
  assert.equal(result.bestRank, "BRONZE II")
  assert.equal(result.top96, 1)
})

test("Extra Stage-only participation has one race, no Main Stage rank and no raw points", () => {
  const result = getLoHUmaDetailStatistics([extra(event(1), "second")], "original")
  assert.deepEqual(result.mainStage, { events: 0, races: 0, wins: 0, winRate: null })
  assert.equal(result.extraStage.races, 1)
  assert.equal(result.totals.rawPoints, 0)
  assert.equal(result.sets, 0)
  assert.equal(result.bestRank, null)
  assert.ok(result.ranks.every(row => row.count === 0))
})

test("legacy race totals never fabricate set counts or missing raw points", () => {
  const legacy = event(1)
  legacy.participants[0] = { ...legacy.participants[0], races: 10, wins: 4, top3Finishes: 7 }
  legacy.racesPlayed = 10
  legacy.firstPlaces = 4
  delete legacy.raceSets
  const result = getLoHUmaDetailStatistics([legacy], "original")
  assert.equal(result.mainStage.races, 10)
  assert.equal(result.sets, null)
  assert.equal(result.rows[0].sets, null)
  assert.equal(result.totals.rawPoints, null)
  assert.equal(result.averageRawPointsPerEvent, null)
})

test("empty and unused versions keep rates unavailable and have no history or rank counts", () => {
  for (const events of [[], [event(1, Array(5).fill(1), "alternate")]]) {
    const result = getLoHUmaDetailStatistics(events, "original")
    assert.equal(result.rows.length, 0)
    assert.equal(result.sets, 0)
    assert.equal(result.mainStage.winRate, null)
    assert.equal(result.extraStage.winRate, null)
    assert.equal(result.averageRawPointsPerEvent, null)
    assert.equal(result.bestRank, null)
  }
})
