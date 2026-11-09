import assert from "node:assert/strict"
import test from "node:test"
import { importTS } from "./helpers/importTS.mjs"

const { getLoHPlacementPoints, getLoHRaceRawScore, calculateLoHSetScore } = await importTS(new URL("../src/LoH/scoring.ts", import.meta.url))
const { createLoHEvent, normalizeLoH, updateLoHLineup, isLoHData } = await importTS(new URL("../src/LoH/lohData.ts", import.meta.url))
const { saveLoHRaceSet, deleteLoHRaceSet, recalculateLoHProgress, getLoHProgress, getLoHLineupSnapshot, getLoHParticipantStats, getLoHUmaStats, getLoHDailySummaries, getLoHResultLineup, getUniqueTopScoringUma, finishLoHDay, getLoHMainStage } = await importTS(new URL("../src/LoH/progress.ts", import.meta.url))
const { migrateProfileData, PROFILE_DATA_VERSION } = await importTS(new URL("../src/profiles/profileDataMigration.ts", import.meta.url))
const { isImportedProfileFile } = await importTS(new URL("../src/profiles/profileTransfer.ts", import.meta.url))

const lineup = ["version-a", "version-b", "version-c"]
const create = () => createLoHEvent([], { number: 1, name: "Results test", racecourse: "Tokyo", surface: "Turf", distance: 2400, length: "Medium", direction: "Left", weather: "Sunny", season: "Spring", condition: "Firm", lineup: lineup.map(id => ({ id, name: id, style: "Pace Chaser", ace: false, debuffer: false, autoRun: false })) }, "event", "2026-10-30T00:00:00.000Z")
const input = (event, number, places = [1, 2, 3], day = 1) => ({
  id: `set-${number}`, createdAt: `2026-10-30T${String(number).padStart(2, "0")}:00:00.000Z`, day,
  lineupSnapshot: getLoHLineupSnapshot(event), weather: "Sunny", condition: "Firm",
  races: Array.from({ length: 5 }, (_, race) => ({ id: `set-${number}-race-${race}`, placements: event.currentLineup.map((umaId, index) => ({ umaId, place: places[index] > 5 ? "6+" : places[index] })) })),
})
const add = (event, number, places, day = 1) => {
  while (getLoHMainStage(event).activeDay < day) event = finishLoHDay(event, getLoHMainStage(event).activeDay)
  return saveLoHRaceSet(event, input(event, number, places, day), `2026-10-30T${String(number).padStart(2, "0")}:01:00.000Z`)
}
const with3900 = () => { let event = create(); for (let set = 1; set <= 3; set++) event = add(event, set); return add(event, 4, [1, 2, 5]) }
const profileFile = event => ({ format: "uma-tracker-profile", version: 1, profile: { sourceProfileId: "trainer", name: "Trainer" }, data: { dataVersion: PROFILE_DATA_VERSION, cms: [], lohs: [event], customUmaDatabase: { customCharacters: [], customVersions: [], archivedVersionIds: [] }, favoriteUmaId: "", cmViewMode: "detailed", seenOfficialVersionIds: [] } })

test("placement scoring follows the requested values and rejects duplicate or invalid places", () => {
  assert.deepEqual(Array.from({ length: 12 }, (_, index) => getLoHPlacementPoints(index + 1)), [100, 60, 40, 30, 20, 10, 10, 10, 10, 10, 10, 10])
  for (const [places, expected] of [[[1, 2, 3], 200], [[1, 3, 5], 160], [[2, 1, 4], 190], [[6, 7, 12], 30]]) assert.equal(getLoHRaceRawScore(places), expected)
  for (const bad of [[1, 1, 4], [1, 2], [1, 2, 13], [0, 2, 3], [1.5, 2, 3], [null, 2, 3]]) assert.throws(() => getLoHRaceRawScore(bad))
  for (let a = 1; a <= 12; a++) for (let b = 1; b <= 12; b++) for (let c = 1; c <= 12; c++) if (new Set([a, b, c]).size === 3) assert.ok(getLoHRaceRawScore([a, b, c]) <= 200)
  assert.throws(() => calculateLoHSetScore([300, 200, 200, 200, 200], 0))
})

