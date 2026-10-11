import assert from "node:assert/strict"
import test from "node:test"
import { importTS } from "./helpers/importTS.mjs"

const { calculateUmaDetailStatistics, getUmaDistancePerformance, getUmaDetailInsights } = await importTS(new URL("../src/Statistics/umaDetailStatistics.ts", import.meta.url))
const { calculateUmaStatistics, formatUmaWinRate } = await importTS(new URL("../src/Statistics/umaStatistics.ts", import.meta.url))
const { calculateUmaRunningStyleStatistics } = await importTS(new URL("../src/Statistics/umaRunningStyleStatistics.ts", import.meta.url))
const { getUmaRunningStyleDisplayRows } = await importTS(new URL("../src/Statistics/umaRunningStylePresentation.ts", import.meta.url))

const versions = [
  { id: "oguri-original", characterId: "oguri", displayName: "Oguri Cap", versionName: "Original", archived: true },
  { id: "oguri-christmas", characterId: "oguri", displayName: "Oguri Cap (Christmas)", versionName: "Christmas" },
  { id: "teio-original", characterId: "teio", displayName: "Tokai Teio", versionName: "Original" },
  { id: "custom", characterId: "custom-character", displayName: "Custom Uma", versionName: "Original" },
]
const participant = (cmUmaId, umaId, flags = {}) => ({ cmUmaId, umaId, finalParticipant: false, won: false, ...flags })
const attempt = (day, races, entries) => ({ day, attempt: 1, racesPlayed: races, retired: false, umaWins: entries.map(([cmUmaId, wins]) => ({ cmUmaId, wins })) })
const event = (fields = {}) => ({ number: 1, name: "Virgo Cup", track: "Ooi", surface: "Dirt", distance: 2000, participants: [], attempts: [], finalPlace: "", ...fields })
const finalResult = (cmUmaId, umaVersionId, placement, fields = {}) => ({
  cmUmaId, placement, placementSource: "recorded", won: placement === "first",
  configuration: { umaVersionId, runningStyle: null, ace: null, debuffer: null, entrySource: null, configurationSource: "recorded" },
  ...fields,
})
const recordedFinal = (number, placement, group = "Final A", finalPlace = "1st") => event({
  number, finalPlace,
  participants: [participant("a", "oguri-original", { finalParticipant: true })],
  attempts: [attempt(1, 5, [["a", 3]]), attempt(3, 5, [["a", group === "Final B" ? 1 : 3]])],
  finalResults: [finalResult("a", "oguri-original", placement, { placementSource: placement === null ? "legacy_inferred" : "recorded" })],
})
const recordedStyleEvent = (number, runningStyle, races, wins, fields = {}) => event({
  number,
  participants: [participant("a", "oguri-original", { runningStyle: "end_closer" })],
  attempts: [{ ...attempt(1, races, [["a", wins]]), umaWins: [{
    cmUmaId: "a", wins, configuration: { ...finalResult("a", "oguri-original", null).configuration, runningStyle },
  }] }],
  ...fields,
})

test("selected version details match its Overview entry without aggregating alternates", () => {
  const cms = [event({ participants: [participant("a", "oguri-original"), participant("b", "oguri-christmas"), participant("t", "teio-original")], attempts: [attempt(1, 5, [["a", 2], ["b", 1], ["t", 0]])] })]
  const snapshot = structuredClone(cms)
  const original = calculateUmaDetailStatistics(cms, "oguri-original")
  const christmas = calculateUmaDetailStatistics(cms, "oguri-christmas")
  const overviewUma = calculateUmaStatistics(cms, [{ id: "oguri", name: "Oguri Cap" }], versions).umas.find(uma => uma.versionId === "oguri-original")
  assert.equal(original.races, 5)
  assert.equal(original.winRate, 40)
  assert.equal(original.races, overviewUma.races)
  assert.equal(original.wins, overviewUma.wins)
  assert.equal(original.wins, 2)
  assert.equal(christmas.wins, 1)
  assert.equal(original.cmEvents, 1)
  assert.equal(calculateUmaDetailStatistics(cms, "oguri").cmEvents, 0)
  assert.deepEqual(cms, snapshot)
})

test("counts participation from saved attempt results, including zero-win and retired attempts", () => {
  const result = calculateUmaDetailStatistics([
    event({ participants: [participant("a", "oguri-original"), participant("t", "teio-original")], attempts: [attempt(1, 5, [["t", 2]]), { ...attempt(2, 2, [["a", 0]]), retired: true }] }),
    event({ number: 2, participants: [participant("a", "oguri-original", { finalParticipant: true })] }),
  ], "oguri-original")
  assert.equal(result.races, 2)
  assert.equal(result.wins, 0)
  assert.equal(result.winRate, 0)
  assert.equal(result.cmEvents, 1)
  assert.equal(result.finalAppearances, 0)
})

