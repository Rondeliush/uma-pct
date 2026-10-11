import assert from "node:assert/strict"
import test from "node:test"
import { importTS } from "./helpers/importTS.mjs"

const { CM_FINAL_PLACEMENTS, CM_FINAL_PLACEMENT_LABELS, isCMFinalPlacementAllowed, assertCMFinalResults } = await importTS(new URL("../src/CMs/cmFinalPlacements.ts", import.meta.url))
const { changeCMTeamResult, changeCMUmaPlacement, completeCMFinal, snapshotFinalResults, getCMFinalResults } = await importTS(new URL("../src/CMs/cmParticipantConfiguration.ts", import.meta.url))
const { migrateProfileData, PROFILE_DATA_VERSION } = await importTS(new URL("../src/profiles/profileDataMigration.ts", import.meta.url))
const { isImportedProfileFile } = await importTS(new URL("../src/profiles/profileTransfer.ts", import.meta.url))
const { writeProfileBackupFile } = await importTS(new URL("../src/backup/backupFile.ts", import.meta.url))

const participants = () => ["a", "b", "c"].map((id) => ({ cmUmaId: id, umaId: "uma-" + id, runningStyle: "pace_chaser", ace: id === "a", debuffer: id === "b", autoRun: id === "c", finalParticipant: true, won: false }))
const cm = (extra = {}) => ({ number: 1, name: "Final check", track: "Tokyo", surface: "Turf", distance: 2000, length: "Medium", direction: "Left", weather: "Sunny", season: "Spring", condition: "Firm", phase: "finalResult", finalPlace: "", participants: participants(), currentLineup: ["a", "b", "c"], attempts: [], log: [], ...extra })
const setup = (team = "1st") => changeCMTeamResult(cm(), team)
const place = (event, id, placement) => changeCMUmaPlacement(event, id, placement)
const profile = (event, extra = {}) => ({ dataVersion: PROFILE_DATA_VERSION, cms: [event], lohs: [], customUmaDatabase: { customCharacters: [], customVersions: [], archivedVersionIds: [] }, favoriteUmaId: "", cmViewMode: "detailed", seenOfficialVersionIds: [], ...extra })
const file = (data) => ({ format: "uma-tracker-profile", version: 1, profile: { sourceProfileId: "final-check-source", name: "Final check" }, data })
const placements = (event) => event.finalResults.map((result) => result.placement)

test("controls and save helpers require the team result first, with exact UI labels", () => {
  assert.deepEqual(CM_FINAL_PLACEMENT_LABELS, { first: "1st", second: "2nd", third: "3rd", fourth_or_lower: "4th+" })
  assert.throws(() => place(cm(), "a", "first"), /team result first/)
  assert.throws(() => changeCMTeamResult(cm(), "4th"), /Invalid team/)
  assert.throws(() => completeCMFinal(cm()), /team result first/)
  assert.equal(snapshotFinalResults(cm()).finalResults, undefined)
})

test("Team 1st allows every placement and requires exactly one first to complete", () => {
  for (const placement of CM_FINAL_PLACEMENTS) assert.equal(isCMFinalPlacementAllowed("1st", placement), true)
  const initial = setup()
  assert.throws(() => completeCMFinal(initial), /exactly one/)
  assert.throws(() => completeCMFinal(place(place(initial, "b", "second"), "c", "third")), /exactly one/)
  for (const other of ["second", "third", "fourth_or_lower", null]) {
    const completed = completeCMFinal(place(place(initial, "a", "first"), "b", other))
    assert.equal(completed.phase, "completed")
    assert.deepEqual(completed.finalResults.map((r) => r.won), [true, false, false])
    assert.deepEqual(completed.participants.map((p) => p.won), [true, false, false])
  }
  const before = structuredClone(initial)
  assert.throws(() => place(place(initial, "a", "first"), "b", "first"), /only one Uma/)
  assert.deepEqual(initial, before)
})

