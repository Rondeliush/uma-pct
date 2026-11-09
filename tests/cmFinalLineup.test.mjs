import assert from "node:assert/strict"
import test from "node:test"
import { importTS } from "./helpers/importTS.mjs"

const { getFinalLineupCandidates, isFinalLineupCandidateLocked, toggleFinalLineupCandidate, saveFinalLineupCandidates } = await importTS(new URL("../src/CMs/cmFinalLineupCandidates.ts", import.meta.url))
const { getHistoricalParticipantEntries, getParticipantConfigurationKey } = await importTS(new URL("../src/CMs/cmParticipantPresentation.ts", import.meta.url))
const { changeCMTeamResult, changeCMUmaPlacement, completeCMFinal } = await importTS(new URL("../src/CMs/cmParticipantConfiguration.ts", import.meta.url))
const { migrateProfileData, PROFILE_DATA_VERSION } = await importTS(new URL("../src/profiles/profileDataMigration.ts", import.meta.url))
const { isImportedProfileFile } = await importTS(new URL("../src/profiles/profileTransfer.ts", import.meta.url))

const versions = ["fuji", "b", "c", "d", "fuji-alt"].map(id => ({ id, characterId: id === "fuji-alt" ? "fuji" : id, displayName: id }))
const configuration = (style, extra = {}) => ({ umaVersionId: "fuji", runningStyle: style, ace: false, debuffer: true, entrySource: "manual", configurationSource: "recorded", ...extra })
function fixture() {
  const participants = versions.map(version => ({ cmUmaId: version.id, umaId: version.id, runningStyle: "late_surger", ace: false, debuffer: true, autoRun: false, finalParticipant: false, won: false }))
  const attempts = [configuration("pace_chaser"), configuration("late_surger")].map((config, i) => ({ day: i === 0 ? 1 : 3, attempt: 1, racesPlayed: 5, retired: false,
    umaWins: [{ cmUmaId: "fuji", wins: i === 0 ? 3 : 5, configuration: config }] }))
  return { number: 1, name: "Configuration selection", track: "Tokyo", surface: "Turf", distance: 2400, length: "Medium", direction: "Left", weather: "Sunny", season: "Spring", condition: "Firm", league: "Graded League", phase: "finalLineup", participants, currentLineup: ["fuji", "b", "c"], attempts, finalPlace: "", log: [] }
}
const candidates = (cm, draft = []) => getFinalLineupCandidates(cm, versions, draft)
const fujiStyle = (cm, style) => candidates(cm).find(candidate => candidate.umaVersionId === "fuji" && candidate.configuration.runningStyle === style)
const other = (cm, id) => candidates(cm).find(candidate => candidate.umaVersionId === id)
const chooseThree = cm => [fujiStyle(cm, "pace_chaser"), other(cm, "b"), other(cm, "c")]


test("Fuji PC 3/5 and LS 5/5 remain separate selectable snapshots with 60% and 100% WR", () => {
  const cm = fixture(), before = structuredClone(cm), history = getHistoricalParticipantEntries(cm)
  const fuji = candidates(cm).filter(candidate => candidate.umaVersionId === "fuji")
  assert.deepEqual(fuji.map(candidate => [candidate.configuration.runningStyle, candidate.configuration.debuffer, candidate.races, candidate.wins, candidate.winRate]), [["pace_chaser", true, 5, 3, 60], ["late_surger", true, 5, 5, 100]])
  assert.equal(new Set(fuji.map(candidate => candidate.key)).size, 2)
  assert.deepEqual(getHistoricalParticipantEntries(cm), history)
  assert.deepEqual(cm, before)
})