test("derives Final A/B from qualification rounds and keeps team placement separate from Uma wins", () => {
  const cms = [
    event({ participants: [participant("a", "oguri-original", { finalParticipant: true, won: true }), participant("b", "oguri-christmas", { finalParticipant: true }), participant("t", "teio-original", { finalParticipant: true })], attempts: [attempt(1, 5, [["a", 3], ["b", 0], ["t", 0]]), attempt(3, 5, [["a", 3], ["t", 0]])], finalPlace: "1st", finalResults: [finalResult("a", "oguri-original", "first"), finalResult("b", "oguri-christmas", "second"), finalResult("t", "teio-original", "third")] }),
    event({ number: 2, participants: [participant("b", "oguri-christmas", { finalParticipant: true, won: true })], attempts: [attempt(1, 5, [["b", 0]]), attempt(3, 5, [["b", 1]])], finalPlace: "2nd", finalResults: [finalResult("b", "oguri-christmas", "fourth_or_lower")] }),
  ]
  const original = calculateUmaDetailStatistics(cms, "oguri-original")
  assert.equal(original.finalAppearances, 1)
  assert.equal(original.finalWins, 1)
  assert.equal(original.races, 10)
  assert.equal(original.wins, 6)
  assert.deepEqual(original.finals, [
    { group: "Final A", appearances: 1, placements: { first: 1, second: 0, third: 0, fourth_or_lower: 0 }, unknownPlacements: 0 },
  ])
  const christmas = calculateUmaDetailStatistics(cms, "oguri-christmas")
  assert.deepEqual(christmas.finals, [
    { group: "Final A", appearances: 1, placements: { first: 0, second: 1, third: 0, fourth_or_lower: 0 }, unknownPlacements: 0 },
    { group: "Final B", appearances: 1, placements: { first: 0, second: 0, third: 0, fourth_or_lower: 1 }, unknownPlacements: 0 },
  ])
  assert.equal(christmas.events[0].final.teamPlace, "2nd")
  assert.equal(christmas.events[0].final.placement, "fourth_or_lower")
  assert.equal(christmas.events[0].final.won, false)
  assert.equal(christmas.finalAppearances, 2)
  assert.equal(christmas.finalWins, 0)
  assert.equal(christmas.events.find(event => event.number === 1).final.teamPlace, "1st")
  assert.equal(christmas.events.find(event => event.number === 1).final.placement, "second")
  assert.equal(calculateUmaDetailStatistics(cms, "teio-original").finalWins, 0)
  assert.equal(calculateUmaDetailStatistics(cms, "teio-original").finals[0].placements.third, 1)
  assert.equal(getUmaDetailInsights(christmas).eventPerformance.finalWinRate, 0)
})

test("final-only and incomplete records retain appearances without invented groups or round races", () => {
  const result = calculateUmaDetailStatistics([
    event({ participants: [participant("a", "oguri-original", { finalParticipant: true, won: true })], finalPlace: "1st" }),
    event({ number: 2, participants: [participant("a", "oguri-original", { finalParticipant: true })], attempts: [attempt(3, 5, [["a", 3]])], finalPlace: "3rd" }),
    event({ number: 3, participants: [participant("a", "oguri-original", { finalParticipant: true })], finalPlace: "unexpected" }),
  ], "oguri-original")
  assert.equal(result.finalAppearances, 2)
  assert.equal(result.finalWins, 1)
  assert.equal(result.races, 5)
  assert.equal(result.cmEvents, 2)
  assert.deepEqual(result.finals, [{ group: null, appearances: 2, placements: { first: 1, second: 0, third: 0, fourth_or_lower: 0 }, unknownPlacements: 1 }])
  assert.equal(result.events.find(event => event.number === 1).winRate, null)
})

test("null individual placements count appearances without borrowing any team placement or winner flag", () => {
  const cms = ["1st", "2nd", "3rd"].map((finalPlace, index) => event({
    number: index + 1, finalPlace,
    participants: [participant("a", "oguri-original", { finalParticipant: true, won: true })],
    attempts: [attempt(1, 5, [["a", 3]]), attempt(3, 5, [["a", 3]])],
    finalResults: [finalResult("a", "oguri-original", null, { placementSource: "legacy_inferred", won: true })],
  }))
  const snapshot = structuredClone(cms)
  const result = calculateUmaDetailStatistics(cms, "oguri-original")
  assert.equal(result.finalAppearances, 3)
  assert.equal(result.finalWins, 0)
  assert.deepEqual(result.finals, [{ group: "Final A", appearances: 3, placements: { first: 0, second: 0, third: 0, fourth_or_lower: 0 }, unknownPlacements: 3 }])
  assert.ok(result.events.every(event => event.final.placement === null && !event.final.won))
  assert.equal(result.knownFinalPlacements, 0)
  assert.equal(result.unrecordedFinalPlacements, 3)
  assert.equal(result.podiumFinishes, 0)
  assert.equal(result.podiumRate, null)
  assert.equal(result.finalWinRate, null)
  assert.equal(result.bestFinalPlacement, null)
  assert.equal(getUmaDetailInsights(result).eventPerformance.finalWinRate, null)
  assert.deepEqual(cms, snapshot)
})

