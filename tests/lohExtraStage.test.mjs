import assert from "node:assert/strict"
import test from "node:test"
import { importTS } from "./helpers/importTS.mjs"

const { createLoHEvent, normalizeLoH, updateLoHLineup, updateLoHEvent } = await importTS(new URL("../src/LoH/lohData.ts", import.meta.url))
const { saveLoHRaceSet, finishLoHDay, finishLoHEvent, completeLoHExtraStage, confirmLoHMainStageRank, registerLoHExtraStageLineup, saveLoHExtraStageResult, getLoHMainStage, getLoHProgress, getLoHLineupSnapshot, getLoHUmaStats, getLoHResultLineup } = await importTS(new URL("../src/LoH/progress.ts", import.meta.url))
const { getLoHPhase, getLoHExtraStageCandidates, getLoHExtraStageOutcome, LOH_EXTRA_STAGE_PLACEMENTS, LOH_EXTRA_STAGE_PLACEMENT_LABELS } = await importTS(new URL("../src/LoH/extraStage.ts", import.meta.url))
const { CM_FINAL_PLACEMENTS, CM_FINAL_PLACEMENT_LABELS } = await importTS(new URL("../src/CMs/cmFinalPlacements.ts", import.meta.url))
const { isImportedProfileFile } = await importTS(new URL("../src/profiles/profileTransfer.ts", import.meta.url))
const { migrateProfileData, PROFILE_DATA_VERSION } = await importTS(new URL("../src/profiles/profileDataMigration.ts", import.meta.url))
const { getLoHChangeLogEntries } = await importTS(new URL("../src/LoH/changeLog.ts", import.meta.url))

const details = { number: 1, name: "Extra Stage", racecourse: "Tokyo", surface: "Turf", distance: 2400, length: "Medium", direction: "Left", season: "Spring" }
const create = () => createLoHEvent([], { ...details, lineup: ["a", "b", "c"].map(id => ({ id, name: id, style: "Pace Chaser", ace: id === "a", debuffer: false, autoRun: id === "b" })) }, "extra-test", "2026-10-31T00:00:00Z")
const add = (event, id) => saveLoHRaceSet(event, { id, createdAt: "2026-10-31T01:00:00Z", day: getLoHMainStage(event).activeDay, weather: "Sunny", condition: "Firm", lineupSnapshot: getLoHLineupSnapshot(event), races: Array.from({ length: 5 }, (_, i) => ({ id: `${id}-${i}`, placements: event.currentLineup.map((umaId, slot) => ({ umaId, place: slot + 1 })) })) })
const complete = () => {
  let event = add(create(), "first")
  event = updateLoHLineup(event, ["d", "b", "c"])
  event = add(event, "second")
  event = updateLoHLineup(event, ["draft-never-raced", "b", "c"])
  for (let day = 1; day <= 6; day++) event = finishLoHDay(event, day)
  return normalizeLoH(event)
}
const qualify = rank => confirmLoHMainStageRank(complete(), rank ?? 74)
const register = () => registerLoHExtraStageLineup(qualify(), ["a", "b", "d"], "2026-10-31T02:00:00Z")
const result = (event, places = ["first", "third", "fourth_or_lower"], extra = {}) => ({ id: "extra-race", createdAt: "2026-10-31T03:00:00Z", weather: "Rainy", condition: "Heavy", placements: event.extraStage.lineupSnapshot.map((uma, i) => ({ umaId: uma.umaId, placement: places[i] })), ...extra })
const backup = event => ({ format: "uma-tracker-profile", version: 1, profile: { sourceProfileId: "extra-test", name: "Trainer" }, data: { dataVersion: PROFILE_DATA_VERSION, cms: [], lohs: [event], customUmaDatabase: { customCharacters: [], customVersions: [], archivedVersionIds: [] }, favoriteUmaId: "", cmViewMode: "detailed", seenOfficialVersionIds: [] } })

