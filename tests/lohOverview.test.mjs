import assert from "node:assert/strict"
import test from "node:test"
import { importTS } from "./helpers/importTS.mjs"

const { EMPTY_LOH_FILTERS, getLoHCardLineup, getLoHOverviewStats, getLoHOverviewUmaIds, filterLoHEvents, sortLoHEvents, paginateLoHEvents, getLoHPageNumbers } = await importTS(new URL("../src/LoH/overview.ts", import.meta.url))
const { createLoHEvent } = await importTS(new URL("../src/LoH/lohData.ts", import.meta.url))
const p = await importTS(new URL("../src/LoH/progress.ts", import.meta.url))
const { getLoHConfigurationKey } = await importTS(new URL("../src/LoH/configurations.ts", import.meta.url))
const details = { name: "Overview", racecourse: "Tokyo", surface: "Turf", distance: 1600, length: "Mile", direction: "Left", season: "Spring", lineup: ["fuji", "teio", "ship"].map(id => ({ id, name: id, style: "Pace Chaser", ace: false, debuffer: false, autoRun: false })) }
const make = number => createLoHEvent([], { ...details, number }, `event-${number}`)
function add(event, id, wins) {
  return p.saveLoHRaceSet(event, { id, day: 1, createdAt: "2026-10-31T01:00:00Z", weather: "Sunny", condition: "Firm", lineupSnapshot: p.getLoHLineupSnapshot(event), races: Array.from({ length: 5 }, (_, i) => ({ id: `${id}-${i}`, placements: event.currentLineup.map((umaId, slot) => ({ umaId, place: slot + (i < wins ? 1 : 2) })) })) })
}
const filters = changes => ({ ...EMPTY_LOH_FILTERS, ...changes })

test("LoH cards show each version's raw points across configurations without treating Main Stage wins as Extra Stage places", () => {
  let event = add(make(1), "first", 5)
  event = { ...event, participants: event.participants.map(uma => uma.umaId === "fuji" ? { ...uma, runningStyle: "end_closer", ace: true } : uma) }
  event = add(event, "second", 0)
  const original = structuredClone(event)
  const lineup = getLoHCardLineup(event)
  assert.deepEqual(lineup.map(uma => uma.rawPoints), [800, 500, 350])
  assert.ok(lineup.every(uma => uma.extraStagePlacement === undefined))
  assert.equal(lineup[0].runningStyle, "end_closer")
  assert.equal(lineup[0].ace, true)
  assert.deepEqual(event, original)
})

test("LoH cards follow frozen Main/Extra Stage lineups and only show actual recorded Extra placements", () => {
  let event = add(make(1), "history", 5)
  event = { ...event, currentLineup: ["new", "teio", "ship"], participants: [...event.participants, { ...event.participants[0], umaId: "new" }] }
  assert.equal(getLoHCardLineup(event)[0].umaId, "new")
  for (let day = 1; day <= 6; day++) event = p.finishLoHDay(event, day)
  assert.equal(getLoHCardLineup(event)[0].umaId, "fuji", "completed Main Stage uses its last recorded lineup")
  event = p.confirmLoHMainStageRank(event, 74)
  event = p.registerLoHExtraStageLineup(event, p.getLoHLineupSnapshot(event).map(getLoHConfigurationKey))
  assert.deepEqual(getLoHCardLineup(event).map(uma => uma.umaId), ["new", "teio", "ship"])
  assert.ok(getLoHCardLineup(event).every(uma => uma.extraStagePlacement === undefined), "registration alone is not a placement")
  event = p.completeLoHExtraStage(event, { id: "extra", createdAt: "2026-10-31T02:00:00Z", weather: "Sunny", condition: "Good", placements: event.extraStage.lineupSnapshot.map((uma, i) => ({ umaId: uma.umaId, placement: ["first", "third", "fourth_or_lower"][i] })) })
  const original = structuredClone(event)
  assert.deepEqual(getLoHCardLineup(event).map(uma => uma.extraStagePlacement), ["first", "third", "fourth_or_lower"])
  assert.deepEqual(getLoHCardLineup(event).map(uma => uma.rawPoints), [0, 300, 200], "Extra Stage does not award raw points")
  assert.deepEqual(event, original)
})

test("LoH card points distinguish a fresh zero from unknown legacy totals", () => {
  assert.deepEqual(getLoHCardLineup(make(1)).map(uma => uma.rawPoints), [0, 0, 0])
  const legacy = make(2)
  delete legacy.raceSets
  legacy.racesPlayed = 5
  legacy.participants = legacy.participants.map(uma => ({ ...uma, races: 5 }))
  assert.ok(getLoHCardLineup(legacy).every(uma => uma.rawPoints === null))
})

