import assert from "node:assert/strict"
import test from "node:test"
import { importTS } from "./helpers/importTS.mjs"

const { createLoHEvent, normalizeLoH, updateLoHLineup } = await importTS(new URL("../src/LoH/lohData.ts", import.meta.url))
const { saveLoHRaceSet, deleteLoHRaceSet, finishLoHDay, finishLoHEvent, confirmLoHMainStageRank, getLoHMainStage, getLoHProgress, getLoHLeagueScoreAtDay, getLoHLineupSnapshot, getLoHParticipantStats, getLoHResultLineup, recalculateLoHProgress } = await importTS(new URL("../src/LoH/progress.ts", import.meta.url))
const { isCompleteLoHRace, getLoHRaceRawScore } = await importTS(new URL("../src/LoH/scoring.ts", import.meta.url))
const { isImportedProfileFile } = await importTS(new URL("../src/profiles/profileTransfer.ts", import.meta.url))
const { migrateProfileData, PROFILE_DATA_VERSION } = await importTS(new URL("../src/profiles/profileDataMigration.ts", import.meta.url))

const create = (score = 0) => ({ ...createLoHEvent([], { number: 1, name: "Main Stage", racecourse: "Tokyo", surface: "Turf", distance: 2400, length: "Medium", direction: "Left", season: "Spring", lineup: ["a", "b", "c"].map(id => ({ id, name: id, style: "Pace Chaser", ace: false, debuffer: false, autoRun: false })) }, "loh-main", "2026-10-30T00:00:00Z"), leagueScore: score })
const input = (event, id, places = [1, 2, 3], extra = {}) => ({ id, day: getLoHMainStage(event).activeDay, createdAt: "2026-10-30T12:00:00Z", weather: "Sunny", condition: "Firm", lineupSnapshot: getLoHLineupSnapshot(event), races: Array.from({ length: 5 }, (_, index) => ({ id: `${id}-${index}`, placements: event.currentLineup.map((umaId, slot) => ({ umaId, place: places[slot] })) })), ...extra })
const add = (event, id, places, extra) => saveLoHRaceSet(event, input(event, id, places, extra))
const backup = event => ({ format: "uma-tracker-profile", version: 1, profile: { sourceProfileId: "main-test", name: "Trainer" }, data: { dataVersion: PROFILE_DATA_VERSION, cms: [], lohs: [event], customUmaDatabase: { customCharacters: [], customVersions: [], archivedVersionIds: [] }, favoriteUmaId: "", cmViewMode: "detailed", seenOfficialVersionIds: [] } })

test("day League Score stays cumulative through that day when later days raise the event total", () => {
  let event = create()
  for (let i = 1; i <= 5; i++) event = add(event, `day1-${i}`)
  event = finishLoHDay(event, 1)
  for (let i = 1; i <= 3; i++) event = add(event, `day2-${i}`)
  event = add(event, "day2-half", [2, 4, "6+"])
  event = finishLoHDay(event, 2)
  for (let i = 1; i <= 3; i++) event = add(event, `day3-${i}`)
  event = add(event, "day3-partial", [1, 3, 5])
  assert.equal(event.leagueScore, 12300)
  assert.deepEqual([1, 2, 3].map(day => getLoHLeagueScoreAtDay(event, day)), [5000, 8500, 12300])
  event = finishLoHDay(event, 3)
  for (let i = 1; i <= 7; i++) event = add(event, `day4-${i}`)
  event = add(event, "day4-partial", [1, 4, "6+"])
  const before = structuredClone(event), history = getLoHProgress(event)
  assert.equal(event.leagueScore, 20000)
  assert.deepEqual([1, 2, 3, 4].map(day => getLoHLeagueScoreAtDay(event, day, history)), [5000, 8500, 12300, 20000])
  assert.deepEqual(event, before, "day scores are derived without storing snapshots or changing tickets/history")
})

