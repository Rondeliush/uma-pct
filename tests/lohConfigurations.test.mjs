import assert from "node:assert/strict"
import test from "node:test"
import { importTS } from "./helpers/importTS.mjs"

const { createLoHEvent, updateLoHEvent, updateLoHLineup, saveLoHExtraStageCandidates, normalizeLoH, isLoHData } = await importTS(new URL("../src/LoH/lohData.ts", import.meta.url))
const { getLoHConfigurationKey: key, isLoHExtraStageCandidateLocked: locked } = await importTS(new URL("../src/LoH/configurations.ts", import.meta.url))
const { getLoHExtraStageCandidates: candidates, assertLoHExtraStage } = await importTS(new URL("../src/LoH/extraStage.ts", import.meta.url))
const { saveLoHRaceSet, getLoHLineupSnapshot, getLoHConfigurationStats: stats, getLoHUmaStats, finishLoHDay, confirmLoHMainStageRank, registerLoHExtraStageLineup, saveLoHExtraStageResult, finishLoHEvent, isLoHMainStageLineupLocked } = await importTS(new URL("../src/LoH/progress.ts", import.meta.url))

const details = { number: 1, name: "Configurations", racecourse: "Tokyo", surface: "Turf", distance: 2400, length: "Medium", direction: "Left", season: "Spring" }
const form = (style = "Pace Chaser", flags = {}) => ["fuji", "teio", "ship"].map((id, i) => ({ id, name: id, style: i === 0 ? style : i === 1 ? "Pace Chaser" : "End Closer", ace: false, debuffer: false, autoRun: false, ...(i === 0 ? flags : {}) }))
const create = () => createLoHEvent([], { ...details, lineup: form() }, "config-event")
const edit = (event, style, flags) => updateLoHEvent(event, [event], { ...details, lineup: form(style, flags) })
const add = (event, id, places = [1, 2, 3]) => saveLoHRaceSet(event, { id, createdAt: "2026-10-31T01:00:00Z", day: 1, weather: "Sunny", condition: "Firm", lineupSnapshot: getLoHLineupSnapshot(event), races: Array.from({ length: 5 }, (_, i) => ({ id: `${id}-${i}`, placements: event.currentLineup.map((umaId, slot) => ({ umaId, place: places[slot] })) })) })
const history = () => add(edit(add(create(), "pc"), "Late Surger"), "ls", [2, 1, 3])
const complete = (event = history()) => { for (let day = 1; day <= 6; day++) event = finishLoHDay(event, day); return event }
const qualify = event => confirmLoHMainStageRank(complete(event), 74)
const selection = event => candidates(event).filter(uma => uma.umaId !== "fuji" || uma.runningStyle === "late_surger").map(key)
const register = event => registerLoHExtraStageLineup(event, selection(event))
const result = event => ({ id: "final", createdAt: "2026-10-31T02:00:00Z", weather: "Cloudy", condition: "Good", placements: event.extraStage.lineupSnapshot.map((uma, i) => ({ umaId: uma.umaId, placement: i === 2 ? "first" : "fourth_or_lower" })) })

test("Fuji PC and Fuji LS stay separate alongside Teio PC and Ship EC, with exact per-configuration totals", () => {
  const event = history(), original = structuredClone(event)
  assert.deepEqual(candidates(event).map(uma => [uma.umaId, uma.runningStyle]), [["fuji", "pace_chaser"], ["teio", "pace_chaser"], ["ship", "end_closer"], ["fuji", "late_surger"]])
  const fuji = stats(event).filter(uma => uma.umaId === "fuji")
  assert.deepEqual(fuji.map(uma => [uma.runningStyle, uma.races, uma.wins, uma.winRate]), [["pace_chaser", 5, 5, 100], ["late_surger", 5, 0, 0]])
  assert.ok(fuji[0].rawPoints > fuji[1].rawPoints)
  assert.equal(getLoHUmaStats(event).find(uma => uma.umaId === "fuji").races, 10)
  assert.equal(event.raceSets[0].lineupSnapshot[0].runningStyle, "pace_chaser")
  assert.deepEqual(event, original)
})