test("Day 6 completes without a rank, preserves history and supports an awaiting-rank profile round trip", () => {
  const event = complete()
  assert.equal(getLoHPhase(event), "AWAITING_MAIN_STAGE_RANK")
  assert.equal(event.overallRank, null)
  assert.equal(getLoHMainStage(event).activeDay, null)
  assert.equal(getLoHMainStage(event).qualified, false)
  assert.equal(event.completed, false)
  const file = JSON.parse(JSON.stringify(backup(event)))
  assert.equal(isImportedProfileFile(file), true)
  assert.deepEqual(migrateProfileData(file.data).lohs[0], file.data.lohs[0])
  assert.throws(() => finishLoHEvent(event), /Confirm/)
})

test("final rank is confirmed separately exactly once; 1 and 96 qualify, 97 and 100 do not", () => {
  for (const [rank, phase] of [[1, "EXTRA_STAGE_QUALIFIED"], [96, "EXTRA_STAGE_QUALIFIED"], [97, "NOT_QUALIFIED"], [100, "NOT_QUALIFIED"]]) {
    const event = qualify(rank)
    assert.equal(getLoHPhase(event), phase)
    assert.equal(event.overallRank, rank)
    assert.throws(() => confirmLoHMainStageRank(event, 42), /only be confirmed once/)
    if (rank > 96) assert.equal(getLoHPhase(finishLoHEvent(event)), "COMPLETED")
    else assert.throws(() => finishLoHEvent(event), /Extra Stage/)
  }
  for (const rank of [0, -1, 1.5, null, undefined, "74", NaN, Infinity]) assert.throws(() => confirmLoHMainStageRank(complete(), rank), /positive integer/)
  assert.throws(() => confirmLoHMainStageRank(create(), 74), /after Day 6/)
})

test("historical configurations and current lineup are eligible; unknown versions are not", () => {
  const event = qualify(), candidates = getLoHExtraStageCandidates(event)
  assert.deepEqual(candidates.map(uma => uma.umaId), ["a", "b", "c", "d", "draft-never-raced"])
  assert.equal(event.currentLineup.includes("a"), false)
  assert.equal(candidates.some(uma => uma.umaId === "draft-never-raced"), true)
  assert.throws(() => registerLoHExtraStageLineup(event, ["a", "b"]), /exactly three/)
  assert.throws(() => registerLoHExtraStageLineup(event, ["a", "a", "b"]), /exactly three/)
  assert.throws(() => registerLoHExtraStageLineup(event, ["a", "b", "unknown"]), /history/)
  assert.throws(() => registerLoHExtraStageLineup(qualify(100), ["a", "b", "c"]), /Top 96/)
})

test("registration freezes exact versions and recorded roles, without changing current or Main Stage lineups", () => {
  const event = qualify(), original = structuredClone(event), ids = ["a", "b", "d"]
  const registered = registerLoHExtraStageLineup(event, ids)
  assert.equal(getLoHPhase(registered), "EXTRA_STAGE_READY")
  assert.deepEqual(registered.currentLineup, event.currentLineup)
  assert.deepEqual(registered.raceSets, event.raceSets)
  assert.deepEqual(registered.extraStage.lineupSnapshot.map(uma => uma.umaId), ids)
  assert.equal(registered.extraStage.lineupSnapshot[0].ace, true)
  assert.equal(registered.extraStage.lineupSnapshot[1].autoRun, true)
  ids[0] = "tampered"
  assert.throws(() => updateLoHEvent(registered, [registered], { ...details, lineup: ["x", "y", "z"].map(id => ({ id, name: id, style: "End Closer", ace: false, debuffer: true, autoRun: false })) }), /locked/)
  const edited = updateLoHEvent(registered, [registered], { ...details, name: "Metadata edit" })
  assert.deepEqual(edited.extraStage, registered.extraStage)
  assert.deepEqual(getLoHResultLineup(edited), registered.extraStage.lineupSnapshot)
  assert.deepEqual(event, original)
  assert.throws(() => registerLoHExtraStageLineup(registered, ["b", "c", "d"]), /Register Extra Stage/)
})

test("Extra Stage uses the existing CM Final placement labels without changing CM semantics", () => {
  assert.deepEqual(LOH_EXTRA_STAGE_PLACEMENTS, CM_FINAL_PLACEMENTS)
  assert.deepEqual(LOH_EXTRA_STAGE_PLACEMENT_LABELS, CM_FINAL_PLACEMENT_LABELS)
  assert.deepEqual(Object.values(LOH_EXTRA_STAGE_PLACEMENT_LABELS), ["1st", "2nd", "3rd", "4th+"])
})

