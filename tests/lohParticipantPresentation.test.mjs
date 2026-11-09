import assert from "node:assert/strict"
import test from "node:test"
import { importTS } from "./helpers/importTS.mjs"

const { createLoHEvent, updateLoHEvent, normalizeLoH } = await importTS(new URL("../src/LoH/lohData.ts", import.meta.url))
const { getLoHParticipantEntries: entries } = await importTS(new URL("../src/LoH/participantPresentation.ts", import.meta.url))
const { getLoHConfigurationKey: key } = await importTS(new URL("../src/LoH/configurations.ts", import.meta.url))
const { getLoHLineupSnapshot, getLoHConfigurationStats, saveLoHRaceSet, finishLoHDay, confirmLoHMainStageRank, registerLoHExtraStageLineup, completeLoHExtraStage } = await importTS(new URL("../src/LoH/progress.ts", import.meta.url))

const details = { number: 6, name: "Role snapshots", racecourse: "Kyoto", surface: "Turf", distance: 3233, length: "Short", direction: "Left", season: "Spring" }
const lineup = (flags = false, style = "Runaway") => [
  { id: "special-week", name: "Special Week", style, ace: flags, debuffer: false, autoRun: false },
  { id: "gold-ship", name: "Gold Ship", style: "Pace Chaser", ace: false, debuffer: flags, autoRun: false },
  { id: "tokai-teio", name: "Tokai Teio", style: "Front Runner", ace: false, debuffer: false, autoRun: flags },
]
const create = () => createLoHEvent([], { ...details, lineup: lineup() }, "role-event")
const edit = (event, flags, style) => updateLoHEvent(event, [event], { ...details, lineup: lineup(flags, style) })
const add = (event, id, places = [[1, 2, 3], [1, 2, 3], [2, 1, 3], [1, 3, 2], [1, 3, 4]]) => saveLoHRaceSet(event, {
  id, createdAt: "2026-10-31T18:37:10Z", day: 1, weather: "Rainy", condition: "Heavy", lineupSnapshot: getLoHLineupSnapshot(event),
  races: places.map((row, i) => ({ id: `${id}-${i}`, placements: event.currentLineup.map((umaId, slot) => ({ umaId, place: row[slot] })) })),
})

test("roles added after a set appear on the same three Umas cards without changing historical flags or totals", () => {
  const recorded = add(create(), "old"), saved = structuredClone(recorded.raceSets)
  const event = edit(recorded, true), original = structuredClone(event)
  const cards = entries(event)
  assert.equal(cards.length, 3)
  assert.deepEqual(cards.map(uma => [uma.ace, uma.debuffer, uma.autoRun]), [[true, false, false], [false, true, false], [false, false, true]])
  assert.deepEqual(cards.map(uma => [uma.races, uma.wins, uma.winRate, uma.rawPoints, uma.averagePlacement]), [[5, 4, 80, 460, 1.2], [5, 1, 20, 300, 2.2], [5, 0, 0, 210, 3]])
  assert.equal(getLoHConfigurationStats(event).length, 6, "statistics still distinguish recorded and current configurations")
  assert.deepEqual(event.raceSets, saved)
  assert.deepEqual(event, original, "presentation is read-only")
})

test("new Add Set snapshots the current tags and merges only the Umas presentation, including after reload", () => {
  const old = add(create(), "old"), edited = edit(old, true)
  const saved = add(edited, "tagged", Array.from({ length: 5 }, () => [2, 1, 3]))
  const event = normalizeLoH(JSON.parse(JSON.stringify(saved)))
  assert.deepEqual(event.raceSets[0], JSON.parse(JSON.stringify(old.raceSets[0])))
  assert.deepEqual(event.raceSets[1].lineupSnapshot, JSON.parse(JSON.stringify(getLoHLineupSnapshot(edited))))
  assert.equal(event.raceSets[0].lineupSnapshot[0].ace, false)
  assert.equal(event.raceSets[1].lineupSnapshot[0].ace, true)
  assert.equal(entries(event).length, 3)
  const special = entries(event).find(uma => uma.umaId === "special-week")
  assert.deepEqual([special.races, special.wins, special.winRate, special.rawPoints, special.averagePlacement], [10, 4, 40, 760, 1.6])
  assert.deepEqual(getLoHConfigurationStats(event).filter(uma => uma.umaId === "special-week").map(uma => [uma.ace, uma.races, uma.wins]), [[false, 5, 4], [true, 5, 0]])
})