test("Team 2nd rejects first, permits second/third/4th+, and does not require an individual second", () => {
  assert.equal(isCMFinalPlacementAllowed("2nd", "first"), false)
  assert.throws(() => place(setup("2nd"), "a", "first"), /better than the team/)
  for (const placement of ["second", "third", "fourth_or_lower", null]) assert.equal(isCMFinalPlacementAllowed("2nd", placement), true)
  const event = place(place(place(setup("2nd"), "a", "third"), "b", "fourth_or_lower"), "c", "fourth_or_lower")
  assert.equal(completeCMFinal(event).phase, "completed")
  assert.equal(completeCMFinal(setup("2nd")).phase, "completed")
})

test("Team 3rd rejects first and second, allows third/4th+, and does not require an individual third", () => {
  for (const placement of ["first", "second"]) assert.throws(() => place(setup("3rd"), "a", placement), /better than the team/)
  for (const placement of ["third", "fourth_or_lower", null]) assert.equal(isCMFinalPlacementAllowed("3rd", placement), true)
  let event = setup("3rd")
  for (const id of ["a", "b", "c"]) event = place(event, id, "fourth_or_lower")
  assert.equal(completeCMFinal(event).phase, "completed")
  assert.equal(completeCMFinal(setup("3rd")).phase, "completed")
})

test("all three podium ranks are unique; multiple fourth_or_lower and null values are valid", () => {
  for (const placement of ["first", "second", "third"]) {
    const event = place(setup(), "a", placement)
    assert.throws(() => place(event, "b", placement), /only one Uma/)
    const malformed = { ...event, finalResults: event.finalResults.map((r) => ({ ...r, placement, won: placement === "first" })) }
    assert.throws(() => assertCMFinalResults(malformed), /only one Uma/)
    assert.equal(isImportedProfileFile(file(profile(malformed))), false)
  }
  const repeated = place(place(setup("3rd"), "a", "fourth_or_lower"), "b", "fourth_or_lower")
  assert.doesNotThrow(() => assertCMFinalResults(repeated))
})

test("team changes clear only now-invalid placements and never silently promote them", () => {
  const event = place(place(place(setup(), "a", "first"), "b", "second"), "c", "fourth_or_lower")
  const snapshots = event.finalResults.map((r) => r.configuration)
  const second = changeCMTeamResult(event, "2nd")
  assert.deepEqual(placements(second), [null, "second", "fourth_or_lower"])
  assert.ok(second.participants.every((p) => !p.won))
  const third = changeCMTeamResult(second, "3rd")
  assert.deepEqual(placements(third), [null, null, "fourth_or_lower"])
  assert.deepEqual(placements(changeCMTeamResult(third, "1st")), [null, null, "fourth_or_lower"])
  for (const changed of [second, third]) changed.finalResults.forEach((r, i) => assert.strictEqual(r.configuration, snapshots[i]))
  assert.deepEqual(placements(event), ["first", "second", "fourth_or_lower"])
})

test("valid third survives a team change, and clearing the team clears the final records and winner", () => {
  const event = place(place(setup(), "a", "first"), "b", "third")
  assert.deepEqual(placements(changeCMTeamResult(event, "3rd")), [null, "third", null])
  const cleared = changeCMTeamResult(event, "")
  assert.equal(cleared.finalResults, undefined)
  assert.ok(cleared.participants.every((p) => !p.won))
})

test("winner corrections use placement as the canonical source, including explicit null", () => {
  const first = place(setup(), "a", "first")
  const cleared = place(first, "a", null)
  assert.equal(cleared.finalResults[0].won, false)
  assert.throws(() => completeCMFinal(cleared), /exactly one/)
  const next = place(cleared, "b", "first")
  assert.deepEqual(next.participants.map((p) => p.won), [false, true, false])
  const stale = { ...next, participants: next.participants.map((p) => ({ ...p, won: p.cmUmaId === "a" })), finalResults: next.finalResults.map((r) => ({ ...r, won: r.cmUmaId === "a" })) }
  const migrated = migrateProfileData(profile(stale)).cms[0]
  assert.deepEqual(placements(migrated), [null, "first", null])
  assert.deepEqual(migrated.finalResults.map((r) => r.won), [false, true, false])
  assert.deepEqual(migrated.participants.map((p) => p.won), [false, true, false])
  assert.equal(isImportedProfileFile(file(profile(stale))), false)
})