test("exact Extra Stage podium places are unique while multiple 4th+ buckets are legal", () => {
  const event = register()
  for (const places of [["first", "first", "third"], ["second", "second", "fourth_or_lower"], ["third", "third", "fourth_or_lower"]]) assert.throws(() => saveLoHExtraStageResult(event, result(event, places)), /unique/)
  for (const places of [["second", "fourth_or_lower", "fourth_or_lower"], ["fourth_or_lower", "fourth_or_lower", "fourth_or_lower"]]) {
    const saved = saveLoHExtraStageResult(event, result(event, places))
    assert.equal(getLoHExtraStageOutcome(saved), "participated")
    assert.deepEqual(saved.extraStage.result.placements.map(item => item.placement), places)
    assert.ok(getLoHUmaStats(saved).filter(uma => ["b", "d"].includes(uma.umaId)).every(uma => uma.averagePlacement === null))
  }
  for (const placement of ["6+", "4th+", 1, 4, "fourth", null]) assert.throws(() => saveLoHExtraStageResult(event, result(event, ["first", "second", placement])))
})

test("weather and condition are required, real and preserved independently from event Random values", () => {
  const event = register()
  for (const invalid of [{ weather: null }, { condition: null }, { weather: "Random" }, { condition: "Random" }, { weather: "" }, { condition: "" }]) assert.throws(() => saveLoHExtraStageResult(event, result(event, undefined, invalid)), /Weather/)
  const saved = saveLoHExtraStageResult(event, result(event))
  assert.deepEqual([saved.extraStage.result.weather, saved.extraStage.result.condition], ["Rainy", "Heavy"])
  assert.deepEqual([saved.weather, saved.condition], ["Random", "Random"])
  assert.equal(getLoHExtraStageOutcome(saved), "winner")
})

test("one final race adds one appearance per registered Uma and a win only for 1st, without points or ticket changes", () => {
  const event = register(), before = structuredClone(event), main = getLoHProgress(event), stage = getLoHMainStage(event)
  const saved = saveLoHExtraStageResult(event, result(event))
  const priorStats = getLoHUmaStats(event), stats = getLoHUmaStats(saved)
  for (const uma of priorStats) {
    const current = stats.find(item => item.umaId === uma.umaId), registered = ["a", "b", "d"].includes(uma.umaId)
    assert.equal(current.races, uma.races + Number(registered))
    assert.equal(current.wins, uma.wins + Number(uma.umaId === "a"))
    assert.equal(current.rawPoints, uma.rawPoints)
    assert.equal(current.participatedInExtraStage === true, registered)
  }
  assert.equal(saved.racesPlayed, event.racesPlayed + 1)
  assert.equal(saved.firstPlaces, event.firstPlaces + 1)
  assert.equal(saved.leagueScore, event.leagueScore)
  assert.equal(saved.overallRank, event.overallRank)
  assert.deepEqual(saved.raceSets, event.raceSets)
  assert.deepEqual(getLoHProgress(saved), main)
  assert.deepEqual(getLoHMainStage(saved).days, stage.days)
  assert.deepEqual(event, before)
  assert.throws(() => saveLoHExtraStageResult(saved, result(saved)), /read-only/)
})

test("all three final Umas are SUPER HERO participants even without a winner", () => {
  const event = register(), saved = saveLoHExtraStageResult(event, result(event, ["second", "fourth_or_lower", "fourth_or_lower"]))
  assert.equal(getLoHExtraStageOutcome(saved), "participated")
  assert.equal(saved.firstPlaces, event.firstPlaces)
  assert.equal(saved.participants.filter(uma => uma.participatedInExtraStage).length, 3)
  assert.ok(saved.participants.filter(uma => uma.participatedInExtraStage).every(uma => uma.extraStagePlacement))
  assert.equal(getLoHPhase(saved), "EXTRA_STAGE_RESULT_RECORDED")
  const tampered = { ...saved, participants: saved.participants.map(uma => ({ ...uma, participatedInExtraStage: true, extraStagePlacement: "first" })) }
  assert.deepEqual(getLoHUmaStats(tampered), getLoHUmaStats(saved), "SUPER HERO and individual placements are derived from the final race, never trusted cached flags")
})

