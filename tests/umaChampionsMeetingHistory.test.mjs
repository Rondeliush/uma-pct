import assert from "node:assert/strict"
import test from "node:test"
import { importTS } from "./helpers/importTS.mjs"

const { calculateUmaDetailStatistics } = await importTS(new URL("../src/Statistics/umaDetailStatistics.ts", import.meta.url))
const { getUmaChampionsMeetingHistory } = await importTS(new URL("../src/Statistics/umaCMHistory.ts", import.meta.url))
const { CM_FINAL_PLACEMENT_LABELS } = await importTS(new URL("../src/CMs/cmFinalPlacements.ts", import.meta.url))

const configuration = (fields = {}) => ({ umaVersionId: "original", runningStyle: "pace_chaser", ace: true, debuffer: false, entrySource: "manual", configurationSource: "recorded", ...fields })
const result = (configuration, wins = 2, cmUmaId = "a") => ({ cmUmaId, wins, configuration })
const attempt = (day, configuration, fields = {}) => ({ day, attempt: 1, racesPlayed: 5, retired: false, umaWins: [result(configuration, 3)], ...fields })
const finalist = (placement = "second", config = configuration(), cmUmaId = "a") => ({ cmUmaId, placement, placementSource: placement === null ? "legacy_inferred" : "recorded", won: placement === "first", configuration: config })
const event = (fields = {}) => ({
  number: 1, name: "Libra Cup 2", track: "Hanshin", surface: "Turf", distance: 1600, length: "Mile", finalPlace: "1st",
  participants: [{ cmUmaId: "a", umaId: "original", runningStyle: "end_closer", ace: false, debuffer: true, finalParticipant: false, won: false }],
  attempts: [attempt(1, configuration()), attempt(3, configuration())], finalResults: [finalist()], ...fields,
})
const history = (cms, versionId = "original") => getUmaChampionsMeetingHistory(cms, versionId, calculateUmaDetailStatistics(cms, versionId).events)

test("team Final A first and this Uma's individual second finish stay separate", () => {
  const [entry] = history([event()])
  assert.deepEqual(entry.teamFinal, { group: "Final A", teamPlace: "1st" })
  assert.equal(entry.umaFinish, "second")
  assert.equal(CM_FINAL_PLACEMENT_LABELS[entry.umaFinish], "2nd")
  assert.equal(entry.final.won, false)
  assert.equal(entry.races, 10)
  assert.equal(entry.wins, 6)
  assert.equal(entry.winRate, 60)
})

test("every recorded individual finish uses its own placement label", () => {
  for (const [placement, label] of [["first", "1st"], ["second", "2nd"], ["third", "3rd"], ["fourth_or_lower", "4th+"]]) {
    const [entry] = history([event({ finalResults: [finalist(placement)] })])
    assert.equal(entry.umaFinish, placement)
    assert.equal(CM_FINAL_PLACEMENT_LABELS[entry.umaFinish], label)
    assert.equal(entry.teamFinal.teamPlace, "1st")
  }
})

test("a raced Uma outside the saved final lineup still sees the completed team result", () => {
  const [entry] = history([event({ finalResults: [finalist("first", configuration({ umaVersionId: "alternate" }), "other")] })])
  assert.deepEqual(entry.teamFinal, { group: "Final A", teamPlace: "1st" })
  assert.equal(entry.final, null)
  assert.equal(entry.umaFinish, "not_in_final")
  assert.ok(entry.runningStyles.every(style => !style.usedInFinal))
})

test("legacy null placement is Unrecorded without borrowing the team win or stale winner flag", () => {
  const [entry] = history([event({ finalResults: [{ ...finalist(null), won: true }] })])
  assert.equal(entry.umaFinish, "unrecorded")
  assert.equal(entry.final.won, false)
  assert.equal(entry.teamFinal.teamPlace, "1st")
})

test("No Final has no Uma Finish and excludes a pending final's configuration", () => {
  const [entry] = history([event({ finalPlace: "", finalResults: [finalist(null, configuration({ runningStyle: "late_surger", ace: false, debuffer: true }))] })])
  assert.equal(entry.teamFinal, null)
  assert.equal(entry.umaFinish, null)
  assert.equal(entry.role, "ace")
  assert.deepEqual(entry.runningStyles, [{ style: "pace_chaser", usedInFinal: false }])
})

test("four known role combinations reuse the existing exclusive interpretation", () => {
  for (const [ace, debuffer, role] of [[false, false, "no_special_role"], [true, false, "ace"], [false, true, "debuffer"], [true, true, "ace_debuffer"]]) {
    const config = configuration({ ace, debuffer })
    const [entry] = history([event({ attempts: [attempt(1, config), attempt(3, config)], finalResults: [finalist("second", config)] })])
    assert.equal(entry.role, role)
    assert.deepEqual(entry.roleConfiguration, config)
  }
})

test("different historical roles across attempts or the final are Mixed", () => {
  for (const fields of [
    { attempts: [attempt(1, configuration()), attempt(3, configuration({ ace: false, debuffer: true }))] },
    { finalResults: [finalist("second", configuration({ ace: false, debuffer: false }))] },
    { attempts: [attempt(1, configuration(), { umaWins: [result(configuration()), result(configuration({ debuffer: true }), 1, "b")] })] },
  ]) {
    const [entry] = history([event(fields)])
    assert.equal(entry.role, "mixed")
    assert.equal(entry.roleConfiguration, null)
  }
})

