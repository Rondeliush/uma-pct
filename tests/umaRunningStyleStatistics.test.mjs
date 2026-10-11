import assert from "node:assert/strict"
import test from "node:test"
import { importTS } from "./helpers/importTS.mjs"

const { calculateUmaRunningStyleStatistics } = await importTS(new URL("../src/Statistics/umaRunningStyleStatistics.ts", import.meta.url))
const { calculateUmaStatistics, formatUmaWinRate } = await importTS(new URL("../src/Statistics/umaStatistics.ts", import.meta.url))

const participant = (cmUmaId, style, umaId = "original") => ({ cmUmaId, umaId, style })
const attempt = (racesPlayed, results) => ({ day: 1, attempt: 1, racesPlayed, retired: false, umaWins: results.map(([cmUmaId, wins]) => ({ cmUmaId, wins })) })
const event = (participants, attempts, fields = {}) => ({ participants, attempts, currentLineup: [], ...fields })
const row = (stats, label) => stats.rows.find(row => row.label === label)

test("styles follow the actual participant used across CM events, with exact versions and weighted usage", () => {
  const cms = [
    event([participant("front", "Front Runner")], [attempt(20, [["front", 8]])]),
    event([participant("leader", "Pace Chaser"), participant("alternate", "End Closer", "christmas")], [attempt(140, [["leader", 95], ["alternate", 20]])]),
    event([participant("betweener", "Late Surger")], [attempt(40, [["betweener", 15]])]),
  ]
  const snapshot = structuredClone(cms)
  const stats = calculateUmaRunningStyleStatistics(cms, "original")
  assert.equal(stats.totalRaces, 200)
  assert.equal(stats.unknownStyleRaces, 0)
  assert.deepEqual(stats.rows.map(row => [row.label, row.races, row.wins, row.usage]), [["Front Runner", 20, 8, 10], ["Pace Chaser", 140, 95, 70], ["Late Surger", 40, 15, 20], ["End Closer", 0, 0, 0]])
  assert.equal(row(stats, "Pace Chaser").winRate, 95 / 140 * 100)
  assert.equal(row(stats, "End Closer").winRate, null)
  assert.equal(row(calculateUmaRunningStyleStatistics(cms, "christmas"), "End Closer").races, 140)
  assert.deepEqual(cms, snapshot)
})

test("missing, blank and unrecognized saved styles remain unknown and stay in the usage denominator", () => {
  const cms = [
    event([participant("known", "Pace Chaser")], [attempt(5, [["known", 2]])]),
    ...[undefined, "", "unknown"].map(style => event([participant("missing", style)], [attempt(5, [["missing", 1]])])),
  ]
  const stats = calculateUmaRunningStyleStatistics(cms, "original")
  assert.equal(stats.totalRaces, 20)
  assert.equal(stats.unknownStyleRaces, 15)
  assert.equal(row(stats, "Pace Chaser").races, 5)
  assert.equal(row(stats, "Pace Chaser").usage, 25)
  assert.equal(stats.rows.reduce((sum, row) => sum + row.races, 0), 5)
  assert.equal(stats.rows.reduce((sum, row) => sum + row.usage, 0), 25)
})

test("multiple references with the same style count each version race once and aggregate its wins", () => {
  const stats = calculateUmaRunningStyleStatistics([event([participant("a", "Front Runner"), participant("b", "Front Runner")], [attempt(5, [["a", 2], ["b", 1]])])], "original")
  assert.equal(stats.totalRaces, 5)
  assert.equal(row(stats, "Front Runner").races, 5)
  assert.equal(row(stats, "Front Runner").wins, 3)
  assert.equal(row(stats, "Front Runner").winRate, 60)
  assert.equal(row(stats, "Front Runner").usage, 100)
})

test("different recorded references support style changes between attempts but ambiguous simultaneous styles are excluded", () => {
  const stats = calculateUmaRunningStyleStatistics([event([participant("a", "Front Runner"), participant("b", "Pace Chaser")], [
    attempt(5, [["a", 2]]), attempt(5, [["b", 3]]), attempt(5, [["a", 1], ["b", 1]]),
  ])], "original")
  assert.equal(stats.totalRaces, 15)
  assert.equal(row(stats, "Front Runner").races, 5)
  assert.equal(row(stats, "Pace Chaser").races, 5)
  assert.equal(stats.unknownStyleRaces, 5)
  assert.equal(stats.rows.reduce((sum, row) => sum + row.races, 0) + stats.unknownStyleRaces, stats.totalRaces)
})

test("zero races, unrecorded lineup entries and final-only participation do not invent style rates", () => {
  const stats = calculateUmaRunningStyleStatistics([event([participant("a", "End Closer"), participant("b", "Front Runner", "other")], [attempt(5, [["b", 2]]), attempt(0, [["a", 0]])], { finalPlace: "1st" })], "original")
  assert.equal(stats.totalRaces, 0)
  assert.equal(stats.unknownStyleRaces, 0)
  assert.equal(stats.rows.length, 4)
  assert.ok(stats.rows.every(row => row.races === 0 && row.wins === 0 && row.winRate === null && row.usage === null))
  assert.deepEqual(calculateUmaRunningStyleStatistics([], "unused"), stats)
})