test("completed winners and participants retain all final data through reload, backup, and immutable normalization", () => {
  for (const places of [["first", "third", "fourth_or_lower"], ["second", "fourth_or_lower", "fourth_or_lower"]]) {
    const saved = saveLoHExtraStageResult(register(), result(register(), places)), ended = finishLoHEvent(saved)
    const file = JSON.parse(JSON.stringify(backup(ended))), original = structuredClone(file)
    assert.equal(isImportedProfileFile(file), true)
    const restored = migrateProfileData(file.data).lohs[0]
    assert.deepEqual(restored, file.data.lohs[0])
    assert.equal(getLoHPhase(restored), "COMPLETED")
    assert.deepEqual(restored.extraStage, JSON.parse(JSON.stringify(ended.extraStage)))
    assert.equal(restored.overallRank, 74)
    assert.equal(getLoHExtraStageOutcome(restored), places[0] === "first" ? "winner" : "participated")
    assert.strictEqual(normalizeLoH(restored), restored)
    assert.deepEqual(file, original)
    assert.throws(() => confirmLoHMainStageRank(restored, 1), /only be confirmed once/)
    assert.throws(() => registerLoHExtraStageLineup(restored, ["a", "b", "c"]))
  }
})

test("invalid Extra Stage sources are rejected at import before overwriting a profile", () => {
  const saved = saveLoHExtraStageResult(register(), result(register()))
  for (const mutate of [
    e => { e.overallRank = 97 }, e => { e.overallRank = null }, e => { e.mainStage.completedDays.pop() },
    e => { e.extraStage.lineupSnapshot.pop() }, e => { e.extraStage.lineupSnapshot[1].umaId = "a" },
    e => { e.extraStage.lineupSnapshot[0].umaId = "unknown" }, e => { e.extraStage.result.weather = "Random" },
    e => { e.extraStage.result.condition = null }, e => { e.extraStage.result.placements[1].placement = "first" },
    e => { e.extraStage.result.placements[0].umaId = "c" }, e => { e.extraStage.result.placements.pop() },
    e => { e.extraStage.registeredAt = "bad-date" }, e => { e.extraStage.result.createdAt = "bad-date" },
  ]) {
    const file = JSON.parse(JSON.stringify(backup(saved)))
    mutate(file.data.lohs[0])
    assert.equal(isImportedProfileFile(file), false)
    assert.throws(() => normalizeLoH(file.data.lohs[0]))
  }
})

test("Complete LoH records the final race and completes the event once without changing Main Stage history", () => {
  for (const places of [["first", "second", "third"], ["fourth_or_lower", "fourth_or_lower", "fourth_or_lower"]]) {
    const event = register(), original = structuredClone(event), main = getLoHMainStage(event)
    const completed = completeLoHExtraStage(event, result(event, places))
    assert.equal(completed.completed, true)
    assert.equal(getLoHPhase(completed), "COMPLETED")
    assert.equal(getLoHExtraStageOutcome(completed), places.includes("first") ? "winner" : "participated")
    assert.equal(completed.racesPlayed, event.racesPlayed + 1)
    assert.equal(completed.overallRank, event.overallRank)
    assert.equal(completed.leagueScore, event.leagueScore)
    assert.deepEqual(completed.raceSets, event.raceSets)
    assert.deepEqual(completed.extraStage.lineupSnapshot, event.extraStage.lineupSnapshot)
    assert.deepEqual(getLoHMainStage(completed).days, main.days)
    assert.deepEqual(event, original)
    assert.throws(() => completeLoHExtraStage(completed, result(completed)), /read-only/)
    const file = JSON.parse(JSON.stringify(backup(completed)))
    assert.equal(isImportedProfileFile(file), true)
    assert.deepEqual(migrateProfileData(file.data).lohs[0], file.data.lohs[0])
  }
})