test("all four individual finishes and unknown reconcile with appearances and final win rate", () => {
  const cms = ["first", "second", "third", "fourth_or_lower", null].map((placement, index) => event({
    number: index + 1, finalPlace: "1st",
    attempts: [attempt(1, 5, [["a", 3]]), attempt(3, 5, [["a", 3]])],
    finalResults: [finalResult("a", "oguri-original", placement, { won: false })],
  }))
  const snapshot = structuredClone(cms)
  const result = calculateUmaDetailStatistics(cms, "oguri-original")
  assert.equal(result.finalAppearances, 5)
  assert.equal(result.finalWins, 1)
  assert.equal(result.knownFinalPlacements, 4)
  assert.equal(result.unrecordedFinalPlacements, 1)
  assert.equal(result.podiumFinishes, 3)
  assert.equal(result.podiumRate, 75)
  assert.equal(result.finalWinRate, 25)
  assert.equal(result.bestFinalPlacement, "first")
  assert.equal(getUmaDetailInsights(result).eventPerformance.finalWinRate, 25)
  assert.deepEqual(result.finals, [{ group: "Final A", appearances: 5, placements: { first: 1, second: 1, third: 1, fourth_or_lower: 1 }, unknownPlacements: 1 }])
  for (const group of result.finals) assert.equal(Object.values(group.placements).reduce((sum, count) => sum + count, group.unknownPlacements), group.appearances)
  assert.deepEqual(cms, snapshot)
})

test("one individual second place in Final A earns a podium without a final win", () => {
  const result = calculateUmaDetailStatistics([recordedFinal(1, "second")], "oguri-original")
  assert.equal(result.finalAppearances, 1)
  assert.equal(result.finalWins, 0)
  assert.equal(result.knownFinalPlacements, 1)
  assert.equal(result.unrecordedFinalPlacements, 0)
  assert.equal(result.podiumFinishes, 1)
  assert.equal(result.podiumRate, 100)
  assert.equal(result.finalWinRate, 0)
  assert.equal(result.bestFinalPlacement, "second")
  assert.deepEqual(result.finals, [{ group: "Final A", appearances: 1, placements: { first: 0, second: 1, third: 0, fourth_or_lower: 0 }, unknownPlacements: 0 }])
})

test("podium and final win rates use known individual finishes with existing percentage formatting", () => {
  const cms = ["first", "second", "fourth_or_lower"].map((placement, index) => recordedFinal(index + 1, placement))
  const result = calculateUmaDetailStatistics(cms, "oguri-original")
  assert.equal(result.finalAppearances, 3)
  assert.equal(result.knownFinalPlacements, 3)
  assert.equal(result.unrecordedFinalPlacements, 0)
  assert.equal(result.finalWins, 1)
  assert.equal(result.podiumFinishes, 2)
  assert.equal(result.podiumRate, 2 / 3 * 100)
  assert.equal(result.finalWinRate, 1 / 3 * 100)
  assert.equal(formatUmaWinRate(result.podiumRate), "66.7%")
  assert.equal(formatUmaWinRate(result.finalWinRate), "33.3%")
})

test("legacy unrecorded placements remain appearances but are excluded from both rate denominators", () => {
  const cms = ["first", null, null].map((placement, index) => recordedFinal(index + 1, placement))
  const snapshot = structuredClone(cms)
  const result = calculateUmaDetailStatistics(cms, "oguri-original")
  assert.equal(result.finalAppearances, 3)
  assert.equal(result.finalWins, 1)
  assert.equal(result.knownFinalPlacements, 1)
  assert.equal(result.unrecordedFinalPlacements, 2)
  assert.equal(result.podiumFinishes, 1)
  assert.equal(result.podiumRate, 100)
  assert.equal(result.finalWinRate, 100)
  assert.equal(getUmaDetailInsights(result).eventPerformance.finalWinRate, 100)
  assert.equal(result.bestFinalPlacement, "first")
  assert.deepEqual(result.finals, [{ group: "Final A", appearances: 3, placements: { first: 1, second: 0, third: 0, fourth_or_lower: 0 }, unknownPlacements: 2 }])
  assert.deepEqual(cms, snapshot)
})