test("recorded Runaway races get a separate row without changing the four standard style totals", () => {
  const stats = calculateUmaRunningStyleStatistics([event([participant("a", "Runaway")], [attempt(5, [["a", 2]])]), event([participant("b", "Front Runner")], [attempt(5, [["b", 1]])])], "original")
  assert.equal(stats.rows.length, 5)
  assert.equal(row(stats, "Runaway").races, 5)
  assert.equal(row(stats, "Runaway").usage, 50)
  assert.equal(row(stats, "Front Runner").races, 5)
  assert.equal(row(stats, "Front Runner").usage, 50)
  assert.equal(stats.unknownStyleRaces, 0)
})

test("legacy and custom Uma IDs retain their own recorded style histories", () => {
  const cms = [event([participant("legacy", "Late Surger", "old-base-id"), participant("custom", "End Closer", "custom")], [attempt(5, [["legacy", 1], ["custom", 2]])])]
  assert.equal(row(calculateUmaRunningStyleStatistics(cms, "old-base-id"), "Late Surger").wins, 1)
  assert.equal(row(calculateUmaRunningStyleStatistics(cms, "custom"), "End Closer").wins, 2)
  assert.equal(calculateUmaRunningStyleStatistics(cms, "original").totalRaces, 0)
})

const recordedResult = (cmUmaId, umaVersionId, runningStyle, wins) => ({
  cmUmaId, wins,
  configuration: { umaVersionId, runningStyle, ace: false, debuffer: false, entrySource: "manual", configurationSource: "recorded" },
})
const recordedAttempt = (racesPlayed, umaWins) => ({ ...attempt(racesPlayed, []), umaWins })

test("global styles aggregate recorded participation counts, individual wins and weighted known-style usage", () => {
  const cms = [event([], [
    recordedAttempt(100, [recordedResult("a", "original", "pace_chaser", 60)]),
    recordedAttempt(50, [recordedResult("b", "alternate", "late_surger", 20)]),
  ])]
  const snapshot = structuredClone(cms)
  const stats = calculateUmaRunningStyleStatistics(cms)
  assert.equal(stats.totalRaces, 150)
  assert.equal(stats.unknownStyleRaces, 0)
  assert.deepEqual(stats.rows.map(row => row.label), ["Runaway", "Front Runner", "Pace Chaser", "Late Surger", "End Closer"])
  assert.deepEqual(row(stats, "Pace Chaser"), { style: "pace_chaser", label: "Pace Chaser", races: 100, wins: 60, winRate: 60, usage: 100 / 150 * 100 })
  assert.deepEqual(row(stats, "Late Surger"), { style: "late_surger", label: "Late Surger", races: 50, wins: 20, winRate: 40, usage: 50 / 150 * 100 })
  assert.equal(formatUmaWinRate(row(stats, "Pace Chaser").usage), "66.7%")
  assert.equal(formatUmaWinRate(row(stats, "Late Surger").usage), "33.3%")
  assert.deepEqual(cms, snapshot)
})

test("global and individual style counts share snapshots when one Uma changes style between attempts", () => {
  const cms = [event([{ ...participant("a", "Runaway"), runningStyle: "runaway" }], [
    recordedAttempt(20, [recordedResult("a", "original", "pace_chaser", 10)]),
    recordedAttempt(20, [recordedResult("a", "original", "end_closer", 8)]),
  ])]
  const stats = calculateUmaRunningStyleStatistics(cms)
  const individual = calculateUmaRunningStyleStatistics(cms, "original")
  assert.deepEqual([row(stats, "Pace Chaser").races, row(stats, "Pace Chaser").wins], [20, 10])
  assert.deepEqual([row(stats, "End Closer").races, row(stats, "End Closer").wins], [20, 8])
  assert.equal(row(stats, "Runaway").races, 0)
  for (const label of ["Pace Chaser", "End Closer"]) assert.deepEqual(row(stats, label), row(individual, label))
  cms[0].participants = [{ ...participant("a", "Front Runner", "changed-version"), runningStyle: "front_runner" }]
  assert.deepEqual(calculateUmaRunningStyleStatistics(cms), stats)
  cms[0].participants = []
  assert.deepEqual(calculateUmaRunningStyleStatistics(cms), stats)
})

