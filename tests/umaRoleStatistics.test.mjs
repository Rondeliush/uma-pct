import assert from "node:assert/strict"
import test from "node:test"
import { importTS } from "./helpers/importTS.mjs"

const { calculateUmaRoleStatistics } = await importTS(new URL("../src/Statistics/umaRoleStatistics.ts", import.meta.url))
const { calculateUmaRunningStyleStatistics } = await importTS(new URL("../src/Statistics/umaRunningStyleStatistics.ts", import.meta.url))
const { calculateUmaDetailStatistics } = await importTS(new URL("../src/Statistics/umaDetailStatistics.ts", import.meta.url))
const { calculateUmaStatistics, formatUmaWinRate } = await importTS(new URL("../src/Statistics/umaStatistics.ts", import.meta.url))

const configuration = (ace, debuffer, fields = {}) => ({ umaVersionId: "original", runningStyle: "front_runner", ace, debuffer, entrySource: "manual", configurationSource: "recorded", ...fields })
const result = (configuration, wins = 0, cmUmaId = "a") => ({ cmUmaId, wins, configuration })
const attempt = (racesPlayed, umaWins, fields = {}) => ({ day: 1, attempt: 1, racesPlayed, retired: false, umaWins, ...fields })
const participant = (fields = {}) => ({ cmUmaId: "a", umaId: "original", runningStyle: "end_closer", ace: false, debuffer: false, autoRun: false, finalParticipant: false, won: false, ...fields })
const event = (attempts, fields = {}) => ({ number: 1, name: "Role check", distance: 2000, length: "Medium", surface: "Turf", finalPlace: "", participants: [participant()], attempts, ...fields })
const row = (stats, role) => stats.rows.find(row => row.role === role)

test("four exclusive role configurations use weighted round races and preserve existing totals", () => {
  const cms = [event([
    attempt(40, [result(configuration(false, false), 5)]),
    attempt(120, [result(configuration(true, false), 70)]),
    attempt(20, [result(configuration(false, true), 4)]),
    attempt(20, [result(configuration(true, true), 3)]),
    attempt(50, [result(configuration(true, false, { umaVersionId: "alternate" }), 10)]),
  ])]
  const before = structuredClone(cms)
  const styles = calculateUmaRunningStyleStatistics(cms, "original")
  const details = calculateUmaDetailStatistics(cms, "original")
  const overview = calculateUmaStatistics(cms, [], [])
  const stats = calculateUmaRoleStatistics(cms, "original")
  assert.equal(stats.totalRaces, 200)
  assert.equal(stats.unknownRoleRaces, 0)
  assert.deepEqual(stats.rows.map(row => [row.label, row.races, row.wins, row.usage]), [
    ["No Role", 40, 5, 20], ["Ace", 120, 70, 60], ["Debuffer", 20, 4, 10], ["Ace + Debuffer", 20, 3, 10],
  ])
  assert.equal(row(stats, "ace").winRate, 70 / 120 * 100)
  assert.equal(stats.totalRaces, styles.totalRaces)
  assert.equal(stats.totalRaces, details.races)
  assert.equal(stats.rows.reduce((sum, row) => sum + row.wins, 0), details.wins)
  assert.equal(calculateUmaRoleStatistics(cms, "alternate").totalRaces, 50)
  assert.deepEqual(calculateUmaRunningStyleStatistics(cms, "original"), styles)
  assert.deepEqual(calculateUmaDetailStatistics(cms, "original"), details)
  assert.deepEqual(calculateUmaStatistics(cms, [], []), overview)
  assert.deepEqual(cms, before)
})

test("null or partially unknown snapshot flags are Unknown and remain in the usage denominator", () => {
  const unknown = [[null, null], [null, false], [false, null], [true, null], [null, true]]
  const stats = calculateUmaRoleStatistics([event([
    attempt(5, [result(configuration(false, false), 2)]),
    ...unknown.map(([ace, debuffer]) => attempt(5, [result(configuration(ace, debuffer), 1)])),
  ])], "original")
  assert.equal(stats.totalRaces, 30)
  assert.equal(stats.unknownRoleRaces, 25)
  assert.equal(row(stats, "no_special_role").races, 5)
  assert.equal(row(stats, "no_special_role").wins, 2)
  assert.equal(row(stats, "unknown").wins, 5)
  assert.equal(row(stats, "unknown").winRate, 20)
  assert.equal(row(stats, "unknown").usage, 25 / 30 * 100)
  assert.equal(stats.rows.reduce((sum, row) => sum + row.races, 0), stats.totalRaces)
  assert.ok(Math.abs(stats.rows.reduce((sum, row) => sum + row.usage, 0) - 100) < 1e-10)
})

