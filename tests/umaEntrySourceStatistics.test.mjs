import assert from "node:assert/strict"
import test from "node:test"
import { importTS } from "./helpers/importTS.mjs"

const { calculateUmaEntrySourceStatistics } = await importTS(new URL("../src/Statistics/umaEntrySourceStatistics.ts", import.meta.url))
const { calculateUmaRunningStyleStatistics } = await importTS(new URL("../src/Statistics/umaRunningStyleStatistics.ts", import.meta.url))
const { calculateUmaRoleStatistics } = await importTS(new URL("../src/Statistics/umaRoleStatistics.ts", import.meta.url))
const { calculateUmaDetailStatistics } = await importTS(new URL("../src/Statistics/umaDetailStatistics.ts", import.meta.url))

const configuration = (entrySource, fields = {}) => ({ umaVersionId: "original", runningStyle: "front_runner", ace: false, debuffer: false, entrySource, configurationSource: "recorded", ...fields })
const result = (entrySource, wins = 0, cmUmaId = "a", fields = {}) => ({ cmUmaId, wins, configuration: configuration(entrySource, fields) })
const attempt = (racesPlayed, umaWins, fields = {}) => ({ day: 1, attempt: 1, racesPlayed, retired: false, umaWins, ...fields })
const participant = (fields = {}) => ({ cmUmaId: "a", umaId: "original", runningStyle: "end_closer", ace: false, debuffer: false, autoRun: false, finalParticipant: false, won: false, ...fields })
const event = (attempts, fields = {}) => ({ number: 1, name: "Entry source check", distance: 2000, length: "Medium", surface: "Turf", finalPlace: "", participants: [participant()], attempts, ...fields })
const row = (stats, source) => stats.rows.find(row => row.source === source)

test("Manual and AutoRun use weighted source-attributed races without changing other breakdowns", () => {
  const cms = [event([
    attempt(120, [result("manual", 70)]),
    attempt(80, [result("autorun", 48)]),
    attempt(40, [result("manual", 10, "alternate", { umaVersionId: "alternate" })]),
  ])]
  const before = structuredClone(cms)
  const styles = calculateUmaRunningStyleStatistics(cms, "original")
  const roles = calculateUmaRoleStatistics(cms, "original")
  const details = calculateUmaDetailStatistics(cms, "original")
  const stats = calculateUmaEntrySourceStatistics(cms, "original")
  assert.deepEqual(stats.rows.map(row => [row.label, row.races, row.wins, row.usage]), [
    ["Manual", 120, 70, 60], ["AutoRun", 80, 48, 40],
  ])
  assert.equal(row(stats, "manual").winRate, 70 / 120 * 100)
  assert.equal(row(stats, "autorun").winRate, 60)
  assert.equal(stats.totalRaces, 200)
  assert.equal(stats.attributedRaces, 200)
  assert.equal(stats.unknownSourceRaces, 0)
  assert.equal(stats.totalRaces, styles.totalRaces)
  assert.equal(stats.totalRaces, roles.totalRaces)
  assert.equal(stats.totalRaces, details.races)
  assert.equal(stats.rows.reduce((sum, row) => sum + row.wins, 0), details.wins)
  assert.deepEqual(calculateUmaRunningStyleStatistics(cms, "original"), styles)
  assert.deepEqual(calculateUmaRoleStatistics(cms, "original"), roles)
  assert.deepEqual(calculateUmaDetailStatistics(cms, "original"), details)
  assert.deepEqual(cms, before)
})

test("unknown sources are excluded from Usage while retaining their races and wins separately", () => {
  const stats = calculateUmaEntrySourceStatistics([event([
    attempt(120, [result("manual", 70)]),
    attempt(80, [result("autorun", 48)]),
    attempt(100, [result(null, 25)]),
  ])], "original")
  assert.equal(stats.totalRaces, 300)
  assert.equal(stats.attributedRaces, 200)
  assert.equal(stats.unknownSourceRaces, 100)
  assert.equal(stats.unknownSourceWins, 25)
  assert.equal(row(stats, "manual").races, 120)
  assert.equal(row(stats, "manual").usage, 60)
  assert.equal(row(stats, "autorun").usage, 40)
  assert.equal(stats.rows.reduce((sum, row) => sum + row.races, 0) + stats.unknownSourceRaces, stats.totalRaces)
  assert.equal(stats.rows.length, 2)
})

