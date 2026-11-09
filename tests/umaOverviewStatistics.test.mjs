import assert from "node:assert/strict"
import test from "node:test"
import { importTS } from "./helpers/importTS.mjs"

const { getUmaOverviewStatistics } = await importTS(new URL("../src/Statistics/umaOverviewStatistics.ts", import.meta.url))
const { calculateUmaStatistics } = await importTS(new URL("../src/Statistics/umaStatistics.ts", import.meta.url))
const { calculateUmaRoleStatistics } = await importTS(new URL("../src/Statistics/umaRoleStatistics.ts", import.meta.url))
const { createLoHEvent, updateLoHEvent } = await importTS(new URL("../src/LoH/lohData.ts", import.meta.url))
const { saveLoHRaceSet, getLoHLineupSnapshot, finishLoHDay, confirmLoHMainStageRank, registerLoHExtraStageLineup, saveLoHExtraStageResult, getLoHParticipantStats } = await importTS(new URL("../src/LoH/progress.ts", import.meta.url))
const { getLoHConfigurationKey } = await importTS(new URL("../src/LoH/configurations.ts", import.meta.url))
const { getLoHExtraStageCandidates } = await importTS(new URL("../src/LoH/extraStage.ts", import.meta.url))

const characters = [{ id: "fuji-character", name: "Fuji Kiseki" }, { id: "teio-character", name: "Tokai Teio" }]
const versions = [
  { id: "fuji", characterId: "fuji-character", displayName: "Fuji Kiseki", avatar: "fuji.png", archived: true },
  { id: "fuji-alt", characterId: "fuji-character", displayName: "Fuji Kiseki (Alternate)", avatar: "alt.png" },
  { id: "teio", characterId: "teio-character", displayName: "Tokai Teio" },
]
const details = { number: 1, name: "Overview", racecourse: "Tokyo", surface: "Turf", distance: 1600, length: "Mile", direction: "Left", season: "Spring" }
const team = (id = "fuji", style = "Pace Chaser") => [id, "teio", "unknown-ship"].map((id, index) => ({ id, name: id, style: index === 0 ? style : index === 1 ? "Pace Chaser" : "End Closer", ace: false, debuffer: false, autoRun: false }))
const create = (id = "fuji") => createLoHEvent([], { ...details, lineup: team(id) }, `event-${id}`)
const add = (event, id, places = [1, 2, 3]) => saveLoHRaceSet(event, {
  id, day: 1, createdAt: "2026-11-01T01:00:00Z", weather: "Sunny", condition: "Firm", lineupSnapshot: getLoHLineupSnapshot(event),
  races: Array.from({ length: 5 }, (_, i) => ({ id: `${id}-${i}`, placements: event.currentLineup.map((umaId, index) => ({ umaId, place: places[index] })) })),
})
function historyWithExtra() {
  let event = add(create(), "pc")
  event = updateLoHEvent(event, [event], { ...details, lineup: team("fuji", "Late Surger") })
  event = add(event, "ls", [2, 1, 3])
  for (let day = 1; day <= 6; day++) event = finishLoHDay(event, day)
  event = confirmLoHMainStageRank(event, 74)
  const candidates = getLoHExtraStageCandidates(event).filter(uma => uma.umaId !== "fuji" || uma.runningStyle === "late_surger")
  event = registerLoHExtraStageLineup(event, candidates.map(getLoHConfigurationKey))
  return saveLoHExtraStageResult(event, { id: "extra", createdAt: "2026-11-02T01:00:00Z", weather: "Rainy", condition: "Soft", placements: event.extraStage.lineupSnapshot.map(uma => ({ umaId: uma.umaId, placement: uma.umaId === "fuji" ? "first" : "fourth_or_lower" })) })
}
const cm = extra => ({ number: 1, name: "CM", track: "Tokyo", surface: "Turf", distance: 1600, length: "Mile", finalPlace: "", participants: [{ cmUmaId: "c1", umaId: "fuji", runningStyle: "pace_chaser", finalParticipant: false, won: false }], attempts: [{ day: 1, attempt: 1, racesPlayed: 5, retired: false, umaWins: [{ cmUmaId: "c1", wins: 1 }] }], ...extra })
const project = (cms = [], lohs = []) => getUmaOverviewStatistics(cms, lohs, characters, versions)