test("Final A and Final B keep separate placement distributions while sharing podium totals", () => {
  const result = calculateUmaDetailStatistics([
    recordedFinal(1, "second", "Final A"), recordedFinal(2, null, "Final A"),
    recordedFinal(3, "third", "Final B"), recordedFinal(4, "fourth_or_lower", "Final B"),
  ], "oguri-original")
  assert.deepEqual(result.finals, [
    { group: "Final A", appearances: 2, placements: { first: 0, second: 1, third: 0, fourth_or_lower: 0 }, unknownPlacements: 1 },
    { group: "Final B", appearances: 2, placements: { first: 0, second: 0, third: 1, fourth_or_lower: 1 }, unknownPlacements: 0 },
  ])
  assert.equal(result.finalAppearances, 4)
  assert.equal(result.knownFinalPlacements, 3)
  assert.equal(result.podiumFinishes, 2)
  assert.equal(result.podiumRate, 2 / 3 * 100)
  assert.equal(result.finalWinRate, 0)
  assert.equal(result.bestFinalPlacement, "second")
})

test("team result never substitutes the recorded individual third-place finish", () => {
  const result = calculateUmaDetailStatistics(["1st", "2nd", "3rd"].map((team, index) => recordedFinal(index + 1, "third", "Final A", team)), "oguri-original")
  assert.deepEqual(result.finals[0].placements, { first: 0, second: 0, third: 3, fourth_or_lower: 0 })
  assert.equal(result.finalAppearances, 3)
  assert.equal(result.finalWins, 0)
  assert.equal(result.podiumFinishes, 3)
  assert.equal(result.podiumRate, 100)
  assert.equal(result.finalWinRate, 0)
  assert.equal(result.bestFinalPlacement, "third")
})

test("best final placement follows finish priority and stays unavailable without known finishes", () => {
  const placements = [null, "fourth_or_lower", "third", "second", "first"]
  for (let count = 1; count <= placements.length; count += 1) {
    const cms = placements.slice(0, count).map((placement, index) => recordedFinal(index + 1, placement))
    assert.equal(calculateUmaDetailStatistics(cms, "oguri-original").bestFinalPlacement, placements[count - 1])
    assert.equal(calculateUmaDetailStatistics([...cms].reverse(), "oguri-original").bestFinalPlacement, placements[count - 1])
  }
  const fourth = calculateUmaDetailStatistics([recordedFinal(1, "fourth_or_lower")], "oguri-original")
  assert.equal(fourth.podiumRate, 0)
  assert.equal(fourth.finalWinRate, 0)
  const empty = calculateUmaDetailStatistics([], "oguri-original")
  assert.equal(empty.knownFinalPlacements, 0)
  assert.equal(empty.unrecordedFinalPlacements, 0)
  assert.equal(empty.podiumFinishes, 0)
  assert.equal(empty.podiumRate, null)
  assert.equal(empty.finalWinRate, null)
  assert.equal(empty.bestFinalPlacement, null)
})

test("final snapshot version and placement survive current lineup changes and removed participants", () => {
  const cm = event({
    finalPlace: "1st",
    participants: [participant("a", "oguri-christmas", { finalParticipant: true, won: true }), participant("unknown", "oguri-original", { finalParticipant: true, won: true })],
    finalResults: [finalResult("a", "oguri-original", "second"), finalResult("removed", "teio-original", "third"), finalResult("unknown", null, "first")],
  })
  const snapshot = structuredClone(cm)
  const original = calculateUmaDetailStatistics([cm], "oguri-original")
  assert.equal(original.finalAppearances, 1)
  assert.equal(original.finalWins, 0)
  assert.equal(original.finals[0].placements.second, 1)
  assert.equal(original.events[0].final.teamPlace, "1st")
  assert.equal(calculateUmaDetailStatistics([cm], "oguri-christmas").finalAppearances, 0)
  assert.equal(calculateUmaDetailStatistics([cm], "teio-original").finals[0].placements.third, 1)
  assert.deepEqual(cm, snapshot)
})

