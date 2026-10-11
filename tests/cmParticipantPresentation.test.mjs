import assert from "node:assert/strict"
import test from "node:test"
import { importTS } from "./helpers/importTS.mjs"

const { getHistoricalParticipantEntries, getParticipantConfigurationKey } =
  await importTS(new URL("../src/CMs/cmParticipantPresentation.ts", import.meta.url))
const { runningStyleVisuals, getRunningStyleVisual } = await importTS(new URL("../src/CMs/runningStyleVisuals.ts", import.meta.url))
const { getUmaRunningStyleDisplayRows } = await importTS(new URL("../src/Statistics/umaRunningStylePresentation.ts", import.meta.url))
const { calculateUmaRunningStyleStatistics } = await importTS(new URL("../src/Statistics/umaRunningStyleStatistics.ts", import.meta.url))

const configuration = (fields = {}) => ({ umaVersionId: "oguri-christmas", runningStyle: "pace_chaser", ace: true,
  debuffer: false, entrySource: "manual", configurationSource: "recorded", ...fields })
const result = (wins, config = configuration(), cmUmaId = "oguri") => ({ cmUmaId, wins, configuration: config })
const attempt = (racesPlayed, ...umaWins) => ({ day: 1, attempt: 1, retired: false, racesPlayed, umaWins })
const cm = (...attempts) => ({ attempts, participants: [], finalPlace: "" })

test("same version and exact historical configuration aggregate several attempts into one card", () => {
  const original = cm(attempt(5, result(3)), attempt(5, result(4)))
  const before = structuredClone(original)
  const cards = getHistoricalParticipantEntries(original)
  assert.equal(cards.length, 1)
  assert.deepEqual([cards[0].races, cards[0].wins, cards[0].winRate], [10, 7, 70])
  assert.deepEqual(original, before)
})

test("style, each role flag, and entry source independently split the same Uma into historical cards", () => {
  const configs = [configuration(), configuration({ runningStyle: "end_closer" }),
    configuration({ ace: false, debuffer: true }), configuration({ debuffer: true }),
    configuration({ entrySource: "autorun" })]
  const cards = getHistoricalParticipantEntries(cm(...configs.map((config, i) => attempt(5, result(i, config)))))
  assert.equal(cards.length, 5)
  assert.deepEqual(cards.map(({ races, wins, configuration }) => [races, wins, configuration]),
    configs.map((config, i) => [5, i, config]))
  assert.equal(cards.reduce((total, card) => total + card.races, 0), 25)
  assert.equal(cards.reduce((total, card) => total + card.wins, 0), 10)
})

test("recorded and legacy-inferred snapshots with the same configuration share one card", () => {
  const cards = getHistoricalParticipantEntries(cm(attempt(5, result(3, configuration({ configurationSource: "legacy_inferred" }))),
    attempt(5, result(4))))
  assert.equal(cards.length, 1)
  assert.equal(cards[0].races, 10)
  assert.equal(cards[0].wins, 7)
  assert.equal(cards[0].hasRecordedConfiguration, true)
  assert.equal(cards[0].hasInferredConfiguration, true)
})

test("later current participant version, style and role changes never reinterpret historical cards", () => {
  const original = cm(attempt(5, result(3)), attempt(5, result(4, configuration({ runningStyle: "end_closer" }))))
  const cards = getHistoricalParticipantEntries(original)
  original.participants = [{ cmUmaId: "oguri", umaId: "different-version", runningStyle: "front_runner", ace: false, debuffer: true }]
  assert.deepEqual(getHistoricalParticipantEntries(original), cards)
  assert.deepEqual(cards.map((card) => card.configuration.runningStyle), ["pace_chaser", "end_closer"])
})

test("unknown flags stay separate from false flags or Manual, and null style never inherits current style", () => {
  const configs = [configuration({ runningStyle: null }), configuration({ ace: null }),
    configuration({ debuffer: null }), configuration({ entrySource: null }), configuration({ ace: false })]
  const cards = getHistoricalParticipantEntries(cm(...configs.map((config) => attempt(5, result(1, config)))))
  assert.equal(cards.length, 5)
  assert.deepEqual(cards.map((card) => card.configuration), configs)
  assert.equal(getRunningStyleVisual(null).label, "Unknown style")
  assert.equal(getRunningStyleVisual(null).abbreviation, "")
})

