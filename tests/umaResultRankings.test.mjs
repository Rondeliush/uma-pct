import assert from "node:assert/strict"
import test from "node:test"
import { importTS } from "./helpers/importTS.mjs"

const { getCMUmaResultRecords, getLoHUmaResultRecords, rankUmaResults } = await importTS(new URL("../src/Statistics/umaResultRankings.ts", import.meta.url))
const { getUmaOverviewStatistics } = await importTS(new URL("../src/Statistics/umaOverviewStatistics.ts", import.meta.url))
const { MIN_RACES_FOR_WIN_RATE } = await importTS(new URL("../src/Statistics/umaStatistics.ts", import.meta.url))
const { createLoHEvent } = await importTS(new URL("../src/LoH/lohData.ts", import.meta.url))
const { saveLoHRaceSet, getLoHLineupSnapshot, finishLoHDay, confirmLoHMainStageRank, registerLoHExtraStageLineup, saveLoHExtraStageResult } = await importTS(new URL("../src/LoH/progress.ts", import.meta.url))

const versions = ["fuji", "fuji-alt", "teio", "ship"].map(id => ({ id, characterId: id.startsWith("fuji") ? "fuji-character" : id, displayName: id, avatar: "", archived: id === "fuji" }))
const configuration = (id, fields = {}) => ({ umaVersionId: id, runningStyle: "pace_chaser", ace: false, debuffer: false, entrySource: "manual", configurationSource: "recorded", ...fields })
function champion(number, league, group = "A", fields = {}) {
  return { number, name: "CM", league, track: "Tokyo", surface: "Turf", distance: 1600, length: "Mile", finalPlace: "1st",
    participants: [{ cmUmaId: "old-fuji", umaId: "fuji-alt", ace: true, autoRun: true }], currentLineup: ["old-fuji"],
    attempts: [1, 3].map(day => ({ day, attempt: 1, racesPlayed: 5, retired: false, umaWins: [
      { cmUmaId: "old-fuji", wins: day === 3 && group === "B" ? 2 : 3, configuration: configuration("fuji", { runningStyle: day === 1 ? "runaway" : "late_surger" }) },
      { cmUmaId: "teio", wins: 0, configuration: configuration("teio") },
    ] })),
    finalResults: [
      { cmUmaId: "old-fuji", placement: "first", won: false, configuration: configuration("fuji") },
      { cmUmaId: "teio", placement: "second", won: true, configuration: configuration("teio") },
    ], ...fields }
}
const scopes = (cms = [], lohs = []) => getUmaOverviewStatistics(cms, lohs, [], versions)

test("CM ranks individual recorded finals by A/B and league, preserving snapshot identities and weighted totals", () => {
  const a = champion(1, "Graded League"), b = champion(2, "Open League", "B"), second = champion(3, "Graded League")
  second.finalResults[0].placement = "second"
  second.finalResults[1].placement = "first"
  // A duplicate participant reference cannot turn one final into two appearances/wins.
  a.finalResults.push({ ...a.finalResults[0], cmUmaId: "duplicate" })
  const cms = [a, b, second], before = structuredClone(cms), base = scopes(cms).cm.umas
  const rows = getCMUmaResultRecords(cms, base), fuji = rows.find(row => row.uma.versionId === "fuji")
  assert.equal(rows.some(row => row.uma.versionId === "fuji-alt"), false)
  assert.deepEqual([fuji.values["final-a-appearances"], fuji.values["final-b-appearances"], fuji.values["final-a-wins"], fuji.values["final-b-wins"], fuji.values["final-wins"]], [2, 1, 1, 1, 2])
  assert.deepEqual([fuji.uma.races, fuji.uma.wins, fuji.events], [33, 19, 3])
  assert.equal(fuji.uma.winRate, 19 / 33 * 100)
  const graded = getCMUmaResultRecords(cms, base, "Graded League").find(row => row.uma.versionId === "fuji")
  const open = getCMUmaResultRecords(cms, base, "Open League").find(row => row.uma.versionId === "fuji")
  assert.deepEqual([graded.values["final-a-appearances"], graded.values["final-b-appearances"], graded.uma.races, graded.uma.wins], [2, 0, 22, 13])
  assert.deepEqual([open.values["final-a-appearances"], open.values["final-b-appearances"], open.uma.races, open.uma.wins], [0, 1, 11, 6])
  assert.deepEqual(rankUmaResults(rows, "final-wins").map(row => [row.uma.versionId, row.value]), [["fuji", 2], ["teio", 1]])
  assert.deepEqual(cms, before)
})

test("qualified/selected but unraced finals are not appearances; unclassified finals cannot invent A/B achievements", () => {
  const pending = champion(1, "Graded League", "A", { finalPlace: "" })
  const unknown = champion(2, "Open League", "A", { attempts: [] })
  const cms = [pending, unknown], base = scopes(cms).cm.umas
  const pendingRows = getCMUmaResultRecords([pending], base)
  assert.equal(pendingRows[0].values["final-wins"], 0)
  assert.equal(pendingRows[0].values["final-a-appearances"], 0)
  const unknownRows = getCMUmaResultRecords(cms, base)
  assert.equal(unknownRows[0].values["final-a-appearances"], null)
  assert.equal(unknownRows[0].values["final-b-wins"], null)
  assert.equal(unknownRows[0].values["final-wins"], 1)
  assert.deepEqual(rankUmaResults(unknownRows, "final-a-appearances"), [])
  assert.deepEqual(getCMUmaResultRecords([unknown], base, "Graded League"), [])
})