test("only saved finalists can receive a placement; invalid values are rejected", () => {
  assert.throws(() => place(setup(), "not-a-finalist", "first"), /saved Final Lineup/)
  for (const value of ["1st", "fourth", 0, undefined, {}, "Off Podium"]) assert.throws(() => place(setup(), "a", value), /Invalid individual/)
})

test("current version, role, style, entry source and participant removal cannot rewrite final history", () => {
  const saved = completeCMFinal(place(place(setup(), "a", "first"), "b", "second"))
  const edited = { ...saved, participants: saved.participants.map((p) => ({ ...p, umaId: "different", runningStyle: "end_closer", ace: false, debuffer: true, autoRun: true })) }
  const reloaded = migrateProfileData(profile(edited)).cms[0]
  assert.deepEqual(reloaded.finalResults, saved.finalResults)
  assert.deepEqual(snapshotFinalResults({ ...reloaded, participants: [] }).finalResults, saved.finalResults)
  const correction = place({ ...reloaded, participants: [] }, "b", "third")
  assert.equal(correction.phase, "finalResult")
  assert.deepEqual(placements(correction), ["first", "third", null])
  assert.deepEqual(correction.finalResults.map((r) => r.configuration), saved.finalResults.map((r) => r.configuration))
})

test("an explicit Final Lineup correction preserves retained historical records and gives new entrants unknown placement", () => {
  const saved = place(place(setup(), "a", "first"), "b", "second")
  const updatedParticipants = [...saved.participants.map((p) => ({ ...p, finalParticipant: p.cmUmaId !== "c" })), { ...saved.participants[2], cmUmaId: "d" }]
  const changed = snapshotFinalResults({ ...saved, participants: updatedParticipants }, { lineupChanged: true })
  assert.deepEqual(changed.finalResults.map((r) => r.cmUmaId), ["a", "b", "d"])
  assert.deepEqual(placements(changed), ["first", "second", null])
  assert.strictEqual(changed.finalResults[0], saved.finalResults[0])
  assert.equal(changed.finalResults[2].placementSource, "recorded")
})

test("v0 and v1 known old winners migrate to first, other places stay null, and team results are preserved", () => {
  for (const dataVersion of [undefined, 0, 1]) {
    const original = profile(cm({ finalPlace: "1st", phase: "completed", participants: participants().map((p) => ({ ...p, won: p.cmUmaId === "b" })) }), { dataVersion })
    const before = structuredClone(original)
    const migrated = migrateProfileData(original)
    assert.deepEqual(placements(migrated.cms[0]), [null, "first", null])
    assert.equal(migrated.cms[0].finalPlace, "1st")
    assert.ok(migrated.cms[0].finalResults.every((r) => r.placementSource === "legacy_inferred"))
    assert.equal(migrated.dataVersion, 2)
    assert.deepEqual(original, before)
    assert.strictEqual(migrateProfileData(migrated), migrated)
    assert.ok(isImportedProfileFile(file(migrated)))
  }
})

test("legacy snapshot winner is authoritative over changed current flags and missing participants", () => {
  const recorded = place(setup(), "b", "first")
  const original = profile({ ...recorded, phase: "completed", participants: [], finalResults: recorded.finalResults.map((r) => { const old = { ...r }; delete old.placement; delete old.placementSource; return old }) }, { dataVersion: 1 })
  assert.ok(isImportedProfileFile(file(original)))
  const migrated = migrateProfileData(original)
  assert.deepEqual(placements(migrated.cms[0]), [null, "first", null])
  assert.deepEqual(migrated.cms[0].finalResults.map((r) => r.configuration), recorded.finalResults.map((r) => r.configuration))
})