test("duplicate version finalists keep one appearance and their best recorded finish regardless of order", () => {
  const records = [finalResult("a", "oguri-original", "third"), finalResult("b", "oguri-original", "first"), finalResult("c", "oguri-original", null)]
  for (const finalResults of [records, [...records].reverse()]) {
    const result = calculateUmaDetailStatistics([event({ finalPlace: "1st", finalResults })], "oguri-original")
    assert.equal(result.finalAppearances, 1)
    assert.equal(result.finalWins, 1)
    assert.deepEqual(result.finals[0].placements, { first: 1, second: 0, third: 0, fourth_or_lower: 0 })
    assert.equal(result.finals[0].unknownPlacements, 0)
    assert.equal(result.knownFinalPlacements, 1)
    assert.equal(result.podiumFinishes, 1)
    assert.equal(result.podiumRate, 100)
    assert.equal(result.finalWinRate, 100)
    assert.equal(result.bestFinalPlacement, "first")
  }
})

test("a pending lineup and a non-final participant never gain an individual final appearance", () => {
  const pending = event({ finalResults: [finalResult("a", "oguri-original", null)], participants: [participant("a", "oguri-original", { finalParticipant: true })] })
  const completed = event({ number: 2, finalPlace: "1st", finalResults: [finalResult("b", "oguri-christmas", "first")], participants: [participant("a", "oguri-original", { finalParticipant: true, won: true })] })
  const result = calculateUmaDetailStatistics([pending, completed], "oguri-original")
  assert.equal(result.finalAppearances, 0)
  assert.equal(result.finalWins, 0)
  assert.deepEqual(result.finals, [])
})

test("exact distances exclude unknown distances and finals, and history is newest first", () => {
  const cms = [
    event({ number: 3, distance: 2200, participants: [participant("a", "oguri-original")], attempts: [attempt(1, 5, [["a", 2]])] }),
    event({ number: 1, distance: 2000, participants: [participant("a", "oguri-original")], attempts: [attempt(1, 10, [["a", 6]])] }),
    event({ number: 4, distance: 0, participants: [participant("a", "oguri-original")], attempts: [attempt(1, 2, [["a", 1]])] }),
    event({ number: 2, distance: 2000, participants: [participant("a", "oguri-christmas")], attempts: [attempt(1, 5, [["a", 1]])] }),
    event({ number: 5, distance: 3200, participants: [participant("a", "oguri-original", { finalParticipant: true })], finalPlace: "2nd" }),
  ]
  const result = calculateUmaDetailStatistics(cms, "oguri-original")
  assert.deepEqual(result.distances.map(distance => [distance.distance, distance.races, distance.wins]), [[2000, 10, 6], [2200, 5, 2]])
  assert.deepEqual(result.events.map(event => event.number), [5, 4, 3, 1])
  assert.equal(result.cmEvents, 4)
  assert.deepEqual(calculateUmaDetailStatistics(cms, "oguri-christmas").distances.map(distance => [distance.distance, distance.races, distance.wins]), [[2000, 5, 1]])
})

test("unknown historical IDs and custom versions retain their own history", () => {
  const cms = [event({ participants: [participant("a", "deleted-id"), participant("b", "custom")], attempts: [attempt(1, 5, [["a", 2], ["b", 1]])] })]
  assert.equal(calculateUmaDetailStatistics(cms, "deleted-id").wins, 2)
  assert.equal(calculateUmaDetailStatistics(cms, "custom").wins, 1)
  const empty = calculateUmaDetailStatistics([], "oguri-original")
  assert.equal(empty.races, 0)
  assert.equal(empty.winRate, null)
  assert.deepEqual(empty.events, [])
  assert.deepEqual(empty.finals, [])
})

test("legacy base-only history is inspectable without contaminating known version details", () => {
  const cms = [event({ participants: [participant("a", "oguri", { finalParticipant: true, won: true }), participant("b", "oguri-original"), participant("c", "oguri-christmas")], attempts: [attempt(1, 5, [["a", 3], ["b", 1], ["c", 0]])], finalPlace: "1st" })]
  const snapshot = structuredClone(cms)
  const legacy = calculateUmaDetailStatistics(cms, "oguri")
  assert.equal(legacy.wins, 3)
  assert.equal(legacy.finalWins, 1)
  assert.equal(legacy.events.length, 1)
  assert.equal(calculateUmaDetailStatistics(cms, "oguri-original").wins, 1)
  assert.equal(calculateUmaDetailStatistics(cms, "oguri-original").finalAppearances, 0)
  assert.equal(calculateUmaDetailStatistics(cms, "oguri-christmas").wins, 0)
  assert.deepEqual(cms, snapshot)
})

