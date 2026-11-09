import assert from "node:assert/strict"
import test from "node:test"
import { importTS } from "./helpers/importTS.mjs"

const cmStats = await importTS(new URL("../src/Statistics/eventStatistics.ts", import.meta.url))
const lohStats = await importTS(new URL("../src/LoH/eventStatistics.ts", import.meta.url))
const { getHomeCareerStatistics } = await importTS(new URL("../src/Home/homeData.ts", import.meta.url))
const { createLoHEvent } = await importTS(new URL("../src/LoH/lohData.ts", import.meta.url))
const p = await importTS(new URL("../src/LoH/progress.ts", import.meta.url))

const attempt = (day, wins, races = 5) => ({ day, attempt: 1, racesPlayed: races, retired: false, umaWins: [{ cmUmaId: "a", wins }] })
const cm = (number, changes = {}) => ({ number, name: `Cup ${number}`, track: "Tokyo", surface: "Turf", distance: 1600, league: "Graded League", phase: "attempts", attempts: [], participants: [], currentLineup: [], finalPlace: "", log: [], ...changes })
const loh = number => createLoHEvent([], { number, name: `League ${number}`, racecourse: "Kyoto", surface: "Turf", distance: 2400, length: "Long", direction: "Left", season: "Spring", lineup: ["a", "b", "c"].map(id => ({ id, name: id, style: "Pace Chaser", ace: false, debuffer: false, autoRun: false })) }, `loh-${number}`)
const add = event => p.saveLoHRaceSet(event, { id: `set-${event.number}`, createdAt: "2026-11-07T00:00:00Z", day: 1, weather: "Sunny", condition: "Firm", lineupSnapshot: p.getLoHLineupSnapshot(event), races: Array.from({ length: 5 }, (_, i) => ({ id: `race-${i}`, placements: event.currentLineup.map((umaId, slot) => ({ umaId, place: slot + 1 })) })) })
const endMain = event => { for (let day = 1; day <= 6; day++) event = p.finishLoHDay(event, day); return event }

test("event panels have honest empty totals and no fabricated highlights or qualifications", () => {
  const cm = cmStats.getCMEventStatistics([]), loh = lohStats.getLoHEventStatistics([])
  assert.deepEqual(cm.totals, { events: 0, races: 0, wins: 0, winRate: null })
  assert.equal(cm.bestWinRate, null); assert.equal(cm.mostWins, null)
  assert.deepEqual(loh.totals, { events: 0, races: 0, wins: 0, winRate: null, rawPoints: 0, averageRawPoints: 0 })
  assert.deepEqual(loh.placements, [0, 0, 0, 0, 0, 0]); assert.equal(loh.top96, 0); assert.equal(loh.bestRank, null)
  assert.equal(loh.extraStageWins, 0); assert.equal(loh.unresolvedExtraStagePlacements, 0)
})

test("CM panel and history share Home weighted team totals, including each raced final once", () => {
  const events = [cm(1, { attempts: [attempt(1, 3), attempt(3, 4)], finalPlace: "1st", phase: "completed" }), cm(2, { attempts: [attempt(1, 0, 2)], phase: "eliminated" }), cm(3)]
  const original = structuredClone(events), data = cmStats.getCMEventStatistics(events)
  assert.deepEqual(data.totals, getHomeCareerStatistics(events, []).cm)
  assert.deepEqual(data.rows.map(row => row.event.number), [3, 2, 1])
  assert.equal(data.totals.races, 13); assert.equal(data.totals.wins, 8)
  assert.equal(data.totals.winRate, 8 / 13 * 100)
  assert.equal(data.bestWinRate.event.number, 1); assert.equal(data.mostWins.wins, 8)
  assert.deepEqual(data.groups[0], { group: "A", events: 1, qualified: 1, racedFinal: 1, finalRate: 100 })
  assert.deepEqual(data.groups[1], { group: "B", events: 1, qualified: 0, racedFinal: 0, finalRate: 0 })
  assert.deepEqual(events, original)
})

