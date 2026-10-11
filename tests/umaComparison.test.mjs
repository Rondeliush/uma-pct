import assert from "node:assert/strict"
import test from "node:test"
import { importTS } from "./helpers/importTS.mjs"

const { getUmaComparisonValues, aggregateUmaCompetitiveRecords, getUmaComparisonWinners, formatUmaComparisonValue, UMA_COMPARISON_SECTIONS } = await importTS(new URL("../src/Statistics/umaComparison.ts", import.meta.url))

const participant = (cmUmaId, umaId, fields = {}) => ({ cmUmaId, umaId, finalParticipant: false, won: false, ...fields })
const attempt = (races, results) => ({ day: 1, attempt: 1, racesPlayed: races, retired: false, umaWins: results.map(([cmUmaId, wins]) => ({ cmUmaId, wins })) })
const event = (fields = {}) => ({ number: 1, name: "Virgo Cup", surface: "Turf", distance: 1600, length: "Mile", participants: [], attempts: [], finalPlace: "", ...fields })
const finalResult = (cmUmaId, umaVersionId, placement, fields = {}) => ({
  cmUmaId, placement, placementSource: placement === null ? "legacy_inferred" : "recorded", won: placement === "first",
  configuration: { umaVersionId, runningStyle: null, ace: null, debuffer: null, entrySource: null, configurationSource: "recorded" },
  ...fields,
})
const recordedFinal = (placement, number = 1, group = "Final A", finalPlace = "1st") => event({
  number, finalPlace,
  participants: [participant("a", "original", { finalParticipant: true, won: true })],
  attempts: [{ ...attempt(5, [["a", 3]]), day: 1 }, { ...attempt(5, [["a", group === "Final B" ? 1 : 3]]), day: 3 }],
  finalResults: [finalResult("a", "original", placement)],
})

test("Compare sections expose General and CM together with a row-free LoH placeholder", () => {
  const rows = section => UMA_COMPARISON_SECTIONS.find(group => group.id === section).rows
  assert.deepEqual(UMA_COMPARISON_SECTIONS.map(section => section.label), ["General", "Champions Meeting", "League of Heroes"])
  assert.deepEqual(rows("general").map(row => row.label), ["Races", "Wins", "Win Rate", "Events Participated"])
  assert.deepEqual(rows("cm").map(row => row.label), ["CM Events", "CM Races", "CM Wins", "CM Win Rate", "Final Appearances", "Final A Appearances", "Final B Appearances", "1st Finishes", "2nd Finishes", "3rd Finishes", "4th+ Finishes", "Podium Finishes", "Final Appearance Rate", "Podium Rate", "Final Win Rate"])
  assert.ok([...rows("general"), ...rows("cm")].every(row => !row.id.toLowerCase().includes("distance") && row.ranking === "highest"))
  assert.equal(UMA_COMPARISON_SECTIONS.find(section => section.id === "loh").status, "soon")
  assert.deepEqual(rows("loh"), [])
})

test("empty slots and versions without recorded history have unavailable values in every section", () => {
  for (const id of [null, "unused"]) {
    const values = getUmaComparisonValues([], id)
    assert.deepEqual(Object.keys(values).sort(), ["cm", "overall"])
    const metrics = Object.values(values).flatMap(record => Object.values(record))
    assert.ok(metrics.every(value => value === null))
  }
  for (const value of [null, NaN, Infinity, -Infinity, "", "   "]) assert.equal(formatUmaComparisonValue(value, "number"), "—")
  assert.equal(formatUmaComparisonValue(0, "number"), "0")
  assert.equal(formatUmaComparisonValue(0, "percentage"), "0.0%")
  assert.equal(formatUmaComparisonValue(1234, "number"), "1,234")
})

test("general rows use each exact version's rounds, events and final rate denominators", () => {
  const cms = [
    event({ participants: [participant("a", "original", { finalParticipant: true, won: true }), participant("b", "christmas", { finalParticipant: true })], attempts: [attempt(10, [["a", 6], ["b", 2]])], finalPlace: "1st" }),
    event({ number: 2, participants: [participant("a", "original")], attempts: [attempt(5, [["a", 0]])] }),
  ]
  const snapshot = structuredClone(cms)
  const original = getUmaComparisonValues(cms, "original")
  const christmas = getUmaComparisonValues(cms, "christmas")
  assert.deepEqual(original.overall, { races: 15, wins: 6, winRate: 40, events: 2 })
  assert.equal(original.cm.races, 15)
  assert.equal(original.cm.wins, 6)
  assert.equal(original.cm.winRate, 40)
  assert.equal(original.cm.events, 2)
  assert.equal(original.cm.finalAppearances, 1)
  assert.equal(original.cm.firstFinishes, 1)
  assert.equal(original.cm.finalAppearanceRate, 50)
  assert.equal(original.cm.finalWinRate, 100)
  assert.deepEqual(christmas.overall, { races: 10, wins: 2, winRate: 20, events: 1 })
  assert.equal(christmas.cm.races, 10)
  assert.equal(christmas.cm.wins, 2)
  assert.equal(christmas.cm.firstFinishes, 0)
  assert.equal(christmas.cm.finalAppearanceRate, 100)
  assert.equal(christmas.cm.finalWinRate, null)
  assert.notEqual(original.overall, original.cm)
  assert.deepEqual(cms, snapshot)
})