test("legacy non-winning finals do not infer second/third/4th+", () => {
  for (const finalPlace of ["2nd", "3rd"]) {
    const original = profile(cm({ finalPlace, phase: "completed" }), { dataVersion: 1 })
    const migrated = migrateProfileData(original)
    assert.deepEqual(placements(migrated.cms[0]), [null, null, null])
    assert.equal(migrated.cms[0].finalPlace, finalPlace)
  }
})

test("unknown or ambiguous legacy winners remain unknown and restorable, but cannot complete a new result", () => {
  for (const wonIds of [[], ["a", "b"]]) {
    const migrated = migrateProfileData(profile(cm({ finalPlace: "1st", phase: "completed", participants: participants().map((p) => ({ ...p, won: wonIds.includes(p.cmUmaId) })) }), { dataVersion: 1 }))
    assert.deepEqual(placements(migrated.cms[0]), [null, null, null])
    assert.ok(isImportedProfileFile(file(migrated)))
    assert.throws(() => completeCMFinal(migrated.cms[0]), /exactly one/)
  }
})

test("save/migration boundaries reject new completed first-place results without one first, invalid ranks and duplicate podiums", () => {
  const noWinner = { ...setup(), phase: "completed" }
  assert.throws(() => migrateProfileData(profile(noWinner)), /exactly one/)
  assert.equal(isImportedProfileFile(file(profile(noWinner))), false)
  const betterThanTeam = { ...place(setup(), "a", "first"), finalPlace: "2nd" }
  assert.throws(() => migrateProfileData(profile(betterThanTeam)), /better than the team/)
  assert.equal(isImportedProfileFile(file(profile(betterThanTeam))), false)
  for (const placement of ["first", "second", "third"]) {
    const duplicate = { ...setup(), finalResults: setup().finalResults.map((r) => ({ ...r, placement, won: placement === "first" })) }
    assert.throws(() => migrateProfileData(profile(duplicate)), /only one Uma/)
  }
})

test("placements survive serialized reload/export/import and actual autosave file payload without changing snapshots", async () => {
  const event = completeCMFinal(place(place(place(setup(), "a", "first"), "b", "third"), "c", "fourth_or_lower"))
  const exported = file(profile(event))
  assert.ok(isImportedProfileFile(exported))
  const reloaded = JSON.parse(JSON.stringify(exported))
  assert.ok(isImportedProfileFile(reloaded))
  assert.deepEqual(migrateProfileData(reloaded.data).cms[0].finalResults, event.finalResults)
  let content = "", closed = false
  const handle = { getFile: async () => ({ text: async () => content }), createWritable: async () => ({ write: async (data) => { content = data }, close: async () => { closed = true }, abort: async () => {} }) }
  assert.equal(await writeProfileBackupFile(handle, exported), true)
  assert.equal(closed, true)
  const autosaved = JSON.parse(content)
  assert.ok(isImportedProfileFile(autosaved))
  assert.deepEqual(autosaved.data.cms[0].finalResults, event.finalResults)
  assert.deepEqual(getCMFinalResults(autosaved.data.cms[0]), event.finalResults)
})

test("placement metadata stays separate from configuration snapshots and never re-infers explicit null", () => {
  const initial = setup()
  initial.participants[0].won = true
  const migrated = migrateProfileData(profile(initial))
  assert.equal(migrated.cms[0].finalResults[0].placement, null)
  assert.equal(migrated.cms[0].participants[0].won, false)
  const before = JSON.stringify(initial.finalResults.map((r) => r.configuration))
  const changed = place(initial, "a", "first")
  assert.equal(JSON.stringify(changed.finalResults.map((r) => r.configuration)), before)
  assert.ok(changed.finalResults.every((r) => !Object.hasOwn(r.configuration, "placement")))
})