test("LoH overview WR uses Main Stage team totals, while Top 96 finishes count qualifications", () => {
  const first = add(make(1), "a", 4), second = add(add(make(2), "b", 1), "c", 0)
  let final = first
  for (let day = 1; day <= 6; day++) final = p.finishLoHDay(final, day)
  final = p.confirmLoHMainStageRank(final, 74)
  final = p.registerLoHExtraStageLineup(final, p.getLoHLineupSnapshot(final).map(getLoHConfigurationKey))
  assert.equal(getLoHOverviewStats([final]).top96Finishes, 1, "qualification counts before an Extra Stage result is recorded")
  final = p.completeLoHExtraStage(final, { id: "extra", createdAt: "2026-10-31T02:00:00Z", weather: "Sunny", condition: "Good", placements: final.extraStage.lineupSnapshot.map((uma, i) => ({ umaId: uma.umaId, placement: ["first", "second", "third"][i] })) })
  const original = structuredClone([final, second])
  assert.deepEqual(getLoHOverviewStats([final, second]), { events: 2, races: 15, wins: 5, top96Finishes: 1, winRate: 5 / 15 * 100, averagePoints: 1150 })
  assert.deepEqual([final, second], original)
})

test("Top 96 finishes include confirmed boundary ranks and legacy completed events, excluding provisional and invalid ranks", () => {
  const closed = { ...make(1), mainStage: { completedDays: [1, 2, 3, 4, 5, 6] } }
  for (const [rank, expected] of [[1, 1], [96, 1], [97, 0], [null, 0], [0, 0], [-1, 0], [1.5, 0], [NaN, 0]]) {
    assert.equal(getLoHOverviewStats([{ ...closed, overallRank: rank }]).top96Finishes, expected)
  }
  const events = [
    { ...closed, overallRank: 1 },
    { ...closed, number: 2, overallRank: 96 },
    { ...make(3), overallRank: 74 },
    { ...make(4), overallRank: 23, completed: true },
    { ...closed, number: 5, overallRank: 97 },
  ]
  const original = structuredClone(events)
  assert.equal(getLoHOverviewStats(events).top96Finishes, 3)
  assert.deepEqual(events, original)
})

test("empty and aggregate-only LoH history retain meaningful overview totals", () => {
  assert.deepEqual(getLoHOverviewStats([]), { events: 0, races: 0, wins: 0, top96Finishes: 0, winRate: 0, averagePoints: 0 })
  const old = make(1)
  delete old.raceSets
  old.racesPlayed = 20; old.firstPlaces = 7; old.leagueScore = 3000
  assert.deepEqual(getLoHOverviewStats([old, make(2)]), { events: 2, races: 20, wins: 7, top96Finishes: 0, winRate: 35, averagePoints: 1500 })
})

test("Average PT is the mean League Score across every event, including ongoing and empty events", () => {
  const events = [add(make(1), "short", 5), add(add(make(2), "long-a", 0), "long-b", 0), make(3)]
  const original = structuredClone(events)
  assert.equal(getLoHOverviewStats(events).averagePoints, (1000 + 1300 + 0) / 3)
  assert.deepEqual(events, original)
})

test("Average PT uses awarded League Score including the Bronze cap, not individual raw points", () => {
  const capped = add({ ...make(1), raceSets: [], legacyProgress: { leagueScore: 3950, racesPlayed: 0, firstPlaces: 0, top3Finishes: 0, participants: [] } }, "cap", 5)
  assert.equal(capped.leagueScore, 4000)
  assert.equal(getLoHOverviewStats([capped]).averagePoints, 4000)
  assert.deepEqual(getLoHCardLineup(capped).map(uma => uma.rawPoints), [500, 300, 200])
})

test("filter groups combine with AND while selections inside each group combine with OR", () => {
  const events = [make(1), { ...make(2), surface: "Dirt", length: "Long", racecourse: "Ooi", leagueScore: 10000 }, { ...make(3), surface: "Dirt", length: "Short", racecourse: "Ooi" }]
  assert.deepEqual(filterLoHEvents(events, filters({ lengths: ["Mile", "Long"] })).map(e => e.number), [1, 2])
  assert.deepEqual(filterLoHEvents(events, filters({ lengths: ["Mile", "Long"], surfaces: ["Dirt"], racecourses: ["Ooi"], ranks: ["GOLD I"] })).map(e => e.number), [2])
  assert.equal(filterLoHEvents(events, filters({ surfaces: ["Dirt"], racecourses: ["Tokyo"] })).length, 0)
  assert.equal(filterLoHEvents(events, EMPTY_LOH_FILTERS).length, 3)
  assert.equal(filterLoHEvents([{ ...make(4), length: null }], filters({ lengths: ["Mile"] })).length, 0)
})