test("an active day's cumulative score follows saved, edited and deleted sets, and empty days carry forward", () => {
  let event = create()
  assert.deepEqual([1, 2, 3, 4, 5, 6].map(day => getLoHLeagueScoreAtDay(event, day)), [0, 0, 0, 0, 0, 0])
  event = finishLoHDay(add(event, "day1"), 1)
  assert.equal(getLoHLeagueScoreAtDay(event, 2), 1000)
  event = add(event, "day2-first")
  assert.equal(getLoHLeagueScoreAtDay(event, 2), 2000)
  event = saveLoHRaceSet(event, input(event, "day2-first", [1, 3, 5]))
  assert.equal(getLoHLeagueScoreAtDay(event, 2), 1800)
  event = add(event, "day2-second", [1, "6+", "6+"])
  assert.equal(getLoHLeagueScoreAtDay(event, 2), 2400)
  event = deleteLoHRaceSet(event, "day2-first")
  assert.equal(getLoHLeagueScoreAtDay(event, 2), 1600)
  event = deleteLoHRaceSet(event, "day2-second")
  assert.equal(getLoHLeagueScoreAtDay(event, 2), 1000)
  event = finishLoHDay(event, 2)
  event = add(event, "day3")
  assert.equal(event.leagueScore, 2000)
  assert.deepEqual([1, 2, 3].map(day => getLoHLeagueScoreAtDay(event, day)), [1000, 1000, 2000])
})

test("day League Score uses Bronze-capped awards and preserves the existing legacy starting balance", () => {
  let event = add(create(3990), "bronze-cap")
  const history = getLoHProgress(event)
  assert.equal(history.raceSets[0].rawScore, 1000)
  assert.equal(history.raceSets[0].awardedScore, 10)
  assert.equal(getLoHLeagueScoreAtDay(event, 1), 4000)
  event = add(finishLoHDay(event, 1), "ticket-day2")
  assert.deepEqual([1, 2].map(day => getLoHLeagueScoreAtDay(event, day)), [4000, 5000])
  const legacy = create(9000)
  assert.equal(getLoHLeagueScoreAtDay(legacy, 1), 9000)
  const continued = add(finishLoHDay(legacy, 1), "legacy-day2")
  assert.equal(getLoHLeagueScoreAtDay(continued, 1), 9000)
  assert.equal(getLoHLeagueScoreAtDay(continued, 2), 10000)
})

test("day League Score follows day/set chronology rather than array order, timestamps or cached totals", () => {
  let event = add(add(create(3990), "day1-cap"), "day1-ticket", ["6+", "6+", "6+"])
  event = add(finishLoHDay(event, 1), "day2-ticket")
  const reordered = { ...event, leagueScore: 99999, raceSets: [...event.raceSets].reverse().map((set, index) => ({
    ...set, createdAt: `2026-10-30T${String(10 + index).padStart(2, "0")}:00:00Z`,
  })) }
  const before = structuredClone(reordered)
  assert.deepEqual([1, 2].map(day => getLoHLeagueScoreAtDay(reordered, day)), [4150, 5150])
  assert.deepEqual(reordered, before)
})

test("only Day 1 is initially active; day completion is explicit, sequential and irreversible", () => {
  const event = create(), before = structuredClone(event)
  assert.deepEqual(getLoHMainStage(event).days.map(day => day.state), ["active", "locked", "locked", "locked", "locked", "locked"])
  assert.equal(getLoHMainStage(event).ticketsRemaining, 5)
  for (const day of [0, 2, 3, 6, 7]) {
    assert.throws(() => saveLoHRaceSet(event, input(event, "skip", [1, 2, 3], { day })), /locked|completed/)
    assert.throws(() => finishLoHDay(event, day), /locked|completed/)
  }
  const recorded = add(event, "first")
  assert.equal(getLoHMainStage(recorded).activeDay, 1, "saving never advances a day")
  const finished = finishLoHDay(recorded, 1)
  assert.deepEqual(getLoHMainStage(finished).days.map(day => day.state), ["completed", "active", "locked", "locked", "locked", "locked"])
  assert.throws(() => finishLoHDay(finished, 1), /locked|completed/)
  assert.equal(getLoHMainStage(finishLoHDay(finished, 2)).activeDay, 3)
  assert.deepEqual(event, before)
})

test("finished days reject add/edit/delete, including an attempt to move their set to the active day", () => {
  const event = finishLoHDay(add(create(), "saved"), 1), before = structuredClone(event)
  const set = event.raceSets[0]
  assert.throws(() => saveLoHRaceSet(event, set), /locked|completed/)
  assert.throws(() => saveLoHRaceSet(event, { ...set, day: 2 }), /locked|completed/)
  assert.throws(() => deleteLoHRaceSet(event, set.id), /locked|completed/)
  assert.throws(() => saveLoHRaceSet(event, input(event, "late", [1, 2, 3], { day: 1 })), /locked|completed/)
  const next = add(event, "next")
  assert.deepEqual(next.raceSets[0], set)
  assert.equal(next.raceSets[1].day, 2)
  assert.equal(getLoHProgress(next).raceSets[1].setNumber, 1)
  assert.deepEqual(event, before)
})