test("empty scopes keep zero counts and unavailable rates without ranking unused lineups", () => {
  const result = project([cm({ attempts: [] })], [create()])
  for (const scope of Object.values(result)) {
    assert.deepEqual(scope.overall, { races: 0, wins: 0, winRate: null, umasUsed: 0 })
    assert.deepEqual(scope.umas, [])
    assert.ok(scope.runningStyles.every(row => row.winRate === null && (row.usage === null || row.usage === 0)))
  }
})

test("Overall adds CM and LoH counts with weighted rates while scopes stay independent", () => {
  const { cm: champions, loh, overall } = project([cm()], [historyWithExtra()])
  assert.deepEqual(champions.overall, { races: 5, wins: 1, winRate: 20, umasUsed: 1 })
  assert.deepEqual(loh.overall, { races: 11, wins: 11, winRate: 100, umasUsed: 3 })
  assert.deepEqual(overall.overall, { races: 16, wins: 12, winRate: 75, umasUsed: 3 })
  const fuji = overall.umas.find(uma => uma.versionId === "fuji")
  assert.deepEqual([fuji.races, fuji.wins, fuji.winRate, fuji.cmEvents, fuji.lohEvents], [16, 7, 43.75, 1, 1])
  assert.equal(fuji.extraStageAppearances, 1)
  assert.deepEqual(overall.surfaces.find(row => row.surface === "Turf"), { surface: "Turf", races: 16, wins: 12, winRate: 75 })
  assert.deepEqual(overall.categories.filter(row => row.races > 0), [{ category: "Mile", races: 16, wins: 12, winRate: 75 }])
  assert.equal(champions.umas[0].races, 5)
})

test("LoH styles use historical set and Extra Stage snapshots, not today's lineup flags", () => {
  const event = historyWithExtra()
  event.participants = event.participants.map(uma => ({ ...uma, runningStyle: "runaway", ace: true, autoRun: true }))
  const { loh } = project([], [event])
  const style = id => loh.runningStyles.find(row => row.style === id)
  assert.deepEqual([style("pace_chaser").races, style("pace_chaser").wins], [16, 10])
  assert.deepEqual([style("late_surger").races, style("late_surger").wins], [6, 1])
  assert.equal(style("end_closer").races, 11)
  assert.equal(style("runaway").races, 0)
  assert.ok(Math.abs(loh.runningStyles.reduce((sum, row) => sum + row.usage, 0) - 100) < 1e-10)
  for (const participant of getLoHParticipantStats(event)) {
    const uma = loh.umas.find(row => row.versionId === participant.umaId)
    assert.deepEqual([uma.races, uma.wins, uma.rawPoints], [participant.races, participant.wins, participant.totalPoints])
  }
})

test("exact alternate, archived and unresolved versions stay distinct across event types", () => {
  const { overall, loh } = project([cm()], [add(create("fuji-alt"), "alternate")])
  assert.equal(overall.umas.find(uma => uma.versionId === "fuji").races, 5)
  assert.equal(overall.umas.find(uma => uma.versionId === "fuji-alt").races, 5)
  assert.equal(overall.umas.find(uma => uma.versionId === "fuji").avatar, "fuji.png")
  assert.equal(overall.umas.find(uma => uma.versionId === "fuji-alt").avatar, "alt.png")
  assert.equal(loh.umas.find(uma => uma.versionId === "unknown-ship").unresolved, true)
  assert.equal(overall.overall.umasUsed, 4)
})

test("raw points come from Main Stage placements and ignore the Bronze cap and Extra Stage", () => {
  let event = add(create(), "cap-start", [1, 2, 4])
  for (let i = 0; i < 4; i++) event = add(event, `cap-${i}`)
  assert.equal(event.leagueScore, 4000)
  const { loh } = project([], [event])
  assert.equal(loh.umas.reduce((sum, uma) => sum + uma.rawPoints, 0), 4950)
  const extra = project([], [historyWithExtra()]).loh.umas.find(uma => uma.versionId === "fuji")
  assert.deepEqual([extra.races, extra.wins, extra.rawPoints], [11, 6, 800])
})

test("legacy missing points and unknown classifications stay unknown without inventing results", () => {
  const event = { ...create(), raceSets: undefined, leagueScore: 4000, racesPlayed: 2, firstPlaces: 1, distance: 1700, length: "unknown", surface: "unknown", participants: [{ umaId: "fuji", races: 2, wins: 1, top3Finishes: 1 }] }
  const { loh } = project([], [event])
  assert.deepEqual(loh.overall, { races: 2, wins: 1, winRate: 50, umasUsed: 1 })
  assert.equal(loh.umas[0].rawPoints, null)
  assert.equal(loh.uncategorizedRaces, 2)
  assert.deepEqual(loh.categories, [])
  assert.ok(loh.surfaces.every(row => row.races === 0))
  assert.ok(loh.runningStyles.every(row => row.races === 0 && row.usage === null))
})