test("configuration identity keeps every role/source/style distinct and reuses exact historical stats", () => {
  const cm = fixture(), base = configuration("pace_chaser")
  const configs = [base, { ...base, ace: true }, { ...base, debuffer: false }, { ...base, entrySource: "autorun" }, { ...base, runningStyle: "end_closer" }]
  cm.attempts = configs.map((config, i) => ({ day: i < 4 ? 1 : 2, attempt: i % 4 + 1, racesPlayed: 5, retired: false, umaWins: [{ cmUmaId: "fuji", wins: i, configuration: config }] }))
  cm.participants[0] = { ...cm.participants[0], runningStyle: "pace_chaser" }
  const fuji = candidates(cm).filter(candidate => candidate.umaVersionId === "fuji")
  assert.equal(fuji.length, 5)
  assert.deepEqual(fuji.map(candidate => candidate.configuration), configs)
  assert.deepEqual(fuji.map(candidate => candidate.winRate), [0, 20, 40, 60, 80])
  assert.ok(fuji.every(candidate => candidate.key === getParticipantConfigurationKey(candidate.configuration)))
})

test("one selected Fuji configuration locks its other styles and outfits, and deselection unlocks them", () => {
  const cm = fixture(), pc = fujiStyle(cm, "pace_chaser"), ls = fujiStyle(cm, "late_surger"), alternate = other(cm, "fuji-alt")
  let draft = toggleFinalLineupCandidate([], pc)
  assert.equal(isFinalLineupCandidateLocked(pc, draft), false)
  for (const candidate of [ls, alternate]) {
    assert.equal(isFinalLineupCandidateLocked(candidate, draft), true)
    assert.deepEqual(toggleFinalLineupCandidate(draft, candidate), draft)
  }
  draft = toggleFinalLineupCandidate(draft, pc)
  assert.deepEqual(draft, [])
  assert.equal(isFinalLineupCandidateLocked(ls, draft), false)
  draft = toggleFinalLineupCandidate(draft, ls)
  draft = toggleFinalLineupCandidate(draft, other(cm, "b"))
  draft = toggleFinalLineupCandidate(draft, other(cm, "c"))
  assert.equal(draft.length, 3)
  assert.equal(isFinalLineupCandidateLocked(other(cm, "d"), draft), true)
  assert.deepEqual(toggleFinalLineupCandidate(draft, other(cm, "d")), draft)
})

test("Add New creates EC with zero stats, preserves a selected LS, and reuses PC instead of duplicating it", () => {
  const cm = fixture(), before = structuredClone(cm.attempts), ls = fujiStyle(cm, "late_surger")
  const draft = toggleFinalLineupCandidate([], ls)
  cm.participants[0] = { ...cm.participants[0], runningStyle: "end_closer" }
  const fuji = candidates(cm, draft).filter(candidate => candidate.umaVersionId === "fuji")
  assert.deepEqual(fuji.map(candidate => [candidate.configuration.runningStyle, candidate.winRate]), [["pace_chaser", 60], ["late_surger", 100], ["end_closer", 0]])
  assert.equal(draft[0].configuration.runningStyle, "late_surger")
  assert.equal(isFinalLineupCandidateLocked(fuji[2], draft), true)
  cm.participants[0] = { ...cm.participants[0], runningStyle: "pace_chaser" }
  assert.equal(candidates(cm, draft).filter(candidate => candidate.umaVersionId === "fuji").length, 2)
  assert.deepEqual(cm.attempts, before)
})

test("a selected unused current configuration survives a later edit even if no race ever used it", () => {
  const cm = fixture()
  cm.participants[0] = { ...cm.participants[0], runningStyle: "end_closer" }
  const ec = fujiStyle(cm, "end_closer"), draft = toggleFinalLineupCandidate([], ec)
  cm.participants[0] = { ...cm.participants[0], runningStyle: "runaway", ace: true }
  assert.ok(candidates(cm, draft).some(candidate => candidate.key === ec.key))
  const saved = saveFinalLineupCandidates(cm, [...draft, other(cm, "b"), other(cm, "c")], versions)
  assert.deepEqual(saved.finalResults[0].configuration, ec.configuration)
  assert.equal(saved.participants[0].runningStyle, "runaway")
})