test("a perfect set saves five races, a frozen lineup, and 1000 points through one authoritative history", () => {
  const original = create(), source = input(original, 1), snapshot = structuredClone(source)
  const updated = saveLoHRaceSet(original, source)
  const set = getLoHProgress(updated).raceSets[0]
  assert.equal(set.rawScore, 1000)
  assert.equal(set.awardedScore, 1000)
  assert.equal(set.scoreBefore, 0)
  assert.equal(set.scoreAfter, 1000)
  assert.equal(set.ticketUsed, false)
  assert.equal(updated.leagueScore, 1000)
  assert.equal(updated.leagueRank, "BRONZE II")
  assert.equal(updated.racesPlayed, 5)
  assert.deepEqual(source, snapshot)
  assert.equal(original.raceSets, undefined)
  assert.deepEqual(updated.raceSets[0].lineupSnapshot.map(uma => uma.umaId), lineup)
  source.lineupSnapshot[0].umaId = "mutated"
  assert.equal(updated.raceSets[0].lineupSnapshot[0].umaId, lineup[0])
  assert.equal("rawScore" in updated.raceSets[0], false, "scores are derived, not independently editable stored inputs")
  assert.equal("rawPoints" in updated.raceSets[0].races[0].placements[0], false)
  assert.ok(updated.log.some(entry => entry.type === "raceSetSaved"))
  assert.ok(updated.log.some(entry => entry.type === "leagueRankUpdated" && entry.details[0] === "BRONZE I → BRONZE II"))
})

test("Bronze cap awards only 100 at 3900, records remaining raw results, and the next set uses a ticket", () => {
  const scoring = calculateLoHSetScore([200, 200, 200, 200, 200], 3900)
  assert.equal(scoring.scoreAfter, 4000)
  assert.deepEqual(scoring.awardedScores, [100, 0, 0, 0, 0])
  let event = with3900()
  assert.equal(event.leagueScore, 3900)
  event = add(event, 5)
  const capped = getLoHProgress(event).raceSets.at(-1)
  assert.equal(capped.rawScore, 1000)
  assert.equal(capped.awardedScore, 100)
  assert.equal(event.leagueRank, "SILVER I")
  assert.equal(event.raceSets.at(-1).ticketUsed, false)
  assert.equal(capped.races[4].placements[0].rawPoints, 100)
  assert.ok(event.log.some(entry => entry.details?.includes("Reached Silver I.")))
  event = add(event, 6)
  assert.equal(event.leagueScore, 5000)
  assert.equal(event.raceSets.at(-1).ticketUsed, true)
  assert.equal(getLoHProgress(event).raceSets.at(-1).awardedScore, 1000)
})

test("a cap reached mid-set keeps every placement and its raw points", () => {
  const scoring = calculateLoHSetScore([160, 190, 200, 180, 170], 3800)
  assert.deepEqual(scoring.awardedScores, [160, 40, 0, 0, 0])
  assert.equal(scoring.rawScore, 900)
  assert.equal(scoring.awardedScore, 200)
  assert.equal(scoring.scoreAfter, 4000)
})

test("lineup replacement affects only future sets and historical Umas retain uncapped performance", () => {
  let event = add(create(), 1)
  const first = structuredClone(event.raceSets[0])
  event = updateLoHLineup(event, [lineup[0], "version-d", lineup[2]])
  event = add(event, 2, [3, 1, 2])
  assert.deepEqual(event.raceSets[0], first)
  assert.deepEqual(event.raceSets[1].lineupSnapshot.map(uma => uma.umaId), [lineup[0], "version-d", lineup[2]])
  const stats = getLoHParticipantStats(event)
  assert.equal(stats.length, 4)
  assert.equal(stats.find(uma => uma.umaId === lineup[1]).races, 5)
  assert.equal(stats.find(uma => uma.umaId === "version-d").wins, 5)
  assert.equal(stats.find(uma => uma.umaId === lineup[0]).avgPlace, 2)
  assert.equal(stats.find(uma => uma.umaId === lineup[0]).totalPoints, 700)
  assert.ok(event.log.some(entry => entry.details?.includes(`Removed: ${lineup[1]}`)))
  const editedSnapshot = { ...event.raceSets[0], lineupSnapshot: event.raceSets[1].lineupSnapshot }
  assert.throws(() => saveLoHRaceSet(event, editedSnapshot), /original lineup/)
})

