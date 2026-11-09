import assert from "node:assert/strict"
import test from "node:test"
import { importTS } from "./helpers/importTS.mjs"

const { getUmaRankingModes, getUmaFinalAWins, rankUmaOverview, formatUmaRankingValue } = await importTS(new URL("../src/Statistics/umaRankingStatistics.ts", import.meta.url))
const { getUmaOverviewStatistics } = await importTS(new URL("../src/Statistics/umaOverviewStatistics.ts", import.meta.url))
const { MIN_RACES_FOR_WIN_RATE } = await importTS(new URL("../src/Statistics/umaStatistics.ts", import.meta.url))
const row = (versionId, fields = {}) => ({ versionId, name: versionId, avatar: "", unresolved: false, races: 20, wins: 5, winRate: 25, cmEvents: 2, finalAppearances: 1, finalWins: 1, distances: [], ...fields })

test("ranking categories are specific to CM, LoH and Overall, with raw points replacing top-three finishes", () => {
  const ids = scope => getUmaRankingModes(scope).map(mode => mode.id)
  assert.deepEqual(ids("cm"), ["wins", "races", "events", "final-appearances", "final-a-wins", "win-rate"])
  assert.deepEqual(ids("loh"), ["wins", "races", "events", "raw-points", "win-rate"])
  assert.deepEqual(ids("overall"), ["wins", "races", "events"])
})

test("each category ranks by its own scoped value with stable competition places for ties", () => {
  const umas = [row("a", { wins: 8, races: 30 }), row("b", { wins: 12, races: 20 }), row("c", { wins: 8, races: 15 })]
  const snapshot = structuredClone(umas)
  assert.deepEqual(rankUmaOverview(umas, "wins").map(row => [row.uma.versionId, row.value, row.place]), [["b", 12, 1], ["a", 8, 2], ["c", 8, 2]])
  assert.deepEqual(rankUmaOverview(umas, "races").map(row => row.uma.versionId), ["a", "b", "c"])
  assert.deepEqual(rankUmaOverview([row("a"), row("b"), row("c", { wins: 1 })], "wins").map(row => row.place), [1, 1, 3])
  assert.deepEqual(umas, snapshot)
})

test("appearances add the existing per-type event counts without combining race or point measures", () => {
  const ranking = rankUmaOverview([row("cm", { cmEvents: 3 }), row("loh", { cmEvents: 0, lohEvents: 5 }), row("both", { cmEvents: 3, lohEvents: 4 })], "events")
  assert.deepEqual(ranking.map(row => [row.uma.versionId, row.value]), [["both", 7], ["loh", 5], ["cm", 3]])
})

test("Raw PT ranks known Main Stage totals and excludes unknown legacy totals", () => {
  const ranking = rankUmaOverview([row("cap", { rawPoints: 5000, leagueScore: 4000 }), row("extra", { rawPoints: 0, extraStageAppearances: 1 }), row("unknown", { rawPoints: null }), row("less", { rawPoints: 800 })], "raw-points")
  assert.deepEqual(ranking.map(row => [row.uma.versionId, row.value]), [["cap", 5000], ["less", 800], ["extra", 0]])
  assert.equal(formatUmaRankingValue(ranking[0].value, "raw-points"), "5,000 PT")
})

test("Highest Win Rate uses the existing minimum race threshold and never ranks a single lucky race", () => {
  const ranking = rankUmaOverview([row("one", { races: 1, wins: 1, winRate: 100 }), row("eligible", { races: MIN_RACES_FOR_WIN_RATE, winRate: 60 }), row("empty", { races: 0, winRate: null })], "win-rate")
  assert.deepEqual(ranking.map(row => [row.uma.versionId, row.value]), [["eligible", 60]])
  assert.equal(formatUmaRankingValue(60, "win-rate"), "60.0%")
  assert.equal(formatUmaRankingValue(null, "win-rate"), "—")
  assert.deepEqual(rankUmaOverview([], "wins"), [])
  assert.deepEqual(rankUmaOverview([row("unknown", { rawPoints: null })], "raw-points"), [])
})

const config = versionId => ({ umaVersionId: versionId, runningStyle: "pace_chaser", ace: false, debuffer: false, entrySource: "manual", configurationSource: "recorded" })
function cm(number, group = "A", fields = {}) {
  return { number, name: "CM", track: "Tokyo", surface: "Turf", distance: 1600, length: "Mile", finalPlace: "1st", participants: [],
    attempts: [1, 3].map(day => ({ day, attempt: 1, racesPlayed: 5, retired: false, umaWins: [{ cmUmaId: "a", wins: group === "B" && day === 3 ? 2 : 3, configuration: config("fuji") }] })),
    finalResults: [{ cmUmaId: "a", placement: "first", won: true, placementSource: "recorded", configuration: config("fuji") }], ...fields }
}

test("Final A wins reuse recorded individual winners and exclude Final B, unknown groups and pending finals", () => {
  const cms = [cm(1), cm(2), cm(3, "B"), cm(4, "A", { attempts: [] }), cm(5, "A", { finalPlace: "" }), cm(6, "A", { finalResults: [{ cmUmaId: "a", placement: "second", won: false, configuration: config("fuji") }] })]
  const before = structuredClone(cms)
  const totals = getUmaFinalAWins(cms, [row("fuji"), row("alternate")])
  assert.equal(totals.get("fuji"), 2)
  assert.equal(totals.get("alternate"), 0)
  assert.deepEqual(rankUmaOverview([row("fuji"), row("alternate")], "final-a-wins", totals).map(row => [row.uma.versionId, row.value]), [["fuji", 2]])
  assert.deepEqual(cms, before)
})

test("recorded final snapshots keep alternate identities and duplicate references count one win per event", () => {
  const winner = { cmUmaId: "a", placement: "first", won: true, configuration: config("alternate") }
  const cms = [cm(1, "A", { finalResults: [winner, { ...winner, cmUmaId: "duplicate" }] })]
  const scopes = getUmaOverviewStatistics(cms, [], [], [{ id: "fuji", displayName: "Fuji" }, { id: "alternate", displayName: "Alternate" }])
  const totals = getUmaFinalAWins(cms, scopes.cm.umas)
  assert.equal(totals.get("alternate"), 1)
  assert.equal(totals.get("fuji"), 0)
})