test("surface filters separate the same distance and categories use saved project lengths", () => {
  const cms = [
    event({ number: 1, distance: 1200, length: "Short", surface: "Turf", participants: [participant("a", "oguri-original")], attempts: [attempt(1, 5, [["a", 2]])] }),
    event({ number: 2, distance: 1600, length: "Mile", surface: "Dirt", participants: [participant("a", "oguri-original")], attempts: [attempt(1, 5, [["a", 1]])] }),
    event({ number: 3, distance: 2000, length: "Medium", surface: "Turf", participants: [participant("a", "oguri-original")], attempts: [attempt(1, 10, [["a", 4]])] }),
    event({ number: 4, distance: 2000, length: "Medium", surface: "Dirt", participants: [participant("a", "oguri-original")], attempts: [attempt(1, 5, [["a", 3]])] }),
    event({ number: 5, distance: 3200, length: "Long", surface: "Turf", participants: [participant("a", "oguri-original")], attempts: [attempt(1, 5, [["a", 0]])] }),
    event({ number: 6, distance: 2000, length: "Medium", surface: "Dirt", participants: [participant("b", "oguri-christmas")], attempts: [attempt(1, 5, [["b", 5]])] }),
  ]
  const snapshot = structuredClone(cms)
  const statistics = calculateUmaDetailStatistics(cms, "oguri-original")
  const dirt = getUmaDistancePerformance(statistics.events, "Dirt")
  assert.deepEqual(dirt.distances.map(row => [row.distance, row.races, row.wins, row.winRate]), [[1600, 5, 1, 20], [2000, 5, 3, 60]])
  assert.deepEqual(dirt.categories.map(row => [row.category, row.races, row.wins]), [["Mile", 5, 1], ["Medium", 5, 3]])
  assert.deepEqual(getUmaDistancePerformance(statistics.events).categories.map(row => [row.category, row.races, row.wins]), [["Sprint", 5, 2], ["Mile", 5, 1], ["Medium", 15, 7], ["Long", 5, 0]])
  assert.deepEqual(getUmaDetailInsights(statistics).surfaces.map(row => [row.surface, row.races, row.wins]), [["Turf", 20, 6], ["Dirt", 10, 4]])
  assert.deepEqual(cms, snapshot)
})

test("Best highlights require ten races and weighted event rates resist tiny samples", () => {
  const statistics = calculateUmaDetailStatistics([
    event({ number: 1, name: "Tiny perfect result", distance: 1200, participants: [participant("a", "oguri-original")], attempts: [attempt(1, 1, [["a", 1]])] }),
    event({ number: 2, name: "Established best", distance: 2000, participants: [participant("a", "oguri-original", { finalParticipant: true, won: true })], attempts: [attempt(1, 10, [["a", 5]])], finalPlace: "1st" }),
    event({ number: 3, name: "Most used", distance: 1600, participants: [participant("a", "oguri-original", { finalParticipant: true })], attempts: [attempt(1, 20, [["a", 4]])], finalPlace: "2nd" }),
  ], "oguri-original")
  const insights = getUmaDetailInsights(statistics)
  assert.equal(insights.highlights.bestDistance.distance, 2000)
  assert.equal(insights.highlights.bestCM.name, "Established best")
  assert.equal(insights.highlights.mostUsedDistance.distance, 1600)
  assert.equal(insights.eventPerformance.weightedWinRate, 10 / 31 * 100)
  assert.equal(insights.eventPerformance.bestEventWinRate, 50)
  assert.equal(insights.eventPerformance.finalAppearanceRate, 2 / 3 * 100)
  assert.equal(insights.eventPerformance.finalWinRate, 100)
  const tiny = getUmaDetailInsights(calculateUmaDetailStatistics([
    event({ participants: [participant("a", "oguri-original")], attempts: [attempt(1, 1, [["a", 1]])] }),
  ], "oguri-original"))
  assert.equal(tiny.highlights.bestDistance, null)
  assert.equal(tiny.highlights.bestCM, null)
  assert.equal(tiny.highlights.bestSurface, null)
  assert.equal(tiny.highlights.bestRunningStyle, null)
  assert.equal(tiny.highlights.mostUsedDistance.distance, 2000)
  assert.equal(tiny.eventPerformance.bestEventWinRate, null)
  assert.equal(tiny.eventPerformance.finalWinRate, null)
})

test("Best CM ranks the exact version's race win rate, without using team or individual final finishes", () => {
  const cms = [
    event({ number: 1, name: "Most wins", participants: [participant("a", "oguri-original")], attempts: [attempt(1, 20, [["a", 12]])] }),
    event({ number: 5, name: "Higher WR", participants: [participant("a", "oguri-original")], attempts: [attempt(1, 11, [["a", 11]])] }),
    event({ number: 9, name: "Alternate version", participants: [participant("b", "oguri-christmas")], attempts: [attempt(1, 40, [["b", 30]])] }),
    event({ number: 10, name: "Final only", participants: [participant("a", "oguri-original", { finalParticipant: true, won: true })], finalPlace: "1st" }),
  ]
  const snapshot = structuredClone(cms)
  const statistics = calculateUmaDetailStatistics(cms, "oguri-original")
  const before = structuredClone(statistics)
  assert.equal(getUmaDetailInsights(statistics).highlights.bestCM.number, 5)
  assert.equal(getUmaDetailInsights(calculateUmaDetailStatistics(cms, "oguri-christmas")).highlights.bestCM.number, 9)
  assert.deepEqual(statistics, before)
  assert.deepEqual(cms, snapshot)
})