test("turning roles off keeps one card and does not OR together historical tags", () => {
  const event = edit(add(edit(add(create(), "old"), true), "tagged"), false)
  const cards = entries(event)
  assert.equal(cards.length, 3)
  assert.ok(cards.every(uma => !uma.ace && !uma.debuffer && !uma.autoRun))
  assert.ok(cards.every(uma => uma.races === 10))
  assert.equal(event.raceSets[1].lineupSnapshot[0].ace, true)
  assert.equal(event.raceSets[1].lineupSnapshot[1].debuffer, true)
  assert.equal(event.raceSets[1].lineupSnapshot[2].autoRun, true)
})

test("different running styles remain separate and each retired style shows its latest recorded tags", () => {
  const event = add(edit(add(edit(add(create(), "old"), true), "tagged"), false, "Late Surger"), "new-style")
  const special = entries(event).filter(uma => uma.umaId === "special-week")
  assert.equal(entries(event).length, 4)
  assert.deepEqual(special.map(uma => [uma.runningStyle, uma.ace, uma.races]), [["runaway", true, 10], ["late_surger", false, 5]])
  assert.equal(entries(create()).length, 0, "unraced configurations are not invented appearances")
})

test("Extra Stage snapshot keeps its exact configuration while the grouped WR uses wins/races totals", () => {
  let event = add(edit(add(create(), "old"), true), "tagged", Array.from({ length: 5 }, () => [2, 1, 3]))
  for (let day = 1; day <= 6; day++) event = finishLoHDay(event, day)
  event = confirmLoHMainStageRank(event, 74)
  event = registerLoHExtraStageLineup(event, getLoHLineupSnapshot(event).map(key))
  const snapshot = structuredClone(event.extraStage.lineupSnapshot), main = structuredClone(event.raceSets)
  event = completeLoHExtraStage(event, { id: "extra", createdAt: "2026-10-31T20:00:00Z", weather: "Sunny", condition: "Good", placements: snapshot.map((uma, i) => ({ umaId: uma.umaId, placement: ["first", "second", "third"][i] })) })
  const special = entries(event).find(uma => uma.umaId === "special-week")
  assert.equal(entries(event).length, 3)
  assert.equal(special.races, 11)
  assert.equal(special.wins, 5)
  assert.equal(special.winRate, 5 / 11 * 100)
  assert.equal(special.participatedInExtraStage, true)
  assert.equal(special.extraStagePlacement, "first")
  assert.equal(getLoHConfigurationStats(event).find(uma => key(uma) === key(snapshot[0])).winRate, 1 / 6 * 100, "exact configuration WR remains independent")
  assert.deepEqual(event.extraStage.lineupSnapshot, snapshot)
  assert.deepEqual(event.raceSets, main)
})

test("legacy unknown points and averages stay unknown instead of being replaced by partial recorded totals", () => {
  const old = create()
  old.participants = old.participants.map(uma => ({ ...uma, races: 3, wins: uma.umaId === "special-week" ? 2 : 0, top3Finishes: 0 }))
  old.racesPlayed = 3
  old.firstPlaces = 2
  const event = add(edit(old, true), "new")
  const special = entries(event).find(uma => uma.umaId === "special-week")
  assert.deepEqual([special.races, special.wins, special.winRate], [8, 6, 75])
  assert.equal(special.rawPoints, null)
  assert.equal(special.averagePlacement, null)
  assert.equal(special.ace, true)
})
