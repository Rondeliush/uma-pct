import assert from "node:assert/strict"
import test from "node:test"
import { importTS } from "./helpers/importTS.mjs"

const { getCMUmaOverallStats, getHistoricalParticipantEntries, getParticipantConfigurationKey } =
  await importTS(new URL("../src/CMs/cmParticipantPresentation.ts", import.meta.url))
const { runningStyleVisuals, getRunningStyleVisual } = await importTS(new URL("../src/CMs/runningStyleVisuals.ts", import.meta.url))
const { getUmaRunningStyleDisplayRows } = await importTS(new URL("../src/Statistics/umaRunningStylePresentation.ts", import.meta.url))
const { calculateUmaRunningStyleStatistics } = await importTS(new URL("../src/Statistics/umaRunningStyleStatistics.ts", import.meta.url))

const configuration = (fields = {}) => ({ umaVersionId: "oguri-christmas", runningStyle: "pace_chaser", ace: true,
  debuffer: false, entrySource: "manual", configurationSource: "recorded", ...fields })
const result = (wins, config = configuration(), cmUmaId = "oguri") => ({ cmUmaId, wins, configuration: config })
const attempt = (racesPlayed, ...umaWins) => ({ day: 1, attempt: 1, retired: false, racesPlayed, umaWins })
const cm = (...attempts) => ({ attempts, participants: [], finalPlace: "" })

test("CM Uma overall adds configuration totals and the recorded final without averaging their WR", () => {
  const pc = configuration({ umaVersionId: "fuji", runningStyle: "pace_chaser", ace: false, debuffer: true })
  const ls = { ...pc, runningStyle: "late_surger" }
  const ec = { ...pc, runningStyle: "end_closer" }
  const event = { ...cm(attempt(5, result(3, pc, "fuji")), attempt(5, result(5, ls, "fuji"))),
    number: 45342, finalPlace: "1st", finalResults: [{ cmUmaId: "fuji", won: true, configuration: ec }] }
  const before = structuredClone(event), entries = getHistoricalParticipantEntries(event)
  const totals = getCMUmaOverallStats(event).get("fuji")
  assert.deepEqual([totals.races, totals.wins, totals.winRate.toFixed(2)], [11, 9, "81.82"])
  assert.deepEqual(entries.map(entry => entry.winRate), [60, 100, 100])
  assert.notEqual(totals.winRate, (60 + 100 + 100) / 3)
  assert.deepEqual(getHistoricalParticipantEntries(event), entries)
  assert.deepEqual(event, before)
})

test("CM Uma overall keeps exact version identity and counts each version race once across duplicate references", () => {
  const event = cm(attempt(5, result(2, configuration({ umaVersionId: "fuji" }), "fuji-a"),
    result(1, configuration({ umaVersionId: "fuji", runningStyle: "late_surger" }), "fuji-b"),
    result(1, configuration({ umaVersionId: "fuji-alternate" }), "fuji-alt")))
  event.participants = [{ cmUmaId: "fuji-a", umaId: "changed-current-version", runningStyle: "runaway" }]
  const totals = getCMUmaOverallStats(event)
  assert.deepEqual(totals.get("fuji"), { races: 5, wins: 3, winRate: 60 })
  assert.deepEqual(totals.get("fuji-alternate"), { races: 5, wins: 1, winRate: 20 })
  assert.equal(totals.has("changed-current-version"), false)
  const anotherCM = cm(attempt(5, result(0, configuration({ umaVersionId: "fuji" }))))
  assert.equal(getCMUmaOverallStats(anotherCM).get("fuji").winRate, 0)
  assert.equal(getCMUmaOverallStats(event).get("fuji").winRate, 60)
})

test("CM Uma overall excludes pending finals and does not fabricate unrecorded history", () => {
  const event = cm(attempt(5, result(3, configuration({ umaVersionId: "fuji" }))))
  event.finalResults = [{ cmUmaId: "fuji", won: false, placement: null, placementSource: "recorded", configuration: configuration({ umaVersionId: "fuji", runningStyle: "end_closer" }) }]
  assert.deepEqual(getCMUmaOverallStats(event).get("fuji"), { races: 5, wins: 3, winRate: 60 })
  assert.equal(getCMUmaOverallStats(cm()).size, 0)
})

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

test("Fuji Kiseki's PC 3/5 and LS 5/5 snapshots retain separate DB cards after current Fuji changes back to PC", () => {
  const pc = configuration({ umaVersionId: "fuji-kiseki-original", runningStyle: "pace_chaser", ace: false, debuffer: true })
  const ls = { ...pc, runningStyle: "late_surger" }
  const event = cm(attempt(5, result(3, pc, "fuji")), { ...attempt(5, result(5, ls, "fuji")), day: 3 })
  event.phase = "finalLineup"
  event.participants = [{ cmUmaId: "fuji", umaId: pc.umaVersionId, runningStyle: "late_surger", ace: false, debuffer: true, autoRun: false }]
  const attempts = structuredClone(event.attempts)
  const cards = getHistoricalParticipantEntries(event)
  assert.deepEqual(cards.map(card => [card.configuration.runningStyle, card.configuration.debuffer, card.wins, card.races, card.winRate.toFixed(2)]), [
    ["pace_chaser", true, 3, 5, "60.00"], ["late_surger", true, 5, 5, "100.00"],
  ])
  event.participants = [{ ...event.participants[0], runningStyle: "pace_chaser", ace: true, debuffer: false, autoRun: true }]
  assert.deepEqual(getHistoricalParticipantEntries(event), cards)
  assert.deepEqual(event.attempts, attempts)
  assert.strictEqual(cards[0].configuration, pc)
  assert.strictEqual(cards[1].configuration, ls)
})

test("each snapshot field independently separates history regardless of the current participant configuration", () => {
  const base = configuration({ umaVersionId: "fuji-kiseki-original", ace: false, debuffer: false })
  const configs = [base, { ...base, ace: true }, { ...base, debuffer: true },
    { ...base, entrySource: "autorun" }, { ...base, runningStyle: "late_surger" }, { ...base, umaVersionId: "fuji-kiseki-alternate" }]
  const event = cm(...configs.map((config, i) => ({ ...attempt(5, result(i, config, "fuji")), day: i < 4 ? 1 : 2, attempt: i % 4 + 1 })))
  const before = structuredClone(event)
  const cards = getHistoricalParticipantEntries(event)
  assert.equal(cards.length, 6)
  assert.equal(new Set(cards.map(card => card.key)).size, 6)
  for (const config of configs) {
    event.participants = [{ cmUmaId: "fuji", umaId: config.umaVersionId, runningStyle: config.runningStyle,
      ace: config.ace, debuffer: config.debuffer, autoRun: config.entrySource === "autorun" }]
    assert.deepEqual(getHistoricalParticipantEntries(event), cards)
  }
  assert.deepEqual(event.attempts, before.attempts)
  assert.deepEqual(cards.map(card => card.configuration), configs)
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