test("participant raw performance stays intact even when a free set awards zero for later races", () => {
  const event = add(with3900(), 5)
  const stats = getLoHParticipantStats(event)
  assert.equal(stats[0].races, 25)
  assert.equal(stats[0].wins, 25)
  assert.equal(stats[0].totalPoints, 2500)
  assert.equal(stats[0].avgPlace, 1)
  assert.equal(event.leagueScore, 4000)
  assert.equal(getLoHProgress(event).raceSets.reduce((sum, set) => sum + set.rawScore, 0), 4900)
})

test("daily summaries count actual sets and races, including more than 25 races on one day", () => {
  let event = create()
  for (let number = 1; number <= 9; number++) event = add(event, number, [1, 2, 3], number <= 6 ? 1 : 2)
  const days = getLoHDailySummaries(event)
  assert.deepEqual(days.map(day => [day.day, day.races, day.sets.length, day.awardedScore]), [[1, 30, 6, 6000], [2, 15, 3, 3000]])
})

test("editing or deleting an earlier Bronze set recalculates all later awards instead of subtracting the deleted score", () => {
  let event = add(add(with3900(), 5), 6)
  assert.equal(event.leagueScore, 5000)
  const before = structuredClone(event)
  const deleted = deleteLoHRaceSet(event, "set-4")
  assert.equal(deleted.leagueScore, 5000, "removing 900 raw points frees later points previously lost to the cap")
  assert.notEqual(deleted.leagueScore, event.leagueScore - 900)
  assert.deepEqual(getLoHProgress(deleted).raceSets.map(set => set.setNumber), [1, 2, 3, 4, 5])
  assert.deepEqual(deleted.raceSets.map(set => set.ticketUsed), [false, false, false, false, true])
  const existing = event.raceSets[3]
  const edited = saveLoHRaceSet(event, { ...existing, races: existing.races.map(race => ({ ...race, placements: race.placements.map((item, index) => ({ ...item, place: index + 1 })) })) })
  assert.equal(edited.leagueScore, 6000)
  assert.equal(edited.leagueRank, "SILVER II")
  assert.equal(edited.raceSets[4].ticketUsed, true)
  assert.ok(edited.log.some(entry => entry.type === "raceSetEdited"))
  assert.deepEqual(event, before)
})

test("history is ordered by recording time, stable for ties, and edits preserve that order", () => {
  const event = create(), first = input(event, 1), second = input(event, 2)
  const result = recalculateLoHProgress([second, first])
  assert.deepEqual(result.raceSets.map(set => set.id), [first.id, second.id])
  const sameTime = { ...second, createdAt: first.createdAt }
  const initial = saveLoHRaceSet(saveLoHRaceSet(event, first), sameTime)
  const edited = saveLoHRaceSet(initial, initial.raceSets[0])
  assert.deepEqual(edited.raceSets.map(set => set.id), [first.id, second.id])
})

test("save rejects incomplete teams, incomplete races, duplicate places, wrong participants and invalid days", () => {
  const event = create(), valid = input(event, 1)
  for (const count of [0, 1, 2]) assert.throws(() => saveLoHRaceSet(updateLoHLineup(event, lineup.slice(0, count)), valid), /lineup/)
  const invalid = [
    { ...valid, day: 0 }, { ...valid, day: 7 }, { ...valid, races: valid.races.slice(1) },
    { ...valid, races: valid.races.map(race => ({ ...race, placements: race.placements.slice(1) })) },
    { ...valid, races: valid.races.map(race => ({ ...race, placements: race.placements.map(item => ({ ...item, place: 1 })) })) },
    { ...valid, races: valid.races.map(race => ({ ...race, placements: race.placements.map(item => ({ ...item, umaId: "other" })) })) },
  ]
  for (const bad of invalid) assert.throws(() => saveLoHRaceSet(event, bad))
  assert.equal(event.raceSets, undefined)
})