test("CM Final A and B counts use recorded qualification rounds and preserve rate denominators", () => {
  const cms = [
    event({ participants: [participant("a", "original", { finalParticipant: true, won: true })], attempts: [{ ...attempt(5, [["a", 3]]), day: 1 }, { ...attempt(5, [["a", 3]]), day: 3 }], finalPlace: "1st" }),
    event({ number: 2, participants: [participant("a", "original", { finalParticipant: true })], attempts: [{ ...attempt(5, [["a", 3]]), day: 1 }, { ...attempt(5, [["a", 1]]), day: 3 }], finalPlace: "2nd" }),
    event({ number: 3, participants: [participant("a", "original")], attempts: [attempt(5, [["a", 0]])] }),
  ]
  const { cm: values } = getUmaComparisonValues(cms, "original")
  assert.equal(values.events, 3)
  assert.equal(values.finalAppearances, 2)
  assert.equal(values.finalAAppearances, 1)
  assert.equal(values.finalBAppearances, 1)
  assert.equal(values.firstFinishes, 1)
  assert.equal(values.finalAppearanceRate, 2 / 3 * 100)
  assert.equal(values.finalWinRate, 100)
})

test("missing qualification keeps A/B unavailable, including mixed complete and incomplete history", () => {
  const classified = event({ participants: [participant("a", "original", { finalParticipant: true })], attempts: [{ ...attempt(5, [["a", 3]]), day: 1 }, { ...attempt(5, [["a", 3]]), day: 3 }], finalPlace: "2nd" })
  const missing = event({ number: 2, participants: [participant("a", "original", { finalParticipant: true })], finalPlace: "2nd" })
  for (const cms of [[missing], [classified, missing]]) {
    const { cm: values } = getUmaComparisonValues(cms, "original")
    assert.equal(values.finalAAppearances, null)
    assert.equal(values.finalBAppearances, null)
    assert.equal(values.finalAppearances, cms.length)
  }
})

test("zero denominators and final-only records keep unavailable rates safe and real counts zero", () => {
  const { overall, cm: values } = getUmaComparisonValues([event({ participants: [participant("a", "original", { finalParticipant: true })], finalPlace: "2nd" })], "original")
  assert.equal(values.races, 0)
  assert.equal(values.wins, 0)
  assert.equal(values.winRate, null)
  assert.equal(values.finalAppearances, 1)
  assert.equal(values.finalWinRate, null)
  assert.equal(values.podiumRate, null)
  assert.deepEqual([values.firstFinishes, values.secondFinishes, values.thirdFinishes, values.fourthOrLowerFinishes, values.podiumFinishes], [0, 0, 0, 0, 0])
  assert.equal(values.finalAAppearances, null)
  assert.equal(values.finalBAppearances, null)
  assert.deepEqual(overall, { races: 0, wins: 0, winRate: null, events: 1 })
  const { cm: noFinals } = getUmaComparisonValues([event({ participants: [participant("a", "original")], attempts: [attempt(5, [["a", 0]])] })], "original")
  assert.equal(noFinals.finalAppearances, 0)
  assert.equal(noFinals.finalAAppearances, 0)
  assert.equal(noFinals.finalBAppearances, 0)
  assert.deepEqual([noFinals.firstFinishes, noFinals.secondFinishes, noFinals.thirdFinishes, noFinals.fourthOrLowerFinishes, noFinals.podiumFinishes], [0, 0, 0, 0, 0])
  assert.equal(noFinals.finalAppearanceRate, 0)
  assert.equal(noFinals.finalWinRate, null)
  assert.equal(noFinals.podiumRate, null)
})