test("CM projection preserves existing round totals and individual final appearances, without mutations", () => {
  const champion = cm({ finalPlace: "1st", participants: [{ cmUmaId: "c1", umaId: "fuji", runningStyle: "pace_chaser", finalParticipant: true, won: true }] })
  const league = historyWithExtra(), before = structuredClone({ champion, league, characters, versions })
  const result = project([champion], [league])
  const previous = calculateUmaStatistics([champion], characters, versions)
  for (const key of ["umas", "overall", "distances", "surfaces"]) assert.deepEqual(result.cm[key], previous[key])
  assert.equal(result.cm.umas[0].races, 6)
  assert.equal(result.cm.overall.races, 5)
  assert.deepEqual({ champion, league, characters, versions }, before)
})

test("Role breakdown uses recorded LoH flags across sets and Extra Stage, with weighted Overall usage", () => {
  let event = add(create(), "before-roles")
  const lineup = team("fuji", "Late Surger").map((uma, index) => ({ ...uma, ace: index === 0, debuffer: index === 1, autoRun: index === 2 }))
  event = updateLoHEvent(event, [event], { ...details, lineup })
  event = add(event, "with-roles", [2, 1, 3])
  for (let day = 1; day <= 6; day++) event = finishLoHDay(event, day)
  event = confirmLoHMainStageRank(event, 74)
  const candidates = getLoHExtraStageCandidates(event).filter(uma => lineup.some(entry => entry.id === uma.umaId && entry.ace === uma.ace && entry.debuffer === uma.debuffer && entry.autoRun === uma.autoRun && (uma.umaId !== "fuji" || uma.runningStyle === "late_surger")))
  event = registerLoHExtraStageLineup(event, candidates.map(getLoHConfigurationKey))
  event = saveLoHExtraStageResult(event, { id: "role-extra", createdAt: "2026-11-02T01:00:00Z", weather: "Sunny", condition: "Firm", placements: event.extraStage.lineupSnapshot.map(uma => ({ umaId: uma.umaId, placement: uma.umaId === "fuji" ? "first" : "fourth_or_lower" })) })
  event.participants = event.participants.map(uma => ({ ...uma, ace: true, debuffer: true }))
  const champion = cm({ attempts: [{ day: 1, attempt: 1, racesPlayed: 5, umaWins: [{ cmUmaId: "c1", wins: 1, configuration: { umaVersionId: "fuji", runningStyle: "pace_chaser", ace: true, debuffer: true, entrySource: "manual", configurationSource: "recorded" } }] }] })
  const before = structuredClone({ event, champion })
  const { cm: champions, loh, overall } = project([champion], [event])
  const role = (scope, id) => scope.roles.find(row => row.role === id)
  assert.deepEqual(loh.roles.map(row => [row.role, row.races, row.wins]), [["no_special_role", 21, 5], ["ace", 6, 1], ["debuffer", 6, 5], ["ace_debuffer", 0, 0]])
  assert.equal(role(loh, "no_special_role").usage, 21 / 33 * 100)
  assert.deepEqual(champions.roles, calculateUmaRoleStatistics([champion]).rows)
  assert.deepEqual([role(overall, "ace_debuffer").races, role(overall, "ace_debuffer").wins, role(overall, "ace_debuffer").winRate], [5, 1, 20])
  assert.equal(role(overall, "no_special_role").usage, 21 / 38 * 100)
  assert.deepEqual({ event, champion }, before)
})

test("LoH Role breakdown never borrows missing historical flags from a current lineup", () => {
  const event = add(create(), "unknown-roles")
  for (const member of event.raceSets[0].lineupSnapshot) { delete member.ace; delete member.debuffer }
  event.participants = event.participants.map(uma => ({ ...uma, ace: true, debuffer: true }))
  const { loh } = project([], [event])
  assert.ok(loh.roles.every(row => row.races === 0 && row.wins === 0 && row.usage === null && row.winRate === null))
  assert.equal(loh.overall.races, 5)
  assert.equal(loh.umas.reduce((sum, uma) => sum + uma.races, 0), 15)
})