test("CM final placements honor league filters without inventing missing leagues or pending results", () => {
  const rows = cmStats.getCMEventStatistics([
    cm(1, { finalPlace: "1st" }), cm(2, { finalPlace: "2nd", league: "Open League" }),
    cm(3, { finalPlace: "3rd", league: undefined }), cm(4, { finalPlace: "" }), cm(5, { phase: "eliminated" }),
  ]).rows
  assert.deepEqual(cmStats.getCMFinalPlacementCounts(rows, "all").map(row => row.count), [1, 1, 1])
  assert.deepEqual(cmStats.getCMFinalPlacementCounts(rows, "Graded League").map(row => row.count), [1, 0, 0])
  assert.deepEqual(cmStats.getCMFinalPlacementCounts(rows, "Open League").map(row => row.count), [0, 1, 0])
  assert.deepEqual(cmStats.filterCMEventHistory(rows, " cup 2 ", "Open League", "all").map(row => row.event.number), [2])
  assert.deepEqual(cmStats.filterCMEventHistory(rows, "Tokyo", "all", "Eliminated").map(row => row.event.number), [5])
})

test("Final A/B and Group A/B retain weighted scoped rates and distinguish qualification from a raced final", () => {
  const data = cmStats.getCMEventStatistics([
    cm(1, { attempts: [attempt(1, 3), attempt(3, 4)], finalPlace: "1st" }),
    cm(2, { attempts: [attempt(1, 1), attempt(3, 1)], finalPlace: "2nd", league: "Open League" }),
    cm(3, { attempts: [attempt(1, 3), attempt(3, 3)], phase: "finalResult" }),
  ])
  assert.deepEqual(data.finals.map(row => [row.label, row.events, row.races, row.wins, row.winRate]), [
    ["Final A", 2, 21, 14, 14 / 21 * 100], ["Final B", 1, 11, 2, 2 / 11 * 100],
  ])
  assert.deepEqual(data.groups, [
    { group: "A", events: 2, qualified: 2, racedFinal: 1, finalRate: 50 },
    { group: "B", events: 1, qualified: 1, racedFinal: 1, finalRate: 100 },
  ])
})

test("one league filter scopes final placements, Round 2 and final participation/wins without counting pending finals", () => {
  const events = [
    cm(1, { attempts: [attempt(1, 3), attempt(3, 4)], finalPlace: "1st", phase: "completed" }),
    cm(2, { attempts: [attempt(1, 3), attempt(3, 4)], finalPlace: "2nd", phase: "completed" }),
    cm(3, { attempts: [attempt(1, 3), attempt(3, 3)], phase: "finalResult" }),
    cm(4, { attempts: [attempt(1, 1), attempt(3, 1)], finalPlace: "1st", phase: "completed", league: "Open League" }),
    cm(5, { attempts: [attempt(1, 3), attempt(3, 1)], finalPlace: "3rd", phase: "completed", league: "Open League" }),
    cm(6, { attempts: [attempt(1, 0)], phase: "eliminated" }),
    cm(7, { attempts: [attempt(1, 3)], phase: "eliminated", league: "Open League" }),
    cm(8, { attempts: [attempt(1, 3), attempt(3, 3)], finalPlace: "1st", phase: "completed", league: undefined }),
    cm(9),
  ]
  const original = structuredClone(events), data = cmStats.getCMEventStatistics(events)
  const all = cmStats.getCMLeagueSummary(data.rows, "all")
  const graded = cmStats.getCMLeagueSummary(data.rows, "Graded League")
  const open = cmStats.getCMLeagueSummary(data.rows, "Open League")
  assert.deepEqual(all.placements.map(row => row.count), [3, 1, 1])
  assert.deepEqual(graded.placements.map(row => row.count), [1, 1, 0])
  assert.deepEqual(open.placements.map(row => row.count), [1, 0, 1])
  assert.deepEqual(all.groups.map(row => row.events), [6, 2])
  assert.deepEqual(graded.groups.map(row => row.events), [3, 1])
  assert.deepEqual(open.groups.map(row => row.events), [2, 1])
  assert.deepEqual(all.finals, [
    { label: "Final A", participated: 3, won: 2 }, { label: "Final B", participated: 2, won: 1 }, { label: "Eliminated", participated: 2, won: null },
  ])
  assert.deepEqual(graded.finals.map(row => [row.participated, row.won]), [[2, 1], [0, 0], [1, null]])
  assert.deepEqual(open.finals.map(row => [row.participated, row.won]), [[0, 0], [2, 1], [1, null]])
  assert.deepEqual(events, original)
})