test("top-five placements are unique, 6th+ can repeat, and its average placement stays unknown", () => {
  for (const places of [[1, 1, "6+"], [4, 4, 5]]) {
    assert.equal(isCompleteLoHRace(places), false)
    assert.throws(() => add(create(), "duplicates", places), /unique/)
  }
  for (const places of [[3, "6+", "6+"], ["6+", "6+", "6+"]]) {
    assert.equal(isCompleteLoHRace(places), true)
    const event = add(create(), "range", places)
    assert.deepEqual(event.raceSets[0].races[0].placements.map(item => item.place), places)
    assert.equal(event.leagueScore, getLoHRaceRawScore(places) * 5)
    assert.deepEqual(getLoHParticipantStats(event).map(uma => uma.avgPlace), places.map(place => place === "6+" ? null : place))
    assert.equal(isImportedProfileFile(JSON.parse(JSON.stringify(backup(event)))), true)
  }
  assert.throws(() => add(create(), "fake-six", [1, 6, 7]), /6th\+/)
})

test("Weather and Condition are mandatory on save, but old unknown conditions remain importable", () => {
  const event = create()
  for (const values of [{ weather: null }, { condition: null }, { weather: "Random" }, { condition: "Random" }]) assert.throws(() => saveLoHRaceSet(event, input(event, "missing", [1, 2, 3], values)), /Weather|weather/)
  const recorded = add(event, "valid", [1, "6+", "6+"], { weather: "Rainy", condition: "Heavy" })
  const restored = migrateProfileData(JSON.parse(JSON.stringify(backup(recorded))).data).lohs[0]
  assert.deepEqual(restored.raceSets.map(set => [set.weather, set.condition]), [["Rainy", "Heavy"]])
  assert.equal(restored.weather, "Random")
  assert.equal(restored.condition, "Random")
  const older = { ...recorded, raceSets: recorded.raceSets.map(set => ({ ...set, weather: null, condition: null, ticketUsed: undefined })) }
  assert.equal(isImportedProfileFile(JSON.parse(JSON.stringify(backup(older)))), true)
  assert.deepEqual(normalizeLoH(older).raceSets[0].races, older.raceSets[0].races)
  assert.throws(() => saveLoHRaceSet(older, older.raceSets[0]), /Weather/)
})

test("3990 to Silver remains a whole FREE set, preserving all raw race points and five waiting tickets", () => {
  const event = add(create(3990), "crossing")
  const set = getLoHProgress(event).raceSets[0]
  assert.equal(set.ticketUsed, false)
  assert.equal(set.scoreBefore, 3990)
  assert.equal(set.scoreAfter, 4000)
  assert.equal(set.rawScore, 1000)
  assert.equal(set.awardedScore, 10)
  assert.deepEqual(set.races.map(race => race.awardedScore), [10, 0, 0, 0, 0])
  assert.equal(getLoHMainStage(event).ticketsRemaining, 5)
  const next = add(event, "ticketed")
  assert.equal(getLoHProgress(next).raceSets[1].ticketUsed, true)
  assert.equal(getLoHMainStage(next).ticketsRemaining, 4)
  assert.equal(next.leagueScore, 5000)
})

test("five ticketed sets use five tickets and the sixth cannot bypass the save guard", () => {
  let event = create(4000)
  for (let i = 0; i < 5; i++) event = add(event, `ticket-${i}`)
  const stage = getLoHMainStage(event), before = structuredClone(event)
  assert.equal(stage.days[0].ticketedSets, 5)
  assert.equal(stage.ticketsRemaining, 0)
  assert.equal(stage.canAddSet, false)
  assert.throws(() => add(event, "sixth", ["6+", "6+", "6+"], { ticketUsed: false }), /No League Tickets/)
  assert.deepEqual(event, before)
  const next = finishLoHDay(event, 1)
  assert.equal(getLoHMainStage(next).ticketsRemaining, 5)
})

