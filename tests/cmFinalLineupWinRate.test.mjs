import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"
import ts from "typescript"
import { importTS } from "./helpers/importTS.mjs"

const { getHistoricalParticipantEntries, getParticipantConfigurationKey } = await importTS(new URL("../src/CMs/cmParticipantPresentation.ts", import.meta.url))
const { calculateUmaStatistics } = await importTS(new URL("../src/Statistics/umaStatistics.ts", import.meta.url))
const { calculateOverallWinRateFromAttempts } = await importTS(new URL("../src/CMs/CMCalculations.ts", import.meta.url))

// Run the actual local Final Lineup badge adapter, not a test copy of its calculation.
const url = new URL("../src/CMs/CMUmas.tsx", import.meta.url)
const file = ts.createSourceFile(url.pathname, readFileSync(url, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const component = file.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === "CMUmas")
const helper = component.body.statements.find(node => ts.isVariableStatement(node) && node.declarationList.declarations.some(declaration => declaration.name.getText(file) === "getFinalConfigurationStats"))
assert.ok(helper)
const compiled = ts.transpileModule(helper.getText(file), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText
const createAdapter = new Function("historicalParticipants", "getParticipantConfigurationKey", compiled + "\nreturn getFinalConfigurationStats")
const finalStats = cm => createAdapter(getHistoricalParticipantEntries(cm), getParticipantConfigurationKey)(cm.finalResults[0].configuration)

const config = (style, extra = {}) => ({ umaVersionId: "fuji", runningStyle: style, ace: false, debuffer: true, entrySource: "manual", configurationSource: "recorded", ...extra })
const versions = ["fuji", "b", "c"].map(id => ({ id, characterId: id, displayName: id, versionName: "Original", archived: false }))
function fixture(selected = config("late_surger"), final = "win") {
  const participants = versions.map(version => ({ cmUmaId: version.id, umaId: version.id, runningStyle: "end_closer", ace: true, debuffer: false, autoRun: true, finalParticipant: true, won: version.id === "fuji" && final === "win" }))
  const attempts = [config("pace_chaser"), config("late_surger")].map((configuration, i) => ({ day: i === 0 ? 1 : 3, attempt: 1, racesPlayed: 5, retired: false,
    umaWins: [{ cmUmaId: "fuji", wins: i === 0 ? 3 : 5, configuration }] }))
  const finalResults = versions.map(version => ({ cmUmaId: version.id, placement: version.id === "fuji" && final === "win" ? "first" : null,
    placementSource: "recorded", won: version.id === "fuji" && final === "win", configuration: version.id === "fuji" ? selected : { ...config("pace_chaser"), umaVersionId: version.id } }))
  return { number: 1, name: "Final WR scopes", track: "Tokyo", distance: 2400, surface: "Turf", length: "Medium", direction: "Left", weather: "Sunny", season: "Spring", condition: "Firm", league: "Graded League", participants, currentLineup: ["fuji", "b", "c"], attempts, finalResults,
    phase: final === "pending" ? "finalResult" : "completed", finalPlace: final === "pending" ? "" : final === "win" ? "1st" : "2nd", log: [] }
}
function overallUma(cm) {
  const statistics = calculateUmaStatistics([cm], [{ id: "fuji", name: "Fuji Kiseki" }], versions)
  const fuji = statistics.umas.find(uma => uma.versionId === "fuji")
  const races = fuji.races, wins = fuji.wins
  return { fuji, races, wins, winRate: wins / races * 100 }
}

test("Final LS WR is 6/6 = 100%, while Uma totals and CM overall remain 9/11 = 81.82%", () => {
  const cm = fixture(), before = structuredClone(cm)
  assert.deepEqual(finalStats(cm), { races: 6, wins: 6, winRate: 100 })
  const overall = overallUma(cm)
  assert.deepEqual([overall.races, overall.wins], [11, 9])
  assert.equal(overall.winRate.toFixed(2), "81.82")
  assert.equal(calculateOverallWinRateFromAttempts(cm).toFixed(2), "81.82")
  assert.deepEqual([overall.fuji.races, overall.fuji.wins, overall.fuji.finalAppearances, overall.fuji.finalWins], [11, 9, 1, 1])
  assert.equal(overall.fuji.winRate.toFixed(2), "81.82")
  assert.deepEqual(getHistoricalParticipantEntries(cm).filter(entry => entry.configuration.umaVersionId === "fuji").map(entry => [entry.configuration.runningStyle, entry.winRate]), [["pace_chaser", 60], ["late_surger", 100]])
  assert.deepEqual(cm, before)
})

test("a newly registered EC configuration has 0/0 before the final, 1/1 on a win and 0/1 on a loss", () => {
  const selected = config("end_closer")
  assert.deepEqual(finalStats(fixture(selected, "pending")), { races: 0, wins: 0, winRate: 0 })
  assert.deepEqual(finalStats(fixture(selected, "win")), { races: 1, wins: 1, winRate: 100 })
  assert.deepEqual(finalStats(fixture(selected, "loss")), { races: 1, wins: 0, winRate: 0 })
  const win = fixture(selected, "win"), overall = overallUma(win)
  assert.deepEqual([overall.races, overall.wins, overall.winRate.toFixed(2), calculateOverallWinRateFromAttempts(win).toFixed(2)], [11, 9, "81.82", "81.82"])
})

test("a selected PC loss counts only PC rounds plus the final and never borrows LS wins", () => {
  const cm = fixture(config("pace_chaser"), "loss")
  assert.deepEqual(finalStats(cm), { races: 6, wins: 3, winRate: 50 })
  assert.deepEqual([overallUma(cm).races, overallUma(cm).wins], [11, 8])
  assert.equal(calculateOverallWinRateFromAttempts(cm).toFixed(2), "72.73")
})

test("Final Lineup matching uses Ace, Debuffer, entry source and version as well as style", () => {
  for (const selected of [config("late_surger", { ace: true }), config("late_surger", { debuffer: false }), config("late_surger", { entrySource: "autorun" }), config("late_surger", { umaVersionId: "fuji-alternate" })]) {
    assert.deepEqual(finalStats(fixture(selected, "pending")), { races: 0, wins: 0, winRate: 0 })
    assert.deepEqual(finalStats(fixture(selected, "win")), { races: 1, wins: 1, winRate: 100 })
  }
  const cm = fixture(config("late_surger", { configurationSource: "legacy_inferred" }))
  assert.equal(finalStats(cm).winRate, 100)
})
