import assert from "node:assert/strict"
import test from "node:test"
import { importTS } from "./helpers/importTS.mjs"

const { hasCompleteCMLineup, snapshotAttemptResults, completeCMFinal } = await importTS(new URL("../src/CMs/cmParticipantConfiguration.ts", import.meta.url))
const { calculateUmaStatistics } = await importTS(new URL("../src/Statistics/umaStatistics.ts", import.meta.url))
const { calculateUmaRunningStyleStatistics } = await importTS(new URL("../src/Statistics/umaRunningStyleStatistics.ts", import.meta.url))
const { calculateUmaRoleStatistics } = await importTS(new URL("../src/Statistics/umaRoleStatistics.ts", import.meta.url))
const { calculateTrackStatistics } = await importTS(new URL("../src/Statistics/trackStatistics.ts", import.meta.url))
const { isImportedProfileFile } = await importTS(new URL("../src/profiles/profileTransfer.ts", import.meta.url))
const { PROFILE_DATA_VERSION } = await importTS(new URL("../src/profiles/profileDataMigration.ts", import.meta.url))

const event = (count) => {
  const participants = ["a", "b", "c"].slice(0, count).map((id, index) => ({
    cmUmaId: id, umaId: `uma-${id}`, runningStyle: "late_surger", ace: index === 0,
    debuffer: index === 1, autoRun: index === 2, won: false, finalParticipant: false,
  }))
  return { number: 1, name: "Optional lineup", track: "Tokyo", distance: 2000, surface: "Turf", length: "Medium",
    direction: "Left", weather: "Sunny", season: "Spring", condition: "Firm", phase: "attempts",
    participants, currentLineup: participants.map(p => p.cmUmaId), attempts: [], log: [], finalPlace: "" }
}

test("CM lineups can contain zero to three real participants, but only a complete lineup can record a new attempt", () => {
  for (const count of [0, 1, 2, 3]) assert.equal(hasCompleteCMLineup(event(count)), count === 3)
  const cm = event(3)
  for (const currentLineup of [["a", "a", "c"], ["a", "b", "missing"], ["a", "b", ""], ["a", "b", "c", "d"]]) {
    assert.equal(hasCompleteCMLineup({ ...cm, currentLineup }), false)
  }
  for (const umaId of ["", " ", undefined]) {
    assert.equal(hasCompleteCMLineup({ ...cm, participants: cm.participants.map(p => p.cmUmaId === "a" ? { ...p, umaId } : p) }), false)
  }
})

test("unrecorded empty and partial lineups create no Uma usage, performance, role or style statistics", () => {
  const cms = [0, 1, 2, 3].map((count, index) => ({ ...event(count), number: index + 1 }))
  const before = structuredClone(cms), umas = calculateUmaStatistics(cms, [], [])
  assert.deepEqual(umas.umas, [])
  assert.deepEqual(umas.overall, { umasUsed: 0, races: 0, wins: 0, winRate: null })
  for (const stats of [calculateUmaRunningStyleStatistics(cms), calculateUmaRoleStatistics(cms)]) {
    assert.equal(stats.totalRaces, 0)
    assert.ok(stats.rows.every(row => row.races === 0 && row.wins === 0 && row.usage === 0))
  }
  assert.deepEqual(calculateTrackStatistics(cms), { overall: { tracksUsed: 0, races: 0, wins: 0, winRate: null }, tracks: [] })
  assert.deepEqual(cms, before)
})

test("optional lineups remain valid in the current export and backup format without migration or placeholder records", () => {
  for (const count of [0, 1, 2, 3]) {
    const data = { dataVersion: PROFILE_DATA_VERSION, cms: [event(count)], lohs: [],
      customUmaDatabase: { customCharacters: [], customVersions: [], archivedVersionIds: [] },
      favoriteUmaId: "", cmViewMode: "detailed", seenOfficialVersionIds: [] }
    const file = JSON.parse(JSON.stringify({ format: "uma-tracker-profile", version: 1, profile: { sourceProfileId: "owner", name: "Trainer" }, data }))
    assert.equal(isImportedProfileFile(file), true)
    assert.equal(file.data.cms[0].participants.length, count)
    assert.equal(file.data.cms[0].currentLineup.length, count)
  }
})

test("recording after completing the lineup captures only real participants and retains historical snapshots after lineup edits", () => {
  const cm = event(3), attempt = { day: 1, attempt: 1, racesPlayed: 5, retired: false,
    umaWins: cm.currentLineup.map((cmUmaId, index) => ({ cmUmaId, wins: index === 0 ? 2 : 0 })) }
  const saved = snapshotAttemptResults(cm, attempt)
  assert.deepEqual(saved.umaWins.map(r => [r.configuration.umaVersionId, r.configuration.runningStyle, r.configuration.ace, r.configuration.debuffer, r.configuration.entrySource]),
    [["uma-a", "late_surger", true, false, "manual"], ["uma-b", "late_surger", false, true, "manual"], ["uma-c", "late_surger", false, false, "autorun"]])
  const edited = { ...cm, currentLineup: [], participants: [], attempts: [saved] }
  const corrected = snapshotAttemptResults(edited, { ...attempt, umaWins: attempt.umaWins.map(r => ({ ...r, wins: 1 })) })
  assert.deepEqual(corrected.umaWins.map(r => r.configuration), saved.umaWins.map(r => r.configuration))
  const stats = calculateUmaStatistics([edited], [], [])
  assert.equal(stats.overall.races, 5); assert.equal(stats.overall.wins, 2); assert.equal(stats.overall.umasUsed, 3)
  assert.ok(stats.umas.every(uma => uma.races === 5))
})

test("an empty CM cannot complete a final result, while the normal full final lineup still works", () => {
  const empty = { ...event(0), phase: "finalResult", finalPlace: "2nd" }
  assert.throws(() => completeCMFinal(empty), /Save the Final Lineup/)
  const full = { ...event(3), phase: "finalResult", finalPlace: "2nd" }
  full.participants = full.participants.map(p => ({ ...p, finalParticipant: true }))
  const completed = completeCMFinal(full)
  assert.equal(completed.phase, "completed"); assert.equal(completed.finalResults.length, 3)
})