test("style, roles and entry source distinguish configurations, but new counters do not", () => {
  let event = add(history(), "same-ls")
  assert.equal(candidates(event).length, 4)
  assert.equal(stats(event).find(uma => uma.umaId === "fuji" && uma.runningStyle === "late_surger").races, 10)
  for (const flag of ["ace", "debuffer", "autoRun"]) event = add(edit(event, "Late Surger", { [flag]: true }), flag)
  event = add(edit(event, "Runaway"), "escape")
  assert.equal(candidates(event).filter(uma => uma.umaId === "fuji").length, 6)
  assert.equal(key({ umaId: "old" }), key({ umaId: "old", runningStyle: null }))
  assert.notEqual(key({ umaId: "old" }), key({ umaId: "old", ace: false }))
})

test("selecting Fuji PC disables Fuji LS and another version of the same character, with validation on save", () => {
  const event = qualify(), all = candidates(event), pc = all[0], ls = all.at(-1), teio = all[1]
  const versions = [{ id: "fuji", characterId: "fuji-character" }, { id: "fuji-alt", characterId: "fuji-character" }]
  assert.equal(locked(ls, [pc], versions), true)
  assert.equal(locked(pc, [pc], versions), false)
  assert.equal(locked(teio, [pc], versions), false)
  assert.equal(locked({ ...ls, umaId: "fuji-alt" }, [pc], versions), true)
  assert.throws(() => registerLoHExtraStageLineup(event, [key(pc), key(ls), key(teio)]), /different/)
  assert.throws(() => registerLoHExtraStageLineup(event, ["fuji", "teio", "ship"]), /history/)
  const alt = { ...event, currentLineup: ["fuji-alt", "teio", "ship"], participants: [...event.participants, { ...event.participants[0], umaId: "fuji-alt" }] }
  const altKey = key(candidates(alt).find(uma => uma.umaId === "fuji-alt"))
  assert.throws(() => registerLoHExtraStageLineup(alt, [key(pc), altKey, key(teio)], undefined, versions), /different/)
})

test("Extra Stage freezes Fuji LS and credits only that configuration after reload and mutable-state changes", () => {
  const event = register(qualify()), before = structuredClone(event)
  const changed = { ...event, participants: event.participants.map(uma => ({ ...uma, runningStyle: "pace_chaser", ace: true })) }
  const saved = saveLoHExtraStageResult(changed, result(changed))
  const restored = normalizeLoH(JSON.parse(JSON.stringify(saved)))
  assert.equal(isLoHData(restored), true)
  assert.equal(restored.extraStage.lineupSnapshot.find(uma => uma.umaId === "fuji").runningStyle, "late_surger")
  const fuji = stats(restored).filter(uma => uma.umaId === "fuji")
  assert.equal(fuji.find(uma => uma.runningStyle === "late_surger").races, 6)
  assert.equal(fuji.find(uma => uma.runningStyle === "late_surger").participatedInExtraStage, true)
  assert.equal(fuji.find(uma => uma.runningStyle === "pace_chaser" && !uma.ace).races, 5)
  assert.equal(fuji.filter(uma => uma.participatedInExtraStage).length, 1)
  assert.deepEqual(restored.raceSets, JSON.parse(JSON.stringify(event.raceSets)))
  assert.deepEqual(restored.extraStage.lineupSnapshot, JSON.parse(JSON.stringify(event.extraStage.lineupSnapshot)))
  assert.deepEqual(event, before)
  const tampered = structuredClone(event)
  tampered.extraStage.lineupSnapshot[2].ace = true
  assert.throws(() => assertLoHExtraStage(tampered), /configurations/)
})