test("Complete LoH rejects incomplete/duplicate placements and missing race conditions without partial completion", () => {
  const event = register(), original = structuredClone(event)
  for (const invalid of [result(event, ["first", "first", "third"]), result(event, ["first", "second", "6+"]), result(event, undefined, { weather: null }), result(event, undefined, { condition: null })]) assert.throws(() => completeLoHExtraStage(event, invalid))
  assert.deepEqual(event, original)
  assert.equal(event.extraStage.result, undefined)
  assert.equal(event.completed, false)
  assert.throws(() => completeLoHExtraStage(qualify(100), result(event)), /Register/)
})

test("ending Main Stage without Extra Stage records one completion with its actual date and survives backup", () => {
  const event = qualify(97), original = structuredClone(event), timestamp = "2026-11-01T13:30:00Z"
  const ended = finishLoHEvent(event, timestamp), entry = ended.log.at(-1)
  assert.deepEqual(entry, { id: `${event.id}-completed`, timestamp, type: "completed", message: "LoH completed.", details: ["Main Stage completed without Extra Stage."] })
  assert.deepEqual(ended.log.slice(0, -1), event.log)
  assert.deepEqual({ ...ended, completed: event.completed, log: event.log }, event)
  assert.strictEqual(finishLoHEvent(ended, "2026-11-02T14:00:00Z"), ended)
  assert.equal(ended.log.filter(item => item.type === "completed").length, 1)
  const file = JSON.parse(JSON.stringify(backup(ended)))
  assert.equal(isImportedProfileFile(file), true)
  assert.deepEqual(migrateProfileData(file.data).lohs[0].log, ended.log)
  assert.deepEqual(event, original)
})

test("atomic Extra Stage completion logs both winning and non-winning events without adding points", () => {
  for (const places of [["first", "second", "third"], ["second", "fourth_or_lower", "fourth_or_lower"]]) {
    const event = register(), original = structuredClone(event), before = Date.now()
    const ended = completeLoHExtraStage(event, result(event, places)), entry = ended.log.at(-1)
    assert.equal(entry.type, "completed")
    assert.equal(entry.message, "LoH completed.")
    assert.deepEqual(entry.details, ["Extra Stage completed."])
    assert.ok(Date.parse(entry.timestamp) >= before && Date.parse(entry.timestamp) <= Date.now())
    assert.deepEqual(ended.log.slice(0, -1), event.log)
    assert.equal(ended.leagueScore, event.leagueScore)
    assert.deepEqual(ended.raceSets, event.raceSets)
    assert.equal(ended.racesPlayed, event.racesPlayed + 1)
    assert.equal(getLoHChangeLogEntries(ended).filter(item => item.type === "completed").length, 1)
    assert.deepEqual(event, original)
  }
})

test("recording an Extra Stage race alone is not an event completion", () => {
  const event = register(), saved = saveLoHExtraStageResult(event, result(event))
  assert.equal(saved.completed, false)
  assert.equal(getLoHChangeLogEntries(saved).some(item => item.type === "completed"), false)
  const ended = finishLoHEvent(saved, "2026-11-01T15:00:00Z")
  assert.deepEqual(ended.log.at(-1).details, ["Extra Stage completed."])
  assert.equal(ended.log.filter(item => item.type === "completed").length, 1)
})

test("older completed events display a completion without inventing its date or modifying saved history", () => {
  for (const event of [qualify(97), saveLoHExtraStageResult(register(), result(register()))]) {
    const old = { ...event, completed: true }, original = structuredClone(old)
    const entries = getLoHChangeLogEntries(old), entry = entries.at(-1)
    assert.equal(entry.type, "completed")
    assert.equal(entry.timestamp, null)
    assert.deepEqual(entry.details, [old.extraStage ? "Extra Stage completed." : "Main Stage completed without Extra Stage."])
    assert.deepEqual(entries.slice(0, -1), old.log)
    assert.deepEqual(getLoHChangeLogEntries(old), entries)
    assert.deepEqual(old, original)
  }
  const completed = { ...qualify(97), completed: true, log: [] }
  assert.equal(getLoHChangeLogEntries(completed).length, 1)
  const active = create()
  assert.strictEqual(getLoHChangeLogEntries(active), active.log)
})