test("league summary has explicit zero counts and no won value for eliminated events when empty", () => {
  const summary = cmStats.getCMLeagueSummary([], "all")
  assert.deepEqual(summary.placements.map(row => row.count), [0, 0, 0])
  assert.deepEqual(summary.groups.map(row => row.events), [0, 0])
  assert.deepEqual(summary.finals.map(row => [row.participated, row.won]), [[0, 0], [0, 0], [0, null]])
})

test("LoH team races/wins include Extra Stage once, raw points ignore the cap and Extra Stage adds no points", () => {
  let event = add({ ...loh(1), legacyProgress: { leagueScore: 3980, racesPlayed: 0, firstPlaces: 0, top3Finishes: 0, participants: [] } })
  assert.equal(p.getLoHProgress(event).leagueScore, 4000)
  event = p.confirmLoHMainStageRank(endMain(event), 96)
  event = p.registerLoHExtraStageLineup(event, ["a", "b", "c"])
  const beforeExtra = lohStats.getLoHEventStatistics([event])
  assert.equal(beforeExtra.top96, 1); assert.equal(beforeExtra.extraStageWins, 0)
  event = p.saveLoHExtraStageResult(event, { id: "extra", createdAt: "2026-11-07T01:00:00Z", weather: "Rainy", condition: "Soft", placements: ["a", "b", "c"].map((umaId, i) => ({ umaId, placement: ["second", "third", "fourth_or_lower"][i] })) })
  const events = [event, loh(2)], original = structuredClone(events), data = lohStats.getLoHEventStatistics(events)
  assert.deepEqual(data.totals, { events: 2, races: 6, wins: 5, winRate: 5 / 6 * 100, rawPoints: 1000, averageRawPoints: 500 })
  assert.deepEqual(data.placements, [5, 6, 6, 0, 0, 0]); assert.equal(data.unresolvedExtraStagePlacements, 1)
  assert.equal(data.extraStageWins, 0, "participating in Extra Stage is not a win")
  assert.deepEqual(data.ranks.map(row => row.count), [0, 1, 0, 0])
  assert.equal(data.bestRank.event.overallRank, 96)
  assert.deepEqual(events, original)
})

test("LoH rank distribution uses final Main Stage scores and excludes ongoing provisional ranks", () => {
  const scores = [0, 4000, 10000, 20000]
  const events = scores.map((score, i) => ({ ...loh(i + 1), raceSets: undefined, leagueScore: score, completed: true, overallRank: [1, 96, 97, null][i] }))
  events.push({ ...loh(5), leagueScore: 30000, overallRank: 2 })
  const data = lohStats.getLoHEventStatistics(events)
  assert.deepEqual(data.ranks.map(row => row.count), [1, 1, 1, 1]); assert.equal(data.top96, 2)
  assert.equal(data.rankedEvents, 3); assert.equal(data.bestRank.event.number, 1)
  assert.deepEqual(lohStats.filterLoHEventHistory(data.rows, "", "SILVER", "completed").map(row => row.event.number), [2])
  assert.deepEqual(lohStats.filterLoHEventHistory(data.rows, "Kyoto", "all", "top96").map(row => row.event.number), [2, 1])
})

test("LoH legacy unknown raw totals stay unknown while known participant totals remain usable", () => {
  const unknown = { ...loh(1), raceSets: undefined, leagueScore: 9999, racesPlayed: 5, firstPlaces: 2, participants: [] }
  assert.equal(lohStats.getLoHEventStatistics([unknown]).totals.rawPoints, null)
  assert.equal(lohStats.getLoHEventStatistics([unknown]).totals.averageRawPoints, null)
  const known = { ...unknown, participants: [{ umaId: "a", races: 5, wins: 2, top3Finishes: 3, totalPoints: 270 }] }
  assert.equal(lohStats.getLoHEventStatistics([known]).totals.rawPoints, 270)
  assert.deepEqual(lohStats.getLoHEventStatistics([known]).placements, [0, 0, 0, 0, 0, 0], "legacy aggregates never fabricate placement rows")
})