test("exact version IDs remain distinct, including unavailable and null version references", () => {
  const ids = ["oguri-christmas", "oguri-original", "unavailable-version", null]
  const cards = getHistoricalParticipantEntries(cm(...ids.map((umaVersionId) => attempt(5, result(1, configuration({ umaVersionId }))))))
  assert.deepEqual(cards.map((card) => card.configuration.umaVersionId), ids)
  assert.equal(cards.length, 4)
  assert.notEqual(getParticipantConfigurationKey(configuration({ umaVersionId: null })),
    getParticipantConfigurationKey(configuration({ umaVersionId: "null" })))
})

test("final snapshots retain the existing extra-race convention and use their own configuration", () => {
  const original = cm(attempt(5, result(3)))
  original.finalPlace = "1st"
  original.finalResults = [{ cmUmaId: "oguri", won: true, configuration: configuration({ runningStyle: "end_closer" }) }]
  const cards = getHistoricalParticipantEntries(original)
  assert.deepEqual(cards.map((card) => [card.configuration.runningStyle, card.races, card.wins]),
    [["pace_chaser", 5, 3], ["end_closer", 1, 1]])
  assert.equal(cards.reduce((total, card) => total + card.races, 0), 6)
  assert.equal(cards.reduce((total, card) => total + card.wins, 0), 4)
  assert.equal(cards[1].finalAppearances, 1)
  assert.equal(cards[1].finalWins, 1)
  original.finalResults[0].configuration = configuration()
  assert.equal(getHistoricalParticipantEntries(original).length, 1)
  original.finalPlace = ""
  assert.equal(getHistoricalParticipantEntries(original)[0].races, 5)
})

test("unrecorded lineups add no history, while zero-win and retired batch totals remain exact", () => {
  const empty = cm()
  empty.participants = [{ umaId: "oguri", runningStyle: "pace_chaser" }]
  assert.deepEqual(getHistoricalParticipantEntries(empty), [])
  const cards = getHistoricalParticipantEntries(cm(attempt(5, result(0)), { ...attempt(3, result(1)), retired: true },
    { ...attempt(0, result(0, configuration({ runningStyle: "runaway" }))), retired: true }))
  assert.deepEqual(cards.map(({ races, wins, winRate }) => [races, wins, winRate]), [[8, 1, 12.5], [0, 0, null]])
})

test("one shared visual mapping provides all five Global labels and compact abbreviations", () => {
  assert.deepEqual(Object.values(runningStyleVisuals).map(({ label, abbreviation }) => [label, abbreviation]),
    [["Runaway", "RW"], ["Front Runner", "FR"], ["Pace Chaser", "PC"], ["Late Surger", "LS"], ["End Closer", "EC"]])
  assert.equal(new Set(Object.values(runningStyleVisuals).map((visual) => visual.style["--participant-style-rgb"])).size, 5)
})

test("Running Style Performance adds the zero-use Runaway display row without changing calculations", () => {
  const statistics = calculateUmaRunningStyleStatistics([cm(attempt(5, result(3)))], "oguri-christmas")
  const before = structuredClone(statistics)
  const rows = getUmaRunningStyleDisplayRows(statistics)
  assert.equal(rows.length, 5)
  assert.deepEqual(rows[0], { style: "runaway", label: "Runaway", races: 0, wins: 0, winRate: null, usage: 0 })
  assert.strictEqual(rows[2], statistics.rows.find((row) => row.style === "pace_chaser"))
  assert.deepEqual(statistics, before)
  assert.equal(rows.reduce((total, row) => total + row.races, 0), 5)
  assert.equal(rows.reduce((total, row) => total + row.wins, 0), 3)
  assert.ok(getUmaRunningStyleDisplayRows(calculateUmaRunningStyleStatistics([], "unused"))
    .every((row) => row.races === 0 && row.wins === 0 && row.winRate === null && row.usage === null))
})