test("profile backups retain sets, snapshots, null conditions and authoritative score across load and migration", () => {
  let event = add(with3900(), 5)
  event = updateLoHLineup(event, [lineup[0], "new-version", lineup[2]])
  event = add(event, 6, [2, 1, 4], 2)
  // Older backups may legitimately have no recorded per-set conditions.
  event = { ...event, raceSets: event.raceSets.map(set => ({ ...set, weather: null, condition: null })) }
  const file = JSON.parse(JSON.stringify(profileFile(event)))
  assert.equal(isImportedProfileFile(file), true)
  const migrated = migrateProfileData(file.data)
  assert.deepEqual(migrated.lohs[0], JSON.parse(JSON.stringify(event)))
  assert.strictEqual(migrateProfileData(migrated), migrated)
  assert.equal(migrated.lohs[0].raceSets[0].weather, null)
  assert.equal(migrated.lohs[0].raceSets[0].condition, null)
  assert.equal(migrated.lohs[0].raceSets[5].lineupSnapshot[1].umaId, "new-version")
  assert.equal(migrated.lohs[0].raceSets[0].lineupSnapshot[1].umaId, lineup[1])
  const tamperedCaches = { ...event, leagueScore: 99999, leagueRank: "PLATINUM IV", racesPlayed: 999 }
  const normalized = normalizeLoH(tamperedCaches)
  assert.equal(normalized.leagueScore, event.leagueScore)
  assert.equal(normalized.racesPlayed, event.racesPlayed)
  assert.strictEqual(normalizeLoH(normalized), normalized)
})

test("old aggregate-only results survive the first detailed set and its later deletion without invented history", () => {
  const legacy = { ...create(), leagueScore: 9000, leagueRank: "SILVER IV", racesPlayed: 50, firstPlaces: 12, participants: create().participants.map(uma => ({ ...uma, races: 50, wins: 4, totalPoints: 1000 })) }
  const updated = add(legacy, 1)
  assert.equal(updated.legacyProgress.leagueScore, 9000)
  assert.equal(updated.leagueScore, 10000)
  assert.equal(updated.racesPlayed, 55)
  assert.equal(updated.raceSets.length, 1)
  assert.equal(updated.raceSets[0].ticketUsed, true)
  assert.equal(getLoHParticipantStats(updated)[0].avgPlace, null, "unknown legacy placements stay unknown")
  const removed = deleteLoHRaceSet(updated, "set-1")
  assert.equal(removed.leagueScore, 9000)
  assert.equal(removed.racesPlayed, 50)
  assert.equal(getLoHDailySummaries(removed).length, 0)
  assert.equal(isLoHData(removed), true)
})

test("profile import refuses malformed saved race sources before overwriting data", () => {
  const event = add(create(), 1)
  for (const mutate of [
    set => { set.day = 7 }, set => { set.races.pop() }, set => { set.ticketUsed = "yes" },
    set => { set.races[0].placements[0].place = 13 }, set => { set.races[0].placements[1].place = 1 },
    set => { set.races[0].placements[0].umaId = "not-in-snapshot" },
    set => { set.lineupSnapshot[1].umaId = set.lineupSnapshot[0].umaId },
    set => { set.weather = "Made up" }, set => { set.createdAt = "not a date" },
  ]) {
    const file = JSON.parse(JSON.stringify(profileFile(event)))
    mutate(file.data.lohs[0].raceSets[0])
    assert.equal(isImportedProfileFile(file), false)
    assert.throws(() => normalizeLoH(file.data.lohs[0]))
  }
})

test("the Results trio has no featured Uma without recorded races or with a highest-point tie", () => {
  assert.equal(getUniqueTopScoringUma(create()), null)
  const aggregateOnly = { ...create(), leagueScore: 9000, participants: create().participants.map((uma, i) => ({ ...uma, totalPoints: i === 1 ? 5000 : 1000 })) }
  assert.equal(getUniqueTopScoringUma(aggregateOnly), null)
  const twoWay = add(add(create(), 1), 2, [2, 1, 3])
  assert.equal(getUniqueTopScoringUma(twoWay), null)
  const threeWay = add(add(add(create(), 1), 2, [3, 1, 2]), 3, [2, 3, 1])
  assert.equal(getUniqueTopScoringUma(threeWay), null)
})