test("Main Stage lineup is editable while active and locked in every post-Day-6 phase; metadata stays editable", () => {
  const active = history()
  assert.equal(isLoHMainStageLineupLocked(active), false)
  assert.equal(edit(active, "Runaway").participants[0].runningStyle, "runaway")
  const awaiting = complete(active), qualified = confirmLoHMainStageRank(awaiting, 74), registered = register(qualified)
  const saved = saveLoHExtraStageResult(registered, result(registered))
  const nonqualified = finishLoHEvent(confirmLoHMainStageRank(awaiting, 97))
  for (const event of [awaiting, qualified, registered, saved, finishLoHEvent(saved), nonqualified, { ...create(), completed: true }]) {
    const original = structuredClone(event)
    assert.equal(isLoHMainStageLineupLocked(event), true)
    assert.throws(() => edit(event, "Runaway"), /locked/)
    assert.throws(() => edit(event, "Late Surger", { ace: true }), /locked/)
    assert.throws(() => updateLoHLineup(event, ["new", "teio", "ship"]), /locked/)
    assert.throws(() => updateLoHEvent(event, [event], { ...details, lineup: [] }), /locked/)
    const renamed = updateLoHEvent(event, [event], { ...details, name: "Renamed" })
    assert.equal(renamed.name, "Renamed")
    for (const field of ["currentLineup", "participants", "raceSets", "extraStage"]) assert.deepEqual(renamed[field], event[field])
    assert.deepEqual(event, original)
  }
})

test("older snapshots derive their key without migration or substituting today's configuration", () => {
  const old = history()
  for (const set of old.raceSets) for (const uma of set.lineupSnapshot) { delete uma.ace; delete uma.debuffer; delete uma.autoRun }
  old.participants = old.participants.map(uma => ({ ...uma, runningStyle: "runaway" }))
  const restored = normalizeLoH(JSON.parse(JSON.stringify(old)))
  assert.equal(isLoHData(restored), true)
  const fuji = stats(restored).filter(uma => uma.umaId === "fuji")
  assert.equal(fuji.find(uma => uma.runningStyle === "pace_chaser").races, 5)
  assert.equal(fuji.find(uma => uma.runningStyle === "late_surger").races, 5)
  assert.deepEqual(restored.raceSets, JSON.parse(JSON.stringify(old.raceSets)))
  assert.ok(candidates(restored).every(uma => !Object.hasOwn(uma, "configurationKey")))
})

const extraForm = (style = "Pace Chaser", flags = {}) => [{ id: "special-week", name: "Special Week", style, ace: true, debuffer: true, autoRun: true, ...flags }]
const addNew = (event, style, flags) => saveLoHExtraStageCandidates(event, [event], { ...details, lineup: extraForm(style, flags) })

test("Extra Stage Add New makes Special Week PC eligible without rewriting Main Stage or the historical draft", () => {
  const event = qualify(), original = structuredClone(event)
  const draft = candidates(event).filter(uma => (uma.umaId === "fuji" && uma.runningStyle === "late_surger") || uma.umaId === "ship").map(key)
  assert.equal(draft.length, 2)
  assert.throws(() => updateLoHEvent(event, [event], { ...details, lineup: extraForm() }), /locked/)
  const added = addNew(event)
  assert.equal(candidates(added).length, 5)
  const newCandidate = candidates(added).find(uma => uma.umaId === "special-week")
  assert.deepEqual(newCandidate, { umaId: "special-week", runningStyle: "pace_chaser", ace: true, debuffer: true, autoRun: true })
  assert.ok(draft.every(selected => candidates(added).some(uma => key(uma) === selected)))
  for (const field of ["currentLineup", "participants", "raceSets", "mainStage", "leagueScore", "leagueRank", "overallRank", "racesPlayed", "firstPlaces", "top3Finishes"]) assert.deepEqual(added[field], event[field])
  assert.deepEqual(stats(added), stats(event), "Add New is not an appearance in Main Stage history")
  assert.equal(added.participants.some(uma => uma.umaId === "special-week"), false)
  assert.deepEqual(event, original)
  const registered = registerLoHExtraStageLineup(added, [...draft, key(newCandidate)])
  assert.deepEqual(registered.extraStage.lineupSnapshot.map(uma => [uma.umaId, uma.runningStyle]), [["ship", "end_closer"], ["fuji", "late_surger"], ["special-week", "pace_chaser"]])
  assert.deepEqual(registered.currentLineup, event.currentLineup)
  assert.deepEqual(registered.raceSets, event.raceSets)
})