test("snapshot roles and exact versions survive edits or removal of current participants", () => {
  const cms = [event([
    attempt(10, [result(configuration(true, false), 4)]),
    attempt(5, [result(configuration(false, true), 1)]),
    attempt(5, [result(configuration(null, null), 2)]),
    attempt(5, [result(configuration(true, true, { umaVersionId: null }), 1)]),
  ], { participants: [participant({ umaId: "alternate", ace: false, debuffer: false })] })]
  const stats = calculateUmaRoleStatistics(cms, "original")
  assert.equal(stats.totalRaces, 20)
  assert.equal(row(stats, "ace").races, 10)
  assert.equal(row(stats, "debuffer").races, 5)
  assert.equal(row(stats, "unknown").races, 5)
  assert.equal(row(stats, "no_special_role").races, 0)
  assert.equal(calculateUmaRoleStatistics(cms, "alternate").totalRaces, 0)
  cms[0].participants = []
  assert.deepEqual(calculateUmaRoleStatistics(cms, "original"), stats)
})

test("duplicate references with the same roles count each version race once and aggregate wins", () => {
  const stats = calculateUmaRoleStatistics([event([attempt(5, [
    result(configuration(true, true), 2, "a"),
    result(configuration(true, true, { entrySource: "autorun", runningStyle: "pace_chaser", configurationSource: "legacy_inferred" }), 1, "b"),
  ])])], "original")
  assert.equal(stats.totalRaces, 5)
  assert.equal(row(stats, "ace_debuffer").races, 5)
  assert.equal(row(stats, "ace_debuffer").wins, 3)
  assert.equal(row(stats, "ace_debuffer").winRate, 60)
  assert.equal(row(stats, "ace_debuffer").usage, 100)
  assert.equal(stats.unknownRoleRaces, 0)
})

test("conflicting simultaneous roles stay Unknown instead of splitting or duplicating a batch", () => {
  const stats = calculateUmaRoleStatistics([event([
    attempt(5, [result(configuration(true, false), 1, "a"), result(configuration(false, true), 2, "b")]),
    attempt(5, [result(configuration(false, false), 1, "a"), result(configuration(null, false), 1, "b")]),
    attempt(5, [result(configuration(true, false), 3)]),
  ])], "original")
  assert.equal(stats.totalRaces, 15)
  assert.equal(stats.unknownRoleRaces, 10)
  assert.equal(row(stats, "unknown").wins, 5)
  assert.equal(row(stats, "ace").races, 5)
  assert.equal(row(stats, "no_special_role").races, 0)
  assert.equal(row(stats, "debuffer").races, 0)
  assert.equal(stats.rows.reduce((sum, row) => sum + row.races, 0), 15)
})

test("legacy role metadata uses explicit flags and never defaults missing flags to No Role", () => {
  const cms = [
    ...[{}, { ace: false }, { debuffer: false }, { ace: true }].map(flags => event([attempt(5, [{ cmUmaId: "a", wins: 1 }])], { participants: [participant({ ace: undefined, debuffer: undefined, ...flags })] })),
    event([attempt(5, [{ cmUmaId: "a", wins: 2 }])], { participants: [participant()] }),
  ]
  const stats = calculateUmaRoleStatistics(cms, "original")
  assert.equal(stats.totalRaces, 25)
  assert.equal(stats.unknownRoleRaces, 20)
  assert.equal(row(stats, "no_special_role").races, 5)
  assert.equal(row(stats, "no_special_role").usage, 20)
  assert.equal(row(stats, "unknown").usage, 80)
})

test("zero races, unrecorded lineups and final-only participation do not invent roles or rates", () => {
  const cms = [event([
    attempt(0, [result(configuration(null, null))]),
    attempt(5, [result(configuration(true, true, { umaVersionId: "other" }), 2)]),
  ], { finalPlace: "1st", participants: [participant({ finalParticipant: true, won: true })], finalResults: [{ cmUmaId: "a", won: true, configuration: configuration(true, false) }] })]
  const stats = calculateUmaRoleStatistics(cms, "original")
  assert.equal(stats.totalRaces, 0)
  assert.equal(stats.unknownRoleRaces, 0)
  assert.equal(stats.rows.length, 4)
  assert.ok(stats.rows.every(row => row.races === 0 && row.wins === 0 && row.winRate === null && row.usage === null))
  assert.deepEqual(stats, calculateUmaRoleStatistics([], "unused"))
})