test("unknown or partial role flags never invent No Role, and do not override a consistent known role", () => {
  for (const [ace, debuffer] of [[null, null], [null, false], [false, null], [true, null], [null, true]]) {
    const config = configuration({ ace, debuffer })
    const [entry] = history([event({ attempts: [attempt(1, config)], finalResults: [finalist(null, config)] })])
    assert.equal(entry.role, "unknown")
  }
  const [entry] = history([event({ attempts: [attempt(1, configuration()), attempt(3, configuration({ ace: null, debuffer: null }))] })])
  assert.equal(entry.role, "ace")
})

test("all styles are distinct and canonical; only the saved final style gets the marker", () => {
  const cms = [event({
    attempts: [attempt(1, configuration({ runningStyle: "late_surger" })), attempt(3, configuration()), attempt(4, configuration())],
    finalResults: [finalist("second", configuration({ runningStyle: "late_surger" }))],
  })]
  const [entry] = history(cms)
  assert.deepEqual(entry.runningStyles, [{ style: "pace_chaser", usedInFinal: false }, { style: "late_surger", usedInFinal: true }])
  cms[0].attempts.reverse()
  assert.deepEqual(history(cms)[0].runningStyles, entry.runningStyles)
})

test("all five styles follow RW FR PC LS EC order regardless of attempt order", () => {
  const [entry] = history([event({ finalPlace: "", finalResults: [], attempts: ["end_closer", "pace_chaser", "late_surger", "front_runner", "runaway"].map(style => attempt(1, configuration({ runningStyle: style }))) })])
  assert.deepEqual(entry.runningStyles.map(row => row.style), ["runaway", "front_runner", "pace_chaser", "late_surger", "end_closer"])
})

test("a style known only from the final is retained, including final-only events", () => {
  const [entry] = history([event({ attempts: [], finalResults: [finalist("third", configuration({ runningStyle: "late_surger", ace: false, debuffer: true }))] })])
  assert.deepEqual(entry.runningStyles, [{ style: "late_surger", usedInFinal: true }])
  assert.equal(entry.role, "debuffer")
  assert.equal(entry.races, 0)
  assert.equal(entry.winRate, null)
  assert.equal(entry.teamFinal.group, null)
  assert.equal(entry.umaFinish, "third")
})

test("null final style does not guess a final marker from the recorded round style", () => {
  const [entry] = history([event({ finalResults: [finalist(null, configuration({ runningStyle: null }))] })])
  assert.deepEqual(entry.runningStyles, [{ style: "pace_chaser", usedInFinal: false }])
})

test("null or absent historical snapshots never read style or role from current participants", () => {
  const unknown = configuration({ runningStyle: null, ace: null, debuffer: null })
  const [nullEntry] = history([event({ attempts: [attempt(1, unknown)], finalResults: [finalist(null, unknown)] })])
  assert.equal(nullEntry.role, "unknown")
  assert.deepEqual(nullEntry.runningStyles, [])
  const [absentEntry] = history([event({ finalPlace: "", finalResults: [], attempts: [{ ...attempt(1, unknown), umaWins: [{ cmUmaId: "a", wins: 2 }] }] })])
  assert.equal(absentEntry.role, "unknown")
  assert.deepEqual(absentEntry.runningStyles, [])
})

test("zero-race batches and other versions cannot add historical roles or styles", () => {
  const [entry] = history([event({ attempts: [
    attempt(1, configuration()),
    attempt(3, configuration({ runningStyle: "runaway", ace: false, debuffer: true }), { racesPlayed: 0, umaWins: [result(configuration({ runningStyle: "runaway", ace: false, debuffer: true }), 0)] }),
    attempt(4, configuration({ umaVersionId: "alternate", runningStyle: "front_runner", ace: false, debuffer: true })),
    attempt(4, configuration({ umaVersionId: null, runningStyle: "end_closer", ace: false, debuffer: true })),
  ] })])
  assert.equal(entry.role, "ace")
  assert.deepEqual(entry.runningStyles, [{ style: "pace_chaser", usedInFinal: true }])
  assert.equal(entry.races, 5)
})

test("snapshots survive participant edits/removal and history preserves all event totals and identifiers", () => {
  const cms = [event(), event({ number: 4, name: "Final B check", finalPlace: "2nd", attempts: [attempt(1, configuration()), attempt(3, configuration(), { umaWins: [result(configuration(), 1)] })] })]
  const snapshot = structuredClone(cms)
  const statistics = calculateUmaDetailStatistics(cms, "original")
  const before = structuredClone(statistics)
  const entries = getUmaChampionsMeetingHistory(cms, "original", statistics.events)
  assert.deepEqual(entries.map(entry => entry.number), [4, 1])
  assert.deepEqual(entries[0].teamFinal, { group: "Final B", teamPlace: "2nd" })
  for (const [index, entry] of entries.entries()) {
    for (const [key, value] of Object.entries(statistics.events[index])) assert.deepEqual(entry[key], value)
  }
  assert.deepEqual(statistics, before)
  assert.deepEqual(cms, snapshot)
  cms[0].participants = []
  cms[1].participants[0].umaId = "alternate"
  cms[1].participants[0].runningStyle = "runaway"
  cms[1].participants[0].won = true
  assert.deepEqual(history(cms), entries)
  assert.deepEqual(history([], "unused"), [])
})