test("unused tickets carry forward, daily grants happen once, and inventory never exceeds ten", () => {
  const twoTickets = add(add(create(4000), "one"), "two")
  assert.equal(getLoHMainStage(twoTickets).ticketsRemaining, 3)
  const day2 = finishLoHDay(twoTickets, 1)
  assert.equal(getLoHMainStage(day2).ticketsRemaining, 8)
  assert.equal(getLoHMainStage(day2).days[1].ticketsAtStart, 8)
  assert.equal(getLoHMainStage(day2).ticketsRemaining, 8, "reading state never grants tickets again")
  const unused = finishLoHDay(create(), 1)
  assert.equal(getLoHMainStage(unused).ticketsRemaining, 10)
  assert.equal(getLoHMainStage(finishLoHDay(unused, 2)).ticketsRemaining, 10)
})

test("27 FREE Bronze sets and five ticketed sets are legal on the same day", () => {
  let event = create()
  for (let i = 1; i <= 27; i++) {
    assert.equal(getLoHMainStage(event).canAddSet, true)
    event = add(event, `free-${i}`, ["6+", "6+", "6+"])
    assert.equal(getLoHMainStage(event).ticketsRemaining, 5)
  }
  assert.equal(event.leagueScore, 4000)
  for (let i = 1; i <= 5; i++) event = add(event, `ticket-${i}`, ["6+", "6+", "6+"])
  const day = getLoHMainStage(event).days[0]
  assert.deepEqual([day.freeSets, day.ticketedSets, day.sets.length, day.races, day.ticketsRemaining], [27, 5, 32, 160, 0])
  assert.equal(day.rawScore, 4800)
  assert.equal(day.awardedScore, 4750)
  assert.equal(event.participants[0].totalPoints, 1600)
  assert.equal(event.participants[0].avgPlace, null)
  assert.equal("ticketsRemaining" in event, false)
  assert.equal("freeSets" in event.mainStage, false)
  assert.throws(() => add(event, "too-many"), /No League Tickets/)
  const early = event.raceSets[0]
  const tooManyTickets = { ...early, races: early.races.map(race => ({ ...race, placements: race.placements.map((item, index) => ({ ...item, place: index + 1 })) })) }
  assert.throws(() => saveLoHRaceSet(event, tooManyTickets), /ticket inventory/)
})

test("chronological recalculation uses day then stable set order, not save timestamps or click order", () => {
  const event = create()
  const first = input(event, "day1-first", [1, 2, 3], { day: 1, order: 1, createdAt: "2026-10-30T14:00:00Z" })
  const second = input(event, "day1-second", [1, 2, 3], { day: 1, order: 2, createdAt: "2026-10-30T13:00:00Z" })
  const nextDay = input(event, "day2-first", [1, 2, 3], { day: 2, order: 1, createdAt: "2026-10-30T10:00:00Z" })
  const history = recalculateLoHProgress([nextDay, second, first])
  assert.deepEqual(history.raceSets.map(set => [set.id, set.setNumber]), [[first.id, 1], [second.id, 2], [nextDay.id, 1]])
  let recorded = add(create(), "original", [1, 2, 3], { order: 999 })
  recorded = add(recorded, "appended", [1, 2, 3], { createdAt: "2026-10-29T00:00:00Z", order: 1 })
  assert.deepEqual(recorded.raceSets.map(set => [set.id, set.order]), [["original", 1], ["appended", 2]])
  const edited = saveLoHRaceSet(recorded, { ...recorded.raceSets[0], order: 100, createdAt: "2026-11-01T00:00:00Z" })
  assert.deepEqual(edited.raceSets.map(set => [set.id, set.order, set.createdAt]), recorded.raceSets.map(set => [set.id, set.order, set.createdAt]))
  const legacy = { ...create(), raceSets: [first, second].map(({ order, ...set }) => ({ ...set, ticketUsed: false })) }
  const continued = add(legacy, "new-clock-behind", [1, 2, 3], { createdAt: "2026-10-29T00:00:00Z" })
  assert.deepEqual(continued.raceSets.map(set => set.id), [second.id, first.id, "new-clock-behind"], "a new explicit order does not shift timestamp fallbacks in older history")
})