test("first finishes belong to the recorded winning version, never the team's first-place result", () => {
  const qualifiers = (aWins, bWins) => [
    { ...attempt(5, [["a", 3], ["b", 0]]), day: 1 },
    { ...attempt(5, [["a", aWins], ["b", bWins]]), day: 3 },
  ]
  const cms = [
    event({ participants: [participant("a", "original", { finalParticipant: true, won: true }), participant("b", "christmas", { finalParticipant: true })], attempts: qualifiers(3, 0), finalPlace: "1st" }),
    event({ number: 2, participants: [participant("a", "original", { finalParticipant: true }), participant("b", "christmas", { finalParticipant: true, won: true })], attempts: qualifiers(1, 0), finalPlace: "1st" }),
    event({ number: 3, participants: [participant("a", "original", { finalParticipant: true, won: true }), participant("b", "christmas", { finalParticipant: true, won: true })], attempts: qualifiers(3, 0), finalPlace: "" }),
  ]
  const snapshot = structuredClone(cms)
  const original = getUmaComparisonValues(cms, "original").cm
  const christmas = getUmaComparisonValues(cms, "christmas").cm
  assert.deepEqual([original.finalAAppearances, original.finalBAppearances, original.firstFinishes], [1, 1, 1])
  assert.deepEqual([christmas.finalAAppearances, christmas.finalBAppearances, christmas.firstFinishes], [1, 1, 1])
  assert.deepEqual(cms, snapshot)
})

test("a saved second place counts as a podium appearance without inheriting the team win", () => {
  const cm = recordedFinal("second")
  const snapshot = structuredClone(cm)
  const values = getUmaComparisonValues([cm], "original").cm
  assert.equal(values.events, 1)
  assert.equal(values.finalAppearances, 1)
  assert.equal(values.finalAAppearances, 1)
  assert.equal(values.finalBAppearances, 0)
  assert.deepEqual([values.firstFinishes, values.secondFinishes, values.thirdFinishes, values.fourthOrLowerFinishes], [0, 1, 0, 0])
  assert.equal(values.podiumFinishes, 1)
  assert.equal(values.podiumRate, 100)
  assert.equal(values.finalWinRate, 0)
  assert.equal(values.finalAppearanceRate, 100)
  assert.deepEqual(cm, snapshot)
})

test("mixed recorded placements use known finals for podium and individual win rates", () => {
  const cms = [recordedFinal("first"), recordedFinal("second", 2, "Final B"), recordedFinal("fourth_or_lower", 3)]
  const snapshot = structuredClone(cms)
  const values = getUmaComparisonValues(cms, "original").cm
  assert.equal(values.finalAppearances, 3)
  assert.deepEqual([values.firstFinishes, values.secondFinishes, values.thirdFinishes, values.fourthOrLowerFinishes], [1, 1, 0, 1])
  assert.equal(values.podiumFinishes, 2)
  assert.equal(values.podiumRate, 2 / 3 * 100)
  assert.equal(values.finalWinRate, 1 / 3 * 100)
  assert.equal(formatUmaComparisonValue(values.podiumRate, "percentage"), "66.7%")
  assert.equal(formatUmaComparisonValue(values.finalWinRate, "percentage"), "33.3%")
  assert.deepEqual(cms, snapshot)
})

test("legacy null placements count as appearances but never as fourth place or rate losses", () => {
  const cms = [recordedFinal("first"), recordedFinal(null, 2), recordedFinal(null, 3, "Final B")]
  // A conflicting old winner flag must not turn an explicitly null placement into first.
  cms[1].finalResults[0].won = true
  const snapshot = structuredClone(cms)
  const values = getUmaComparisonValues(cms, "original").cm
  assert.equal(values.finalAppearances, 3)
  assert.equal(values.finalAAppearances, 2)
  assert.equal(values.finalBAppearances, 1)
  assert.deepEqual([values.firstFinishes, values.secondFinishes, values.thirdFinishes, values.fourthOrLowerFinishes], [1, 0, 0, 0])
  assert.equal(values.podiumFinishes, 1)
  assert.equal(values.podiumRate, 100)
  assert.equal(values.finalWinRate, 100)
  assert.equal(values.finalAppearanceRate, 100)
  const unknownOnly = getUmaComparisonValues(cms.slice(1), "original").cm
  assert.equal(unknownOnly.finalAppearances, 2)
  assert.equal(unknownOnly.finalAAppearances, 1)
  assert.equal(unknownOnly.finalBAppearances, 1)
  assert.equal(unknownOnly.podiumRate, null)
  assert.equal(unknownOnly.finalWinRate, null)
  assert.equal(unknownOnly.finalAppearanceRate, 100)
  assert.deepEqual(cms, snapshot)
})