test("successive Add New saves keep earlier candidate configurations and enforce the same underlying-Uma guard", () => {
  const first = addNew(qualify()), next = addNew(first, "Late Surger")
  const special = candidates(next).filter(uma => uma.umaId === "special-week")
  assert.deepEqual(special.map(uma => uma.runningStyle), ["pace_chaser", "late_surger"])
  assert.equal(candidates(addNew(next, "Late Surger")).length, candidates(next).length, "repeat saves do not create duplicate configurations")
  assert.equal(locked(special[1], [special[0]], []), true)
  assert.throws(() => registerLoHExtraStageLineup(next, [key(special[0]), key(special[1]), key(candidates(next)[0])]), /different/)
  const withAlt = saveLoHExtraStageCandidates(next, [next], { ...details, lineup: [{ ...extraForm()[0], id: "special-week-alt" }] })
  const alt = candidates(withAlt).find(uma => uma.umaId === "special-week-alt")
  const versions = [{ id: "special-week", characterId: "sp" }, { id: "special-week-alt", characterId: "sp" }]
  assert.equal(locked(alt, [special[0]], versions), true)
  assert.throws(() => registerLoHExtraStageLineup(withAlt, [key(special[0]), key(alt), key(candidates(withAlt)[0])], undefined, versions), /different/)
})

test("Add New configurations survive load/import and the final credits only the registered snapshot", () => {
  const added = addNew(qualify())
  const reloaded = normalizeLoH(JSON.parse(JSON.stringify(added)))
  assert.equal(isLoHData(reloaded), true)
  assert.deepEqual(reloaded.extraStageCandidates, JSON.parse(JSON.stringify(added.extraStageCandidates)))
  assert.deepEqual(reloaded.raceSets, JSON.parse(JSON.stringify(added.raceSets)))
  const draft = candidates(reloaded).filter(uma => uma.umaId === "ship" || uma.umaId === "special-week" || (uma.umaId === "fuji" && uma.runningStyle === "late_surger"))
  const registered = registerLoHExtraStageLineup(reloaded, draft.map(key))
  const saved = saveLoHExtraStageResult(registered, { id: "new-uma-final", createdAt: "2026-10-31T05:00:00Z", weather: "Rainy", condition: "Heavy", placements: registered.extraStage.lineupSnapshot.map(uma => ({ umaId: uma.umaId, placement: uma.umaId === "special-week" ? "first" : "fourth_or_lower" })) })
  const finished = normalizeLoH(JSON.parse(JSON.stringify(finishLoHEvent(saved))))
  const winner = stats(finished).find(uma => uma.umaId === "special-week")
  assert.deepEqual([winner.runningStyle, winner.ace, winner.debuffer, winner.autoRun, winner.races, winner.wins, winner.rawPoints, winner.winRate], ["pace_chaser", true, true, true, 1, 1, 0, 100])
  assert.equal(winner.participatedInExtraStage, true)
  assert.equal(getLoHUmaStats(finished).find(uma => uma.umaId === "special-week").runningStyle, "pace_chaser")
  for (const field of ["currentLineup", "raceSets", "leagueScore", "leagueRank", "overallRank", "mainStage"]) assert.deepEqual(finished[field], reloaded[field])
  assert.deepEqual(finished.extraStage.lineupSnapshot, JSON.parse(JSON.stringify(registered.extraStage.lineupSnapshot)))
  assert.equal(isLoHData(finished), true)
  const malformed = structuredClone(added)
  malformed.extraStageCandidates[0].runningStyle = "invalid"
  assert.equal(isLoHData(malformed), false)
  assert.throws(() => normalizeLoH(malformed))
})

test("Add New is exclusive to Extra Stage registration; normal Edit LoH never unlocks the Main Stage team", () => {
  const awaiting = complete(), qualified = confirmLoHMainStageRank(awaiting, 74), registered = register(qualified)
  const saved = saveLoHExtraStageResult(registered, result(registered))
  for (const event of [create(), awaiting, confirmLoHMainStageRank(awaiting, 97), registered, saved, finishLoHEvent(saved)]) {
    assert.throws(() => addNew(event), /only available during Extra Stage lineup registration/)
  }
  const added = addNew(qualified)
  assert.equal(isLoHMainStageLineupLocked(added), true)
  assert.throws(() => updateLoHLineup(added, ["special-week", "ship", "fuji"]), /locked/)
  assert.throws(() => updateLoHEvent(added, [added], { ...details, lineup: extraForm() }), /locked/)
})