test("Day 6 ends normally before a separate rank confirmation and never creates Day 7", () => {
  let event = create()
  for (let day = 1; day <= 5; day++) event = finishLoHDay(event, day)
  const before = structuredClone(event)
  const awaiting = finishLoHDay(event, 6)
  assert.equal(awaiting.overallRank, null)
  assert.equal(getLoHMainStage(awaiting).complete, true)
  assert.equal(isImportedProfileFile(backup(awaiting)), true)
  for (const rank of [undefined, null, 0, -1, 1.5, NaN, Infinity, "74", Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => confirmLoHMainStageRank(awaiting, rank), /positive integer/)
  assert.deepEqual(event, before)
  for (const [rank, qualified] of [[1, true], [96, true], [97, false], [128, false]]) {
    const finished = confirmLoHMainStageRank(awaiting, rank), state = getLoHMainStage(finished)
    assert.equal(state.complete, true)
    assert.equal(state.activeDay, null)
    assert.equal(state.days.length, 6)
    assert.ok(state.days.every(day => day.state === "completed"))
    assert.equal(state.qualified, qualified)
    assert.equal(finished.overallRank, rank)
    assert.equal(finished.completed, false, "Main Stage completion does not invent an Extra Stage result")
    assert.throws(() => add(finished, "after-main"), /locked|completed/)
    assert.throws(() => finishLoHDay(finished, 7), /locked|completed/)
    if (qualified) assert.throws(() => finishLoHEvent(finished), /Extra Stage/)
    else assert.equal(finishLoHEvent(finished).completed, true)
    assert.equal(isImportedProfileFile(JSON.parse(JSON.stringify(backup(finished)))), true)
  }
  assert.throws(() => finishLoHEvent(event), /Confirm the Main Stage rank/)
})

test("Main Stage completion preserves every input and freezes the last recorded trio even before ending LoH", () => {
  let event = add(create(), "day-one", [1, "6+", "6+"], { weather: "Cloudy", condition: "Good" })
  event = finishLoHDay(event, 1)
  event = updateLoHLineup(event, ["d", "e", "f"])
  event = add(event, "day-two", [3, "6+", "6+"], { weather: "Snowy", condition: "Heavy" })
  const history = JSON.parse(JSON.stringify(event.raceSets))
  for (let day = 2; day <= 5; day++) event = finishLoHDay(event, day)
  event = confirmLoHMainStageRank(finishLoHDay(event, 6), 74)
  const restored = migrateProfileData(JSON.parse(JSON.stringify(backup(event))).data).lohs[0]
  assert.deepEqual(restored.raceSets, history)
  assert.deepEqual(getLoHMainStage(restored), getLoHMainStage(JSON.parse(JSON.stringify(event))))
  assert.throws(() => updateLoHLineup(restored, ["g", "h", "i"]), /locked/)
  assert.deepEqual(getLoHResultLineup(restored).map(uma => uma.umaId), ["d", "e", "f"])
  assert.strictEqual(normalizeLoH(restored), restored)
})

test("old day/ticket metadata stays optional and legacy exact placements are never turned into fake 6th+ values", () => {
  const base = create()
  delete base.mainStage
  const old = { ...base, raceSets: [{ ...input(base, "old", [6, 7, 12], { day: 3, weather: null, condition: null }), ticketUsed: undefined }] }
  const file = JSON.parse(JSON.stringify(backup(old)))
  assert.equal(isImportedProfileFile(file), true)
  const restored = migrateProfileData(file.data).lohs[0]
  assert.deepEqual(getLoHMainStage(restored).days.map(day => day.state), ["completed", "completed", "active", "locked", "locked", "locked"])
  assert.deepEqual(restored.raceSets[0].races, old.raceSets[0].races)
  assert.deepEqual(restored.participants.map(uma => uma.avgPlace), [6, 7, 12])
  assert.equal(restored.mainStage, undefined, "loading does not invent explicit completion metadata")
  const continued = add(restored, "new")
  assert.deepEqual(continued.mainStage.completedDays, [1, 2])
  assert.deepEqual(continued.raceSets[0].races, old.raceSets[0].races)
  assert.equal(getLoHMainStage({ ...restored, completed: true }).activeDay, null)
})

test("malformed day completion state is rejected without changing older compatible profiles", () => {
  for (const mainStage of [{ completedDays: [2] }, { completedDays: [1, 1] }, { completedDays: [1, 3] }, { completedDays: [1, 2, 3, 4, 5, 6, 7] }, { completedDays: "1" }, null]) {
    assert.equal(isImportedProfileFile(backup({ ...create(), mainStage })), false)
  }
  assert.equal(isImportedProfileFile(backup({ ...create(), mainStage: { completedDays: [1, 2, 3, 4, 5, 6] }, overallRank: null })), true, "completed days may now await rank confirmation")
})