test("retired batches retain only their recorded races and invalid race counts add no Unknown row", () => {
  const stats = calculateUmaRoleStatistics([event([
    attempt(2, [result(configuration(false, true), 1)], { retired: true }),
    ...[NaN, Infinity, -5].map(races => attempt(races, [result(configuration(null, null), 0)])),
  ])], "original")
  assert.equal(stats.totalRaces, 2)
  assert.equal(row(stats, "debuffer").wins, 1)
  assert.equal(row(stats, "debuffer").winRate, 50)
  assert.equal(stats.rows.length, 4)
})

test("unresolved and custom version IDs keep distinct role histories", () => {
  const cms = [event([attempt(5, [
    result(configuration(true, false, { umaVersionId: "legacy-base" }), 1),
    result(configuration(false, true, { umaVersionId: "custom" }), 2, "b"),
  ])], { participants: [] })]
  assert.equal(row(calculateUmaRoleStatistics(cms, "legacy-base"), "ace").wins, 1)
  assert.equal(row(calculateUmaRoleStatistics(cms, "custom"), "debuffer").wins, 2)
  assert.equal(calculateUmaRoleStatistics(cms, "original").totalRaces, 0)
})

test("global roles retain all four categories with weighted wins, rates and known-role usage", () => {
  const cms = [event([
    attempt(40, [result(configuration(false, false), 10)]),
    attempt(100, [result(configuration(true, false), 60)]),
    attempt(40, [result(configuration(false, true), 5)]),
    attempt(20, [result(configuration(true, true), 8)]),
  ])]
  const before = structuredClone(cms)
  const styles = calculateUmaRunningStyleStatistics(cms)
  const overview = calculateUmaStatistics(cms, [], [])
  const stats = calculateUmaRoleStatistics(cms)
  assert.equal(stats.totalRaces, 200)
  assert.equal(stats.unknownRoleRaces, 0)
  assert.deepEqual(stats.rows.map(row => [row.label, row.races, row.wins, formatUmaWinRate(row.winRate), formatUmaWinRate(row.usage)]), [
    ["No Role", 40, 10, "25.0%", "20.0%"], ["Ace", 100, 60, "60.0%", "50.0%"],
    ["Debuffer", 40, 5, "12.5%", "20.0%"], ["Ace + Debuffer", 20, 8, "40.0%", "10.0%"],
  ])
  assert.deepEqual(stats, calculateUmaRoleStatistics(cms, "original"))
  assert.equal(stats.rows.reduce((sum, row) => sum + row.usage, 0), 100)
  assert.deepEqual(calculateUmaRunningStyleStatistics(cms), styles)
  assert.deepEqual(calculateUmaStatistics(cms, [], []), overview)
  assert.deepEqual(cms, before)
})

test("global roles count each Uma's participations and wins, keeping Ace + Debuffer exclusive", () => {
  const cms = [event([attempt(20, [
    result(configuration(true, true, { runningStyle: null }), 10, "a"),
    result(configuration(true, false, { umaVersionId: "alternate" }), 4, "b"),
    result(configuration(false, false, { umaVersionId: "third" }), 1, "c"),
  ])])]
  const stats = calculateUmaRoleStatistics(cms)
  assert.equal(calculateUmaStatistics(cms, [], []).overall.races, 20)
  assert.equal(stats.totalRaces, 60)
  assert.equal(row(stats, "ace_debuffer").races, 20)
  assert.equal(row(stats, "ace_debuffer").wins, 10)
  assert.equal(row(stats, "ace").races, 20)
  assert.equal(row(stats, "ace").wins, 4)
  assert.equal(row(stats, "no_special_role").races, 20)
  assert.equal(row(stats, "no_special_role").wins, 1)
  assert.equal(row(stats, "debuffer").races, 0)
  assert.equal(row(stats, "ace_debuffer").usage, 1 / 3 * 100)
  assert.ok(Math.abs(stats.rows.reduce((sum, row) => sum + row.usage, 0) - 100) < 1e-10)
})

test("global roles exclude fully unknown, partially unknown and absent snapshots from known-role usage", () => {
  const unknown = [[null, null], [null, false], [false, null], [true, null], [null, true], [undefined, false], [false, undefined]]
  const cms = [event([
    attempt(20, [result(configuration(true, false), 10)]),
    ...unknown.map(([ace, debuffer]) => attempt(20, [result(configuration(ace, debuffer), 3)])),
    attempt(20, [{ cmUmaId: "a", wins: 2 }]),
  ], { participants: [participant({ ace: true, debuffer: false })], finalPlace: "1st",
    finalResults: [{ cmUmaId: "a", won: true, configuration: configuration(true, true) }] })]
  const stats = calculateUmaRoleStatistics(cms)
  assert.equal(stats.totalRaces, 180)
  assert.equal(stats.unknownRoleRaces, 160)
  assert.equal(stats.rows.length, 4)
  assert.equal(row(stats, "ace").races, 20)
  assert.equal(row(stats, "ace").wins, 10)
  assert.equal(row(stats, "ace").usage, 100)
  assert.equal(row(stats, "no_special_role").races, 0)
  assert.equal(row(stats, "debuffer").races, 0)
  assert.equal(row(stats, "ace_debuffer").races, 0)
  assert.equal(row(stats, "unknown"), undefined)
})