test("running-style highlights reuse historical snapshot totals and apply the ten-race Best threshold", () => {
  const cms = [
    recordedStyleEvent(1, "front_runner", 10, 6),
    recordedStyleEvent(2, "pace_chaser", 5, 4), recordedStyleEvent(3, "pace_chaser", 5, 4),
    recordedStyleEvent(4, "runaway", 9, 9), recordedStyleEvent(5, null, 11, 8),
  ]
  const snapshot = structuredClone(cms)
  const statistics = calculateUmaDetailStatistics(cms, "oguri-original")
  const before = structuredClone(statistics)
  const performance = calculateUmaRunningStyleStatistics(cms, "oguri-original")
  assert.deepEqual(statistics.runningStyles, getUmaRunningStyleDisplayRows(performance))
  const { bestRunningStyle, mostUsedRunningStyle, bestCM } = getUmaDetailInsights(statistics).highlights
  assert.equal(bestRunningStyle.style, "pace_chaser")
  assert.equal(bestRunningStyle.races, 10)
  assert.equal(bestRunningStyle.winRate, 80)
  // Equal race counts use the table's canonical order; unknown races remain in usage totals.
  assert.equal(mostUsedRunningStyle.style, "front_runner")
  assert.equal(mostUsedRunningStyle.usage, 10 / 40 * 100)
  assert.equal(bestCM.number, 5)
  assert.deepEqual(statistics, before)
  assert.deepEqual(cms, snapshot)
  cms.forEach(cm => { cm.participants[0].umaId = "oguri-christmas"; cm.participants[0].runningStyle = "late_surger" })
  assert.deepEqual(getUmaDetailInsights(calculateUmaDetailStatistics(cms, "oguri-original")).highlights, getUmaDetailInsights(statistics).highlights)
})

test("Most Used highlights work below ten races and never choose an unused running style", () => {
  const highlights = getUmaDetailInsights(calculateUmaDetailStatistics([
    recordedStyleEvent(1, "front_runner", 4, 4, { distance: 1600 }),
    recordedStyleEvent(2, "runaway", 4, 1, { distance: 1200 }),
  ], "oguri-original")).highlights
  assert.equal(highlights.bestDistance, null)
  assert.equal(highlights.bestRunningStyle, null)
  assert.equal(highlights.bestSurface, null)
  assert.equal(highlights.bestCM, null)
  assert.equal(highlights.mostUsedDistance.distance, 1200)
  assert.equal(highlights.mostUsedDistance.races, 4)
  assert.equal(highlights.mostUsedRunningStyle.style, "runaway")
  assert.equal(highlights.mostUsedRunningStyle.races, 4)
  assert.equal(highlights.mostUsedRunningStyle.usage, 50)
  const unknown = getUmaDetailInsights(calculateUmaDetailStatistics([recordedStyleEvent(1, null, 20, 10)], "oguri-original")).highlights
  assert.equal(unknown.bestRunningStyle, null)
  assert.equal(unknown.mostUsedRunningStyle, null)
})

test("Best Surface uses weighted supported-surface totals and excludes perfect tiny samples", () => {
  const statistics = calculateUmaDetailStatistics([
    recordedStyleEvent(1, "pace_chaser", 9, 9, { surface: "Turf" }),
    recordedStyleEvent(2, "pace_chaser", 10, 5, { surface: "Dirt" }),
    recordedStyleEvent(3, "pace_chaser", 5, 4, { surface: "Dirt" }),
    recordedStyleEvent(4, "pace_chaser", 50, 50, { surface: "Unknown" }),
  ], "oguri-original")
  const insights = getUmaDetailInsights(statistics)
  assert.deepEqual(insights.highlights.bestSurface, { surface: "Dirt", races: 15, wins: 9, winRate: 60 })
  assert.equal(insights.unknownSurfaceRaces, 50)
  assert.ok(insights.surfaces.every(row => row.surface === "Turf" || row.surface === "Dirt"))
})