test("global usage excludes null and missing snapshots without borrowing current or final styles", () => {
  const cms = [event([{ ...participant("a", "Front Runner"), runningStyle: "front_runner" }], [
    recordedAttempt(20, [recordedResult("a", "original", "pace_chaser", 10)]),
    recordedAttempt(20, [recordedResult("a", "original", null, 8)]),
    attempt(20, [["a", 6]]),
  ], { finalPlace: "1st", finalResults: [{ ...recordedResult("a", "original", "runaway", 0), placement: "first", won: true }] })]
  const stats = calculateUmaRunningStyleStatistics(cms)
  assert.equal(stats.totalRaces, 60)
  assert.equal(stats.unknownStyleRaces, 40)
  assert.equal(row(stats, "Pace Chaser").races, 20)
  assert.equal(row(stats, "Pace Chaser").wins, 10)
  assert.equal(row(stats, "Pace Chaser").usage, 100)
  assert.equal(row(stats, "Front Runner").races, 0)
  assert.equal(row(stats, "Runaway").races, 0)
  assert.equal(stats.rows.reduce((sum, row) => sum + row.usage, 0), 100)
})

test("one team race contributes one participation to every recorded Uma style without copying team wins", () => {
  const cms = [event([], [recordedAttempt(1, [
    recordedResult("a", "one", "pace_chaser", 1),
    recordedResult("b", "two", "late_surger", 0),
    recordedResult("c", "three", "end_closer", 0),
  ])])]
  const stats = calculateUmaRunningStyleStatistics(cms)
  assert.equal(calculateUmaStatistics(cms, [], []).overall.races, 1)
  assert.equal(stats.totalRaces, 3)
  assert.deepEqual(["Pace Chaser", "Late Surger", "End Closer"].map(label => [row(stats, label).races, row(stats, label).wins]), [[1, 1], [1, 0], [1, 0]])
  assert.equal(row(stats, "Pace Chaser").usage, 1 / 3 * 100)
})

test("global empty and unused styles retain five rows with unavailable win rates and zero usage", () => {
  for (const cms of [[], [event([], [recordedAttempt(0, [recordedResult("a", "original", "runaway", 0)])])], [event([], [], { finalPlace: "1st", finalResults: [recordedResult("a", "original", "runaway", 0)] })]]) {
    const stats = calculateUmaRunningStyleStatistics(cms)
    assert.equal(stats.rows.length, 5)
    assert.equal(stats.totalRaces, 0)
    assert.ok(stats.rows.every(row => row.races === 0 && row.wins === 0 && row.winRate === null && row.usage === 0))
    assert.ok(stats.rows.every(row => formatUmaWinRate(row.winRate) === "—" && formatUmaWinRate(row.usage) === "0.0%"))
  }
  const stats = calculateUmaRunningStyleStatistics([event([], [recordedAttempt(5, [recordedResult("a", "original", "pace_chaser", 2)])])])
  assert.ok(stats.rows.filter(row => row.style !== "pace_chaser").every(row => row.races === 0 && row.wins === 0 && row.winRate === null && row.usage === 0))
})

test("global duplicate and ambiguous version references retain the detailed counting rules", () => {
  const cms = [event([], [recordedAttempt(5, [
    recordedResult("a", "original", "pace_chaser", 2), recordedResult("b", "original", "pace_chaser", 1),
    recordedResult("c", "alternate", "late_surger", 1),
  ])])]
  const stats = calculateUmaRunningStyleStatistics(cms)
  assert.equal(stats.totalRaces, 10)
  assert.equal(row(stats, "Pace Chaser").races, 5)
  assert.equal(row(stats, "Pace Chaser").wins, 3)
  for (const [id, label] of [["original", "Pace Chaser"], ["alternate", "Late Surger"]]) {
    const individual = calculateUmaRunningStyleStatistics(cms, id)
    assert.deepEqual([row(stats, label).races, row(stats, label).wins, row(stats, label).winRate], [row(individual, label).races, row(individual, label).wins, row(individual, label).winRate])
  }
  cms[0].attempts[0].umaWins[1].configuration.runningStyle = "end_closer"
  const ambiguous = calculateUmaRunningStyleStatistics(cms)
  assert.equal(ambiguous.unknownStyleRaces, 5)
  assert.equal(row(ambiguous, "Pace Chaser").races, 0)
  assert.equal(row(ambiguous, "End Closer").races, 0)
  assert.equal(row(ambiguous, "Late Surger").usage, 100)
})

test("saved inferred styles, unresolved identities and retired attempts remain usable globally", () => {
  const result = recordedResult("removed", null, "runaway", 2)
  result.configuration.configurationSource = "legacy_inferred"
  const stats = calculateUmaRunningStyleStatistics([event([], [{ ...recordedAttempt(5, [result]), retired: true }, recordedAttempt(NaN, [result]), recordedAttempt(Infinity, [result])])])
  assert.equal(stats.totalRaces, 5)
  assert.equal(stats.unknownStyleRaces, 0)
  assert.deepEqual(row(stats, "Runaway"), { style: "runaway", label: "Runaway", races: 5, wins: 2, winRate: 40, usage: 100 })
})