test("global and individual role counts follow historical changes instead of current participant settings", () => {
  const cms = [event([
    attempt(20, [result(configuration(true, false), 10)]),
    attempt(20, [result(configuration(false, false), 6)]),
  ], { participants: [participant({ ace: false, debuffer: true })] })]
  const stats = calculateUmaRoleStatistics(cms)
  assert.deepEqual([row(stats, "ace").races, row(stats, "ace").wins], [20, 10])
  assert.deepEqual([row(stats, "no_special_role").races, row(stats, "no_special_role").wins], [20, 6])
  assert.equal(row(stats, "debuffer").races, 0)
  assert.deepEqual(stats, calculateUmaRoleStatistics(cms, "original"))
  cms[0].participants = [participant({ umaId: "changed-version", ace: true, debuffer: true })]
  assert.deepEqual(calculateUmaRoleStatistics(cms), stats)
  cms[0].participants = []
  assert.deepEqual(calculateUmaRoleStatistics(cms), stats)
})

test("global empty and unused role categories show zero counts, unavailable win rates and zero usage", () => {
  for (const cms of [[], [event([attempt(0, [result(configuration(true, false))])])], [event([], { finalPlace: "1st", finalResults: [{ cmUmaId: "a", won: true, configuration: configuration(true, true) }] })], [event([attempt(20, [result(configuration(null, null), 2)])])]]) {
    const stats = calculateUmaRoleStatistics(cms)
    assert.deepEqual(stats.rows.map(row => row.label), ["No Role", "Ace", "Debuffer", "Ace + Debuffer"])
    assert.ok(stats.rows.every(row => row.races === 0 && row.wins === 0 && row.winRate === null && row.usage === 0))
    assert.ok(stats.rows.every(row => formatUmaWinRate(row.winRate) === "—" && formatUmaWinRate(row.usage) === "0.0%"))
  }
  const stats = calculateUmaRoleStatistics([event([attempt(20, [result(configuration(true, false), 10)])])])
  assert.ok(stats.rows.filter(row => row.role !== "ace").every(row => row.races === 0 && row.wins === 0 && row.winRate === null && row.usage === 0))
})

test("global duplicate and conflicting role references preserve individual version-level batch accounting", () => {
  const cms = [event([attempt(5, [
    result(configuration(true, true), 2, "a"), result(configuration(true, true), 1, "b"),
    result(configuration(true, false, { umaVersionId: "alternate" }), 1, "c"),
  ])])]
  const stats = calculateUmaRoleStatistics(cms)
  assert.equal(stats.totalRaces, 10)
  assert.equal(row(stats, "ace_debuffer").races, 5)
  assert.equal(row(stats, "ace_debuffer").wins, 3)
  for (const [id, roleName] of [["original", "ace_debuffer"], ["alternate", "ace"]]) {
    const individual = calculateUmaRoleStatistics(cms, id)
    assert.deepEqual([row(stats, roleName).races, row(stats, roleName).wins, row(stats, roleName).winRate], [row(individual, roleName).races, row(individual, roleName).wins, row(individual, roleName).winRate])
  }
  cms[0].attempts[0].umaWins[1].configuration = configuration(false, false)
  const conflicting = calculateUmaRoleStatistics(cms)
  assert.equal(conflicting.unknownRoleRaces, 5)
  assert.equal(row(conflicting, "ace_debuffer").races, 0)
  assert.equal(row(conflicting, "no_special_role").races, 0)
  assert.equal(row(conflicting, "ace").usage, 100)
})

test("global saved legacy roles and unresolved identities retain separate recorded participations", () => {
  const results = [
    result(configuration(true, false, { umaVersionId: null, configurationSource: "legacy_inferred" }), 2, "a"),
    result(configuration(false, true, { umaVersionId: null }), 1, "b"),
  ]
  const stats = calculateUmaRoleStatistics([event([
    attempt(5, results, { retired: true }), ...[NaN, Infinity, -5].map(races => attempt(races, results)),
  ], { participants: [] })])
  assert.equal(stats.totalRaces, 10)
  assert.equal(stats.unknownRoleRaces, 0)
  assert.equal(row(stats, "ace").races, 5)
  assert.equal(row(stats, "ace").wins, 2)
  assert.equal(row(stats, "debuffer").races, 5)
  assert.equal(row(stats, "debuffer").wins, 1)
})