const details = { number: 1, name: "LoH", racecourse: "Tokyo", surface: "Turf", distance: 1600, length: "Mile", direction: "Left", season: "Spring" }
function lohHistory() {
  let event = createLoHEvent([], { ...details, lineup: ["fuji", "teio", "ship"].map(id => ({ id, name: id, style: "Pace Chaser", ace: false, debuffer: false, autoRun: false })) }, "rank-test")
  for (let set = 0; set < 5; set++) event = saveLoHRaceSet(event, { id: "set-" + set, day: 1, createdAt: "2026-11-01T01:00:00Z", weather: "Sunny", condition: "Firm", lineupSnapshot: getLoHLineupSnapshot(event),
    races: Array.from({ length: 5 }, (_, i) => ({ id: set + "-race-" + i, placements: event.currentLineup.map((umaId, index) => ({ umaId, place: [1, 2, set === 0 ? 4 : 3][index] })) })) })
  for (let day = 1; day <= 6; day++) event = finishLoHDay(event, day)
  event = confirmLoHMainStageRank(event, 74)
  return registerLoHExtraStageLineup(event, ["fuji", "teio", "ship"])
}

test("LoH keeps raw points before Bronze cap, Top 3 counts and individual Extra Stage wins separate", () => {
  const registered = lohHistory()
  assert.equal(registered.leagueScore, 4000)
  const beforeResult = getLoHUmaResultRecords([registered], scopes([], [registered]).loh.umas)
  assert.ok(beforeResult.every(row => row.values["extra-stage-appearances"] === 0))
  const event = saveLoHExtraStageResult(registered, { id: "extra", createdAt: "2026-11-01T02:00:00Z", weather: "Sunny", condition: "Firm", placements: [
    { umaId: "fuji", placement: "second" }, { umaId: "teio", placement: "first" }, { umaId: "ship", placement: "fourth_or_lower" },
  ] })
  const before = structuredClone(event), rows = getLoHUmaResultRecords([event], scopes([], [event]).loh.umas)
  const fuji = rows.find(row => row.uma.versionId === "fuji"), ship = rows.find(row => row.uma.versionId === "ship")
  assert.equal(rows.reduce((sum, row) => sum + row.values["raw-points"], 0), 4950)
  assert.deepEqual([fuji.values["raw-points"], fuji.values.races, fuji.values.wins, fuji.values.top3, fuji.values["extra-stage-appearances"], fuji.values["extra-stage-wins"]], [2500, 26, 25, 26, 1, 0])
  assert.deepEqual([ship.values["raw-points"], ship.values.top3], [950, 20])
  assert.deepEqual(rankUmaResults(rows, "extra-stage-wins").map(row => [row.uma.versionId, row.value]), [["teio", 1]])
  assert.deepEqual(rankUmaResults(rows, "extra-stage-appearances").map(row => row.place), [1, 1, 1])
  assert.deepEqual(event, before)
})

test("LoH legacy unknown points stay unavailable and exact alternate versions stay separate", () => {
  const event = { ...lohHistory(), raceSets: undefined, extraStage: undefined, legacyProgress: undefined, racesPlayed: 20,
    participants: [{ umaId: "fuji", races: 20, wins: 10, top3Finishes: 15 }, { umaId: "fuji-alt", races: 10, wins: 3, top3Finishes: 5, totalPoints: 500 }], currentLineup: ["fuji", "fuji-alt"] }
  const rows = getLoHUmaResultRecords([event], scopes([], [event]).loh.umas)
  assert.equal(rows.find(row => row.uma.versionId === "fuji").values["raw-points"], null)
  assert.deepEqual(rankUmaResults(rows, "raw-points").map(row => [row.uma.versionId, row.value]), [["fuji-alt", 500]])
})

test("rankings use weighted Win Rate, the existing race minimum, stable ties and honest empty states", () => {
  const row = (id, races, wins, extra = {}) => ({ uma: { versionId: id, name: id, races, wins, winRate: wins / races * 100 }, events: 1, values: { races, wins, "win-rate": wins / races * 100, ...extra } })
  const rows = [row("one", 1, 1), row("a", MIN_RACES_FOR_WIN_RATE, 6), row("b", 20, 12), row("zero", 20, 0), row("unknown", 20, 0, { "win-rate": null })]
  const before = structuredClone(rows)
  assert.deepEqual(rankUmaResults(rows, "win-rate").map(row => [row.uma.versionId, row.value, row.place]), [["b", 60, 1], ["a", 60, 1], ["zero", 0, 3]])
  assert.equal(rankUmaResults(rows, "wins").some(row => row.value === 0), false)
  assert.deepEqual(rankUmaResults([], "races"), [])
  assert.deepEqual(rankUmaResults(rows, "final-a-appearances"), [])
  assert.deepEqual(rows, before)
})