test("team final placement does not change individual finish counts or rates", () => {
  for (const teamPlace of ["1st", "2nd", "3rd"]) {
    const values = getUmaComparisonValues([recordedFinal("fourth_or_lower", 1, "Final A", teamPlace)], "original").cm
    assert.deepEqual([values.firstFinishes, values.secondFinishes, values.thirdFinishes, values.fourthOrLowerFinishes], [0, 0, 0, 1])
    assert.equal(values.finalAppearances, 1)
    assert.equal(values.podiumFinishes, 0)
    assert.equal(values.podiumRate, 0)
    assert.equal(values.finalWinRate, 0)
  }
})

test("all new placement rows read the individual counts and rates, including third place", () => {
  const values = getUmaComparisonValues([recordedFinal("third")], "original")
  const cmRows = UMA_COMPARISON_SECTIONS.find(section => section.id === "cm").rows
  const value = id => cmRows.find(row => row.id === id).getValue(values)
  assert.deepEqual([value("firstFinishes"), value("secondFinishes"), value("thirdFinishes"), value("fourthOrLowerFinishes")], [0, 0, 1, 0])
  assert.equal(value("podiumFinishes"), 1)
  assert.equal(value("podiumRate"), 100)
  assert.equal(value("finalWinRate"), 0)
})

test("individual final rates exclude unrecorded placements across Final A and Final B", () => {
  const placements = ["second", "first", null]
  const cms = placements.map((placement, index) => event({
    number: index + 1, finalPlace: "1st",
    participants: [participant("a", "original", { finalParticipant: true, won: placement !== "first" })],
    attempts: [{ ...attempt(5, [["a", 3]]), day: 1 }, { ...attempt(5, [["a", index === 2 ? 1 : 3]]), day: 3 }],
    finalResults: [{ cmUmaId: "a", placement, placementSource: placement === null ? "legacy_inferred" : "recorded", won: placement !== "first", configuration: { umaVersionId: "original", runningStyle: null, ace: null, debuffer: null, entrySource: null, configurationSource: "recorded" } }],
  }))
  const snapshot = structuredClone(cms)
  const secondOnly = getUmaComparisonValues([cms[0]], "original").cm
  assert.deepEqual([secondOnly.finalAAppearances, secondOnly.firstFinishes, secondOnly.secondFinishes, secondOnly.finalWinRate], [1, 0, 1, 0])
  const values = getUmaComparisonValues(cms, "original").cm
  assert.deepEqual([values.finalAAppearances, values.finalBAppearances, values.firstFinishes, values.secondFinishes, values.fourthOrLowerFinishes], [2, 1, 1, 1, 0])
  assert.equal(values.finalAppearances, 3)
  assert.equal(values.finalWinRate, 50)
  assert.equal(values.podiumRate, 100)
  assert.deepEqual(cms, snapshot)
})

test("individual finishes count duplicate version references once and do not infer missing qualification", () => {
  const cm = event({
    // Duplicate version references are supported; the final has only one actual winning runner.
    participants: [participant("a", "original", { finalParticipant: true, won: true }), participant("b", "original", { finalParticipant: true })],
    attempts: [{ ...attempt(5, [["a", 3], ["b", 0]]), day: 1 }, { ...attempt(5, [["a", 1], ["b", 0]]), day: 3 }],
    finalPlace: "1st",
  })
  const values = getUmaComparisonValues([cm], "original").cm
  assert.deepEqual([values.finalAAppearances, values.finalBAppearances, values.finalAppearances, values.firstFinishes], [0, 1, 1, 1])
  const missing = event({ number: 2, participants: [participant("a", "original", { finalParticipant: true, won: true })], finalPlace: "1st" })
  const unknown = getUmaComparisonValues([cm, missing], "original").cm
  assert.deepEqual([unknown.finalAAppearances, unknown.finalBAppearances, unknown.finalAppearances, unknown.firstFinishes], [null, null, 2, 2])
  assert.equal(unknown.podiumRate, 100)
  assert.equal(unknown.finalWinRate, 100)
  cm.finalResults = [finalResult("a", "original", "second"), finalResult("b", "original", "fourth_or_lower")]
  const duplicated = getUmaComparisonValues([cm], "original").cm
  assert.deepEqual([duplicated.finalAppearances, duplicated.firstFinishes, duplicated.secondFinishes, duplicated.fourthOrLowerFinishes, duplicated.podiumFinishes], [1, 0, 1, 0, 1])
})

test("Overall aggregates supported event records with a weighted rate and does not alter source modes", () => {
  const records = [{ races: 10, wins: 6, winRate: 60, events: 1 }, { races: 30, wins: 3, winRate: 10, events: 2 }]
  const snapshot = structuredClone(records)
  assert.deepEqual(aggregateUmaCompetitiveRecords(records), { races: 40, wins: 9, winRate: 22.5, events: 3 })
  assert.deepEqual(records, snapshot)
})