test("Save uses the chosen PC snapshot while Edit CM is EC and keeps current lineup, attempts and log semantics", () => {
  const cm = fixture(), draft = chooseThree(cm), history = structuredClone(cm.attempts), pc = structuredClone(draft[0].configuration)
  cm.participants[0] = { ...cm.participants[0], runningStyle: "end_closer", ace: true, autoRun: true }
  cm.currentLineup = ["fuji", "c", "d"]
  const before = structuredClone(cm)
  const saved = saveFinalLineupCandidates(cm, draft, versions, { timestamp: "2026-10-30T12:00:00.000Z", logId: "final-test" })
  assert.equal(saved.phase, "finalResult")
  assert.deepEqual(saved.finalResults[0].configuration, pc)
  assert.deepEqual(saved.finalResults.map(result => result.cmUmaId), ["fuji", "b", "c"])
  assert.equal(saved.participants[0].runningStyle, "end_closer")
  assert.deepEqual(saved.currentLineup, before.currentLineup)
  assert.deepEqual(saved.attempts, history)
  assert.deepEqual(cm, before)
  assert.equal(saved.log.at(-1).type, "finalLineupSet")
  assert.equal(saved.log.at(-1).message, "Final Lineup set.")
  assert.deepEqual(saved.log.at(-1).details, ["fuji", "b", "c"])
  const completed = completeCMFinal(changeCMUmaPlacement(changeCMTeamResult(saved, "1st"), "fuji", "first"))
  assert.equal(completed.phase, "completed")
  assert.deepEqual(completed.finalResults[0].configuration, pc)
  assert.deepEqual(completed.attempts, history)
})

test("pending chosen configurations survive serialized profile reload and retain unknown historical provenance", () => {
  const cm = fixture()
  cm.attempts[0].umaWins[0].configuration = { ...cm.attempts[0].umaWins[0].configuration, ace: null, configurationSource: "legacy_inferred" }
  const draft = chooseThree(cm), saved = saveFinalLineupCandidates(cm, draft, versions)
  const data = { dataVersion: PROFILE_DATA_VERSION, cms: [saved], lohs: [], customUmaDatabase: { customCharacters: [], customVersions: [], archivedVersionIds: [] }, favoriteUmaId: "", cmViewMode: "detailed", seenOfficialVersionIds: [] }
  const file = { format: "uma-tracker-profile", version: 1, profile: { sourceProfileId: "candidate-test", name: "Candidate test" }, data }
  assert.ok(isImportedProfileFile(JSON.parse(JSON.stringify(file))))
  const reloaded = migrateProfileData(JSON.parse(JSON.stringify(data))).cms[0]
  assert.deepEqual(reloaded.finalResults, saved.finalResults)
  assert.equal(reloaded.finalResults[0].configuration.ace, null)
  assert.equal(reloaded.finalResults[0].configuration.configurationSource, "legacy_inferred")
})

test("historical configurations stay selectable after their original participant record disappeared", () => {
  const cm = fixture(), history = structuredClone(cm.attempts)
  cm.participants = cm.participants.filter(uma => uma.umaId !== "fuji")
  cm.currentLineup = ["b", "c", "d"]
  const draft = chooseThree(cm)
  assert.equal(draft[0].participantId, null)
  const saved = saveFinalLineupCandidates(cm, draft, versions)
  const fuji = saved.participants.find(uma => uma.umaId === "fuji")
  assert.ok(fuji.finalParticipant)
  assert.equal(saved.finalResults[0].cmUmaId, fuji.cmUmaId)
  assert.deepEqual(saved.attempts, history)
  assert.deepEqual(saved.currentLineup, cm.currentLineup)
})

test("Save enforces three different Umas and closes registration without changing malformed choices", () => {
  const cm = fixture(), before = structuredClone(cm), pc = fujiStyle(cm, "pace_chaser"), ls = fujiStyle(cm, "late_surger")
  for (const draft of [[], [pc], [pc, ls, other(cm, "b")], [pc, other(cm, "fuji-alt"), other(cm, "b")], [...chooseThree(cm), other(cm, "d")]]) assert.throws(() => saveFinalLineupCandidates(cm, draft, versions))
  assert.throws(() => saveFinalLineupCandidates(cm, [{ ...pc, configuration: { ...pc.configuration, runningStyle: "runaway" } }, other(cm, "b"), other(cm, "c")], versions))
  for (const phase of ["attempts", "finalResult", "completed", "eliminated"]) assert.throws(() => saveFinalLineupCandidates({ ...cm, phase }, chooseThree(cm), versions))
  assert.deepEqual(cm, before)
})