test("Best ties prefer more races, then lower distance, canonical style order and newest CM", () => {
  const cms = [
    recordedStyleEvent(1, "front_runner", 10, 5, { distance: 1200, surface: "Dirt" }),
    recordedStyleEvent(2, "pace_chaser", 20, 10, { distance: 1600, surface: "Turf" }),
    recordedStyleEvent(3, "runaway", 20, 10, { distance: 2000, surface: "Dirt" }),
    recordedStyleEvent(4, "late_surger", 20, 10, { distance: 2200, surface: "Turf" }),
    recordedStyleEvent(5, "end_closer", 20, 10, { distance: 2400, surface: "Dirt" }),
  ]
  const snapshot = structuredClone(cms)
  const statistics = calculateUmaDetailStatistics(cms, "oguri-original")
  const before = structuredClone(statistics)
  const { highlights } = getUmaDetailInsights(statistics)
  assert.equal(highlights.bestDistance.distance, 1600)
  assert.equal(highlights.mostUsedDistance.distance, 1600)
  assert.equal(highlights.bestRunningStyle.style, "runaway")
  assert.equal(highlights.mostUsedRunningStyle.style, "runaway")
  assert.equal(highlights.bestSurface.surface, "Dirt")
  assert.equal(highlights.bestCM.number, 5)
  assert.deepEqual(getUmaDetailInsights(calculateUmaDetailStatistics([...cms].reverse(), "oguri-original")).highlights, highlights)
  assert.deepEqual(getUmaDetailInsights(statistics).highlights, highlights)
  assert.deepEqual(statistics, before)
  assert.deepEqual(cms, snapshot)
  assert.deepEqual(Object.keys(highlights), ["bestDistance", "mostUsedDistance", "bestRunningStyle", "mostUsedRunningStyle", "bestSurface", "bestCM"])
})

test("equal surface and style samples keep the existing canonical table order on ties", () => {
  const cms = [
    recordedStyleEvent(2, "end_closer", 10, 6, { surface: "Dirt", distance: 2000 }),
    recordedStyleEvent(1, "front_runner", 10, 6, { surface: "Turf", distance: 1600 }),
  ]
  for (const order of [cms, [...cms].reverse()]) {
    const { highlights } = getUmaDetailInsights(calculateUmaDetailStatistics(order, "oguri-original"))
    assert.equal(highlights.bestSurface.surface, "Turf")
    assert.equal(highlights.bestRunningStyle.style, "front_runner")
    assert.equal(highlights.mostUsedRunningStyle.style, "front_runner")
    assert.equal(highlights.bestDistance.distance, 1600)
    assert.equal(highlights.bestCM.number, 2)
  }
})

test("unavailable Best metrics remain null while recorded zero-win samples stay valid", () => {
  const { highlights } = getUmaDetailInsights(calculateUmaDetailStatistics([recordedStyleEvent(1, "front_runner", 10, 0, { surface: "Turf" })], "oguri-original"))
  for (const key of ["bestDistance", "bestRunningStyle", "bestSurface", "bestCM"]) assert.equal(highlights[key].winRate, 0)
  const finalOnly = calculateUmaDetailStatistics([event({ participants: [participant("a", "oguri-original", { finalParticipant: true, won: true })], finalPlace: "1st" })], "oguri-original")
  assert.ok(Object.values(getUmaDetailInsights(finalOnly).highlights).every(value => value === null))
})

test("missing surface/category and zero totals remain unavailable without fabricated allocations", () => {
  const statistics = calculateUmaDetailStatistics([
    event({ number: 1, surface: "", length: "", participants: [participant("a", "oguri-original")], attempts: [attempt(1, 5, [["a", 2]])] }),
    event({ number: 2, distance: 0, surface: "Dirt", length: "Medium", participants: [participant("a", "oguri-original")], attempts: [attempt(1, 5, [["a", 0]])] }),
    event({ number: 3, surface: "Turf", participants: [participant("a", "oguri-original", { finalParticipant: true })], finalPlace: "3rd" }),
  ], "oguri-original")
  const distances = getUmaDistancePerformance(statistics.events)
  assert.equal(distances.uncategorizedRaces, 5)
  assert.deepEqual(distances.categories, [])
  assert.deepEqual(getUmaDistancePerformance(statistics.events, "Dirt").distances, [])
  const insights = getUmaDetailInsights(statistics)
  assert.equal(insights.unknownSurfaceRaces, 5)
  assert.deepEqual(insights.surfaces.map(row => [row.surface, row.races, row.winRate]), [["Dirt", 5, 0]])
  const empty = getUmaDetailInsights(calculateUmaDetailStatistics([], "oguri-original"))
  assert.deepEqual(empty.surfaces, [])
  assert.equal(empty.eventPerformance.weightedWinRate, null)
  assert.equal(empty.eventPerformance.finalAppearanceRate, null)
  assert.equal(empty.eventPerformance.finalWinRate, null)
  assert.ok(Object.values(empty.highlights).every(value => value === null))
})