test("LoH raw points highlight uses actual raw totals before the cap, not awarded score, and skips unknown or empty records", () => {
  const rawLeader = add({ ...loh(1), legacyProgress: { leagueScore: 3980, racesPlayed: 0, firstPlaces: 0, top3Finishes: 0, participants: [] } })
  const highLeagueScore = add({ ...loh(2), legacyProgress: { leagueScore: 20000, racesPlayed: 0, firstPlaces: 0, top3Finishes: 0, participants: [] } })
  highLeagueScore.raceSets[0].races.forEach(race => race.placements.forEach((placement, i) => { placement.place = [4, 5, "6+"][i] }))
  const unknown = { ...loh(3), raceSets: undefined, leagueScore: 30000, racesPlayed: 100, firstPlaces: 20, participants: [] }
  const events = [rawLeader, highLeagueScore, unknown, loh(4)], original = structuredClone(events)
  const data = lohStats.getLoHEventStatistics(events)
  assert.equal(data.mostRawPoints.event.number, 1)
  assert.equal(data.mostRawPoints.rawPoints, 1000)
  assert.equal(p.getLoHProgress(rawLeader).leagueScore, 4000)
  assert.equal(data.rows.find(row => row.event.number === 2).rawPoints, 300)
  assert.equal(lohStats.getLoHEventStatistics([rawLeader, add(loh(5))]).mostRawPoints.event.number, 5, "ties consistently prefer the higher event number")
  for (const events of [[], [loh(1)], [unknown]]) assert.equal(lohStats.getLoHEventStatistics(events).mostRawPoints, null)
  assert.deepEqual(events, original)
})

test("LoH placements distinguish 4th and 5th, combining all recorded 6th+ values without inventing Extra Stage places", () => {
  const event = loh(1)
  event.raceSets = [{ id: "mixed", createdAt: "2026-11-07T00:00:00Z", day: 1, weather: "Sunny", condition: "Firm", lineupSnapshot: p.getLoHLineupSnapshot(event),
    races: [[4, 5, 6], [7, 8, 9], [10, 11, 12], ["6+", "6+", "6+"], [1, 2, 3]].map((places, i) => ({ id: `mixed-${i}`, placements: places.map((place, slot) => ({ umaId: event.currentLineup[slot], place })) })) }]
  const original = structuredClone(event), data = lohStats.getLoHEventStatistics([event])
  assert.deepEqual(data.placements, [1, 1, 1, 1, 1, 10])
  assert.equal(data.unresolvedExtraStagePlacements, 0)
  assert.equal(data.placements.reduce((sum, value) => sum + value, 0), 15)
  assert.deepEqual(event, original)
})

test("Extra Stage Wins counts only recorded winning events, excluding qualification, registration and losses", () => {
  const qualified = p.confirmLoHMainStageRank(endMain(loh(1)), 96)
  const registered = p.registerLoHExtraStageLineup(qualified, ["a", "b", "c"])
  const result = places => ({ id: "extra", createdAt: "2026-11-07T01:00:00Z", weather: "Sunny", condition: "Firm", placements: places.map((placement, i) => ({ umaId: ["a", "b", "c"][i], placement })) })
  const winner = p.saveLoHExtraStageResult(registered, result(["third", "first", "second"]))
  const loss = p.saveLoHExtraStageResult(registered, result(["second", "fourth_or_lower", "fourth_or_lower"]))
  const events = [qualified, registered, winner, loss], original = structuredClone(events)
  const data = lohStats.getLoHEventStatistics(events)
  assert.equal(data.extraStageWins, 1)
  assert.deepEqual(data.placements, [1, 2, 1, 0, 0, 0])
  assert.equal(data.unresolvedExtraStagePlacements, 2)
  assert.equal(data.placements.reduce((sum, value) => sum + value, 0) + data.unresolvedExtraStagePlacements, 6)
  assert.deepEqual(events, original)
})