test("featured Uma follows unique raw points and updates after race edits and deletion", () => {
  const first = add(create(), 1)
  assert.equal(getUniqueTopScoringUma(first), lineup[0])
  const second = add(first, 2, [3, 1, 2])
  const original = structuredClone(second)
  assert.equal(getUniqueTopScoringUma(second), lineup[1])
  assert.equal(getUniqueTopScoringUma(deleteLoHRaceSet(second, "set-2")), lineup[0])
  const source = second.raceSets[1]
  const edited = saveLoHRaceSet(second, { ...source, races: source.races.map(race => ({ ...race, placements: race.placements.map((item, i) => ({ ...item, place: [1, 3, 2][i] })) })) })
  assert.equal(getUniqueTopScoringUma(edited), lineup[0])
  assert.deepEqual(second, original)
  assert.equal("featuredUmaId" in edited, false)
})

test("featured selection uses raw race points despite the cap and ignores old aggregate totals", () => {
  const old = { ...create(), leagueScore: 3900, participants: create().participants.map((uma, i) => ({ ...uma, totalPoints: i === 0 ? 99999 : 0 })) }
  const event = add(old, 1, [6, 1, 7])
  assert.equal(event.leagueScore, 4000)
  assert.equal(getLoHProgress(event).raceSets[0].awardedScore, 100)
  assert.equal(getLoHProgress(event).raceSets[0].rawScore, 600)
  assert.equal(getUniqueTopScoringUma(event), lineup[1])
})

test("active Results keeps the current trio and excludes a former global points leader", () => {
  const event = updateLoHLineup(add(create(), 1, [2, 1, 3]), [lineup[0], "version-d", lineup[2]])
  assert.deepEqual(getLoHResultLineup(event).map(uma => uma.umaId), [lineup[0], "version-d", lineup[2]])
  assert.equal(getUniqueTopScoringUma(event), lineup[0], "only the displayed trio competes for featured status")
})

test("completed Main Stage uses its last set snapshot rather than later current-lineup changes", () => {
  let event = updateLoHLineup(add(create(), 1, [2, 1, 3]), [lineup[0], "version-d", lineup[2]])
  event = add(event, 2, [6, 1, 7])
  event = updateLoHLineup(event, ["version-e", "version-f", "version-g"])
  assert.deepEqual(getLoHResultLineup(event).map(uma => uma.umaId), ["version-e", "version-f", "version-g"])
  assert.equal(getUniqueTopScoringUma(event), null)
  const completed = { ...event, completed: true }
  assert.deepEqual(getLoHResultLineup(completed), event.raceSets[1].lineupSnapshot)
  assert.equal(getUniqueTopScoringUma(completed), "version-d")
  assert.deepEqual(getLoHResultLineup({ ...create(), completed: true }).map(uma => uma.umaId), lineup)
})

test("Umas and Results share raw race statistics, with zero points and zero WR before the first set", () => {
  const event = create(), original = structuredClone(event)
  const stats = getLoHUmaStats(event)
  assert.equal(stats.length, 3)
  for (const uma of stats) {
    assert.equal(uma.rawPoints, 0)
    assert.equal(uma.winRate, 0)
    assert.equal(uma.races, 0)
    assert.equal(uma.averagePlacement, null)
  }
  assert.deepEqual(event, original)
  const recorded = add(add(event, 1), 2, [2, 1, 4])
  const actual = getLoHUmaStats(recorded)
  assert.deepEqual(actual.map(uma => [uma.races, uma.wins, uma.rawPoints, uma.winRate, uma.averagePlacement]), [[10, 5, 800, 50, 1.5], [10, 5, 800, 50, 1.5], [10, 0, 350, 0, 3.5]])
  assert.equal(getUniqueTopScoringUma(recorded), null)
  assert.equal(recorded.participants.some(uma => "rawPoints" in uma || "winRate" in uma || "averagePlacement" in uma), false)
})

test("displayed performance ignores capped awards and aggregate-only legacy values", () => {
  const event = add(with3900(), 5)
  assert.equal(getLoHUmaStats(event)[0].rawPoints, 2500)
  assert.equal(getLoHUmaStats(event)[0].winRate, 100)
  assert.equal(event.leagueScore, 4000)
  const aggregateOnly = { ...create(), leagueScore: 24680, participants: create().participants.map(uma => ({ ...uma, races: 200, wins: 40, totalPoints: 10000, avgPlace: 3 })) }
  assert.ok(getLoHUmaStats(aggregateOnly).every(uma => uma.rawPoints === 0 && uma.winRate === 0 && uma.races === 0))
  assert.equal(aggregateOnly.leagueScore, 24680)
})