test("Overall keeps zero denominators and incomplete source totals unavailable without inventing counts", () => {
  const unavailable = { races: null, wins: null, winRate: null, events: null }
  assert.deepEqual(aggregateUmaCompetitiveRecords([]), unavailable)
  assert.deepEqual(aggregateUmaCompetitiveRecords([unavailable]), unavailable)
  assert.deepEqual(aggregateUmaCompetitiveRecords([{ races: 0, wins: 0, winRate: null, events: 1 }]), { races: 0, wins: 0, winRate: null, events: 1 })
  assert.deepEqual(aggregateUmaCompetitiveRecords([unavailable, { races: 5, wins: 0, winRate: 0, events: 1 }]), { races: 5, wins: 0, winRate: 0, events: 1 })
  assert.deepEqual(aggregateUmaCompetitiveRecords([{ races: 10, wins: 6, winRate: 60, events: 1 }, { races: 5, wins: null, winRate: null, events: 1 }]), { races: 15, wins: null, winRate: null, events: 2 })
})

test("Overall and dedicated CM rows retain separate values when another supported mode contributes", () => {
  const values = getUmaComparisonValues([event({ participants: [participant("a", "original")], attempts: [attempt(10, [["a", 6]])] })], "original")
  const cmSnapshot = structuredClone(values.cm)
  values.overall = aggregateUmaCompetitiveRecords([values.cm, { races: 30, wins: 3, winRate: 10, events: 2 }])
  const rows = UMA_COMPARISON_SECTIONS.flatMap(section => section.rows)
  const value = id => rows.find(row => row.id === id).getValue(values)
  assert.equal(value("races"), 40)
  assert.equal(value("wins"), 9)
  assert.equal(value("winRate"), 22.5)
  assert.equal(value("eventsParticipated"), 3)
  assert.equal(value("cmRaces"), 10)
  assert.equal(value("cmWins"), 6)
  assert.equal(value("cmWinRate"), 60)
  assert.equal(value("cmEvents"), 1)
  assert.deepEqual(values.cm, cmSnapshot)
})

test("all tied highest valid numbers are highlighted, including zero, while missing and invalid values are ignored", () => {
  assert.deepEqual(getUmaComparisonWinners([12, 12, 7, null, NaN], "number"), [true, true, false, false, false])
  assert.deepEqual(getUmaComparisonWinners([null, 0, 0, null, Infinity], "number"), [false, true, true, false, false])
  assert.deepEqual(getUmaComparisonWinners([null, NaN, Infinity, -Infinity], "percentage"), [false, false, false, false])
  assert.deepEqual(getUmaComparisonWinners([50, 75, 75, 0, null], "percentage"), [false, true, true, false, false])
  assert.deepEqual(getUmaComparisonWinners([3, null], "number"), [true, false])
  assert.deepEqual(getUmaComparisonWinners([3, 3, 1, null], "number", "none"), [false, false, false, false])
})

test("fourth-or-lower finishes highlight all highest counts and preserve all-zero ties", () => {
  const row = UMA_COMPARISON_SECTIONS.find(section => section.id === "cm").rows.find(row => row.id === "fourthOrLowerFinishes")
  assert.equal(row.ranking, "highest")
  assert.deepEqual(getUmaComparisonWinners([0, 0, 0, 1, 1], row.format, row.ranking), [false, false, false, true, true])
  assert.deepEqual(getUmaComparisonWinners([3, 1, 3, null, NaN], row.format, row.ranking), [true, false, true, false, false])
  assert.deepEqual(getUmaComparisonWinners([0, 0, 0, 0, 0], row.format, row.ranking), [true, true, true, true, true])
  assert.deepEqual(getUmaComparisonWinners([null, NaN, Infinity, -Infinity], row.format, row.ranking), [false, false, false, false])
  assert.deepEqual(getUmaComparisonWinners([null, 4], row.format, row.ranking), [false, true])
})

test("comparison ranks raw percentages and never ranks text-only rows", () => {
  assert.deepEqual(getUmaComparisonWinners([66.661, 66.669], "percentage"), [false, true])
  assert.equal(formatUmaComparisonValue(66.669, "percentage"), "66.7%")
  assert.deepEqual(getUmaComparisonWinners(["2000 m", "1600 m", null], "text"), [false, false, false])
  assert.deepEqual(getUmaComparisonWinners(["CM 5", "CM 2", null], "text"), [false, false, false])
  assert.deepEqual(getUmaComparisonWinners([9, 3, null], "text"), [false, false, false])
})