test("Uma filters include historical and registered snapshots with exact version identity", () => {
  const event = add(make(1), "history", 5)
  event.participants = event.participants.filter(uma => uma.umaId !== "fuji")
  event.currentLineup = ["fuji-alt", "teio", "ship"]
  event.participants.push({ ...event.participants[0], umaId: "fuji-alt" })
  event.extraStage = { registeredAt: "2026-10-31T01:00:00Z", lineupSnapshot: [{ umaId: "extra-only" }, { umaId: "teio" }, { umaId: "ship" }] }
  event.extraStageCandidates = [{ umaId: "unregistered" }]
  const original = structuredClone(event)
  assert.ok(getLoHOverviewUmaIds(event).includes("fuji"))
  assert.ok(getLoHOverviewUmaIds(event).includes("fuji-alt"))
  assert.ok(getLoHOverviewUmaIds(event).includes("extra-only"))
  assert.equal(getLoHOverviewUmaIds(event).includes("unregistered"), false)
  assert.equal(filterLoHEvents([event], filters({ umaIds: ["fuji"] })).length, 1)
  assert.equal(filterLoHEvents([make(2)], filters({ umaIds: ["fuji-alt"] })).length, 0)
  assert.deepEqual(event, original)
})

test("stage and Extra Stage filters distinguish pending ranks, confirmed Top 96, winners and nonqualifiers", () => {
  const active = { ...make(1), overallRank: 74 }
  const closed = { ...make(2), mainStage: { completedDays: [1, 2, 3, 4, 5, 6] } }
  const qualified = { ...closed, number: 3, overallRank: 96 }
  const notQualified = { ...closed, number: 4, overallRank: 97, completed: true }
  const winner = { ...qualified, number: 5, completed: true, extraStage: { lineupSnapshot: [], result: { placements: [{ umaId: "fuji", placement: "first" }] } } }
  const participant = { ...winner, number: 6, extraStage: { lineupSnapshot: [], result: { placements: [{ umaId: "fuji", placement: "second" }] } } }
  const all = [active, closed, qualified, notQualified, winner, participant]
  assert.deepEqual(filterLoHEvents(all, filters({ extraStage: ["qualified"] })).map(e => e.number), [3, 5, 6])
  assert.deepEqual(filterLoHEvents(all, filters({ extraStage: ["not-qualified"] })).map(e => e.number), [4])
  assert.deepEqual(filterLoHEvents(all, filters({ phases: ["AWAITING_MAIN_STAGE_RANK"] })).map(e => e.number), [2])
  assert.deepEqual(filterLoHEvents(all, filters({ phases: ["COMPLETED"], extraStage: ["winner", "participated"] })).map(e => e.number), [5, 6])
})

test("sorting supports numbers, insertion order, scores and known ranks without mutating the event array", () => {
  const all = [{ ...make(9), leagueScore: 1000, overallRank: null }, { ...make(2), leagueScore: 3000, overallRank: 74 }, { ...make(20), leagueScore: 2000, overallRank: 3 }]
  const original = structuredClone(all)
  const numbers = mode => sortLoHEvents(all, mode).map(e => e.number)
  assert.deepEqual(numbers("number-desc"), [20, 9, 2]); assert.deepEqual(numbers("number-asc"), [2, 9, 20])
  assert.deepEqual(numbers("added-desc"), [20, 2, 9]); assert.deepEqual(numbers("added-asc"), [9, 2, 20])
  assert.deepEqual(numbers("score-desc"), [2, 20, 9]); assert.deepEqual(numbers("score-asc"), [9, 20, 2])
  assert.deepEqual(numbers("rank-asc"), [20, 2, 9]); assert.deepEqual(all, original)
})

test("pagination uses ten events, clamps stale pages after filtering/deletion and handles an empty list", () => {
  const all = Array.from({ length: 23 }, (_, i) => make(i + 1))
  assert.deepEqual(paginateLoHEvents(all, 2).events.map(e => e.number), [11, 12, 13, 14, 15, 16, 17, 18, 19, 20])
  assert.deepEqual(paginateLoHEvents(all, 100).events.map(e => e.number), [21, 22, 23])
  assert.equal(paginateLoHEvents(all.slice(0, 20), 3).page, 2)
  assert.equal(paginateLoHEvents(all, -1).page, 1)
  assert.deepEqual(paginateLoHEvents([], 3), { page: 1, totalPages: 1, events: [] })
})

test("page controls keep first/last and nearby pages without rendering unbounded button lists", () => {
  assert.deepEqual(getLoHPageNumbers(1, 1), [1])
  assert.deepEqual(getLoHPageNumbers(1, 3), [1, 2, 3])
  assert.deepEqual(getLoHPageNumbers(50, 100), [1, "gap", 49, 50, 51, "gap", 100])
  assert.deepEqual(getLoHPageNumbers(100, 100), [1, "gap", 99, 100])
})