test("historical sources and exact version IDs override changed or removed current participants", () => {
  const cms = [event([
    attempt(5, [result("manual", 2)]),
    attempt(5, [result("autorun", 3)]),
    attempt(5, [result(null, 1)]),
    attempt(5, [result("autorun", 1, "a", { umaVersionId: null })]),
  ], { participants: [participant({ umaId: "alternate", autoRun: true })] })]
  const stats = calculateUmaEntrySourceStatistics(cms, "original")
  assert.equal(stats.totalRaces, 15)
  assert.equal(row(stats, "manual").races, 5)
  assert.equal(row(stats, "autorun").races, 5)
  assert.equal(stats.unknownSourceRaces, 5)
  assert.equal(calculateUmaEntrySourceStatistics(cms, "alternate").totalRaces, 0)
  cms[0].participants[0].autoRun = false
  assert.deepEqual(calculateUmaEntrySourceStatistics(cms, "original"), stats)
  cms[0].participants = []
  assert.deepEqual(calculateUmaEntrySourceStatistics(cms, "original"), stats)
})

test("missing snapshots never infer Manual or AutoRun from current participant flags", () => {
  const cms = [false, true].map(autoRun => event([attempt(5, [{ cmUmaId: "a", wins: 1 }])], { participants: [participant({ autoRun })] }))
  const stats = calculateUmaEntrySourceStatistics(cms, "original")
  assert.equal(stats.totalRaces, 10)
  assert.equal(stats.attributedRaces, 0)
  assert.equal(stats.unknownSourceRaces, 10)
  assert.equal(stats.unknownSourceWins, 2)
  assert.ok(stats.rows.every(row => row.races === 0 && row.wins === 0 && row.winRate === null && row.usage === null))
})

test("same-source duplicate references count a version's races once and aggregate wins", () => {
  const stats = calculateUmaEntrySourceStatistics([event([attempt(5, [
    result("autorun", 2, "a"),
    result("autorun", 1, "b", { ace: true, debuffer: true, runningStyle: "pace_chaser", configurationSource: "legacy_inferred" }),
  ])])], "original")
  assert.equal(stats.totalRaces, 5)
  assert.equal(row(stats, "autorun").races, 5)
  assert.equal(row(stats, "autorun").wins, 3)
  assert.equal(row(stats, "autorun").winRate, 60)
  assert.equal(row(stats, "autorun").usage, 100)
  assert.equal(row(stats, "manual").usage, 0)
})

test("conflicting or partially unknown simultaneous sources do not split or duplicate batches", () => {
  const cms = [event([
    attempt(5, [result("manual", 1, "a"), result("autorun", 2, "b")]),
    attempt(5, [result("manual", 1, "a"), result(null, 1, "b")]),
    attempt(5, [result("manual", 2)]),
  ])]
  const stats = calculateUmaEntrySourceStatistics(cms, "original")
  assert.equal(stats.totalRaces, 15)
  assert.equal(stats.attributedRaces, 5)
  assert.equal(stats.unknownSourceRaces, 10)
  assert.equal(stats.unknownSourceWins, 5)
  assert.equal(row(stats, "manual").races, 5)
  assert.equal(row(stats, "manual").usage, 100)
  assert.equal(row(stats, "autorun").races, 0)
  assert.equal(stats.rows.reduce((sum, row) => sum + row.wins, 0) + stats.unknownSourceWins, calculateUmaDetailStatistics(cms, "original").wins)
})

test("empty, zero-race and final-only records never invent sources or usage", () => {
  const cms = [event([
    attempt(0, [result(null)]),
    attempt(5, [result("manual", 2, "other", { umaVersionId: "other" })]),
  ], { finalPlace: "1st", participants: [participant({ finalParticipant: true, won: true, autoRun: true })], finalResults: [{ cmUmaId: "a", won: true, configuration: configuration("autorun") }] })]
  const stats = calculateUmaEntrySourceStatistics(cms, "original")
  assert.deepEqual(stats, calculateUmaEntrySourceStatistics([], "unused"))
  assert.equal(stats.totalRaces, 0)
  assert.equal(stats.unknownSourceRaces, 0)
  assert.ok(stats.rows.every(row => row.races === 0 && row.wins === 0 && row.winRate === null && row.usage === null))
})

test("retired attempts keep their recorded races and invalid race counts are ignored", () => {
  const stats = calculateUmaEntrySourceStatistics([event([
    attempt(2, [result("manual", 1)], { retired: true }),
    ...[NaN, Infinity, -5].map(races => attempt(races, [result(null)])),
  ])], "original")
  assert.equal(stats.totalRaces, 2)
  assert.equal(stats.attributedRaces, 2)
  assert.equal(row(stats, "manual").winRate, 50)
  assert.equal(row(stats, "manual").usage, 100)
  assert.equal(stats.unknownSourceRaces, 0)
})
