import assert from "node:assert/strict"
import test from "node:test"
import { importTS } from "./helpers/importTS.mjs"

const { createLoHEvent, normalizeLoH, updateLoHLineup, updateLoHEvent, isLoHData } = await importTS(new URL("../src/LoH/lohData.ts", import.meta.url))
const { migrateProfileData, PROFILE_DATA_VERSION } = await importTS(new URL("../src/profiles/profileDataMigration.ts", import.meta.url))
const { isImportedProfileFile } = await importTS(new URL("../src/profiles/profileTransfer.ts", import.meta.url))
const { saveLoHRaceSet, getLoHLineupSnapshot, assertLoHRaceSet, finishLoHDay } = await importTS(new URL("../src/LoH/progress.ts", import.meta.url))
const { TRACK_WEATHER, TRACK_CONDITIONS } = await importTS(new URL("../src/types/types.ts", import.meta.url))

const timestamp = "2026-10-30T12:00:00.000Z"
const details = { number: 1, name: " League of Heroes #1 ", racecourse: "Tokyo", surface: "Turf", distance: 2400, length: "Medium", direction: "Left", weather: "Sunny", season: "Spring", condition: "Firm" }
const create = (events = [], extra = {}) => createLoHEvent(events, { ...details, ...extra }, "loh-new", timestamp)
const legacy = () => ({ number: 4, name: "Previous LoH", track: "Kyoto", score: 24680, rank: "PLATINUM II", racesPlayed: 125, firstPlaces: 42, top3Finishes: 87, completed: true, participants: [{ umaId: "legacy-uma", races: 125, wins: 42, top3Finishes: 87 }] })
const profile = lohs => ({ dataVersion: PROFILE_DATA_VERSION, cms: [], lohs, customUmaDatabase: { customCharacters: [], customVersions: [], archivedVersionIds: [] }, favoriteUmaId: "favorite", cmViewMode: "detailed", seenOfficialVersionIds: [], onboardingCompleted: true })
const backup = data => ({ format: "uma-tracker-profile", version: 1, profile: { sourceProfileId: "profile-one", name: "Trainer" }, data })

test("creation records track conditions with fixed Random weather and condition, without invented results", () => {
  const first = create()
  assert.equal(first.number, 1)
  assert.equal(first.name, "League of Heroes #1")
  for (const key of Object.keys(details).filter(key => !["name", "weather", "condition"].includes(key))) assert.equal(first[key], details[key])
  assert.equal(first.weather, "Random")
  assert.equal(first.condition, "Random")
  assert.equal(create([first], { number: 8 }).number, 8)
  assert.throws(() => create([first]), /already exists/)
  assert.equal(first.leagueScore, 0)
  assert.equal(first.leagueRank, "BRONZE I")
  assert.equal(first.overallRank, null)
  assert.deepEqual(first.currentLineup, [])
  assert.deepEqual(first.participants, [])
  assert.equal(first.log[0].message, "LoH created.")
  assert.equal(first.log[0].timestamp, timestamp)
  assert.equal(isLoHData(first), true)
  for (const key of ["raceSets", "tickets", "extraStage", "rankThresholds"]) assert.equal(key in first, false)
})

test("creation rejects invalid numbers, blank names, invalid distances and unsupported conditions", () => {
  for (const invalid of [{ number: 0 }, { number: -1 }, { number: 1.5 }, { number: Number.MAX_SAFE_INTEGER + 1 }, { name: "  " }, { racecourse: "" }, { distance: 0 }, { distance: -1 }, { distance: 2400.5 }, { distance: Infinity }, { surface: "Water" }, { direction: "Unknown" }]) {
    assert.throws(() => create([], invalid), /valid event/)
  }
})

test("the three optional draft slots do not create placeholder participants", () => {
  const empty = { id: "", name: "", style: "Runaway", ace: false, debuffer: false, autoRun: false }
  const event = create([], { lineup: [empty, empty, empty] })
  assert.deepEqual(event.currentLineup, [])
  assert.deepEqual(event.participants, [])
  assert.equal("lineup" in event, false, "form-only fields are not persisted")
})

test("creating with a full lineup preserves exact versions, styles and roles through profile backups", () => {
  const lineup = [
    { id: "version-a", name: "Uma A", style: "Pace Chaser", ace: true, debuffer: false, autoRun: false },
    { id: "version-b", name: "Uma B", style: "End Closer", ace: false, debuffer: true, autoRun: false },
    { id: "custom-version", name: "Custom Uma", style: "Front Runner", ace: false, debuffer: false, autoRun: true },
  ]
  const event = create([], { lineup })
  assert.deepEqual(event.currentLineup, lineup.map(uma => uma.id))
  assert.deepEqual(event.participants.map(uma => uma.runningStyle), ["pace_chaser", "end_closer", "front_runner"])
  for (let index = 0; index < 3; index++) {
    for (const key of ["ace", "debuffer", "autoRun"]) assert.equal(event.participants[index][key], lineup[index][key])
    assert.equal(event.participants[index].races, 0)
    for (const key of ["won", "finalParticipant", "cmUmaId", "style", "name"]) assert.equal(key in event.participants[index], false)
  }
  assert.equal(event.leagueScore, 0)
  assert.equal(event.overallRank, null)
  assert.equal(event.log[0].message, "LoH created.")
  const exported = JSON.parse(JSON.stringify(backup(profile([event]))))
  assert.equal(isImportedProfileFile(exported), true)
  assert.deepEqual(migrateProfileData(exported.data).lohs[0], event)
  assert.equal(isImportedProfileFile(backup(profile([{ ...event, participants: event.participants.map(uma => ({ ...uma, runningStyle: "invalid" })) }]))), false)
  assert.throws(() => create([], { lineup: [lineup[0], lineup[0]] }), /different Umas/)
  assert.throws(() => create([], { lineup: [...lineup, { ...lineup[0], id: "fourth" }] }), /three/)
})

test("partial initial lineups remain optional and their configuration survives later team changes", () => {
  const event = create([], { lineup: [{ id: "version-a", name: "Uma A", style: "Late Surger", ace: true, debuffer: true, autoRun: false }] })
  const updated = updateLoHLineup(event, ["version-b"])
  assert.deepEqual(updated.participants[0], event.participants[0])
  assert.equal(updated.participants[0].runningStyle, "late_surger")
  assert.equal(isLoHData(updated), true)
})

test("legacy migration preserves all recorded results and keeps unknown conditions and lineup unknown", () => {
  const old = legacy(), original = structuredClone(old)
  const migrated = normalizeLoH(old)
  assert.deepEqual(old, original)
  assert.equal(migrated.id, "loh-4")
  assert.equal(migrated.racecourse, old.track)
  assert.equal(migrated.leagueScore, old.score)
  assert.equal(migrated.leagueRank, old.rank)
  for (const key of ["racesPlayed", "firstPlaces", "top3Finishes", "completed", "participants"]) assert.deepEqual(migrated[key], old[key])
  for (const key of ["surface", "distance", "length", "direction", "season", "overallRank"]) assert.equal(migrated[key], null)
  assert.equal(migrated.weather, "Random")
  assert.equal(migrated.condition, "Random")
  assert.deepEqual(migrated.currentLineup, [])
  assert.deepEqual(migrated.log, [])
  assert.strictEqual(normalizeLoH(migrated), migrated)
})

test("profile migration and backup round trips preserve both old LoH history and new event fields", () => {
  const original = { ...profile([legacy()]), dataVersion: 2 }
  assert.equal(isImportedProfileFile(backup(original)), true)
  const migrated = migrateProfileData(original)
  assert.equal(migrated.dataVersion, PROFILE_DATA_VERSION)
  assert.equal(migrated.favoriteUmaId, original.favoriteUmaId)
  assert.deepEqual(migrated.cms, original.cms)
  assert.strictEqual(migrateProfileData(migrated), migrated)
  const exported = JSON.parse(JSON.stringify(backup({ ...migrated, lohs: [...migrated.lohs, create()] })))
  assert.equal(isImportedProfileFile(exported), true)
  assert.deepEqual(migrateProfileData(exported.data), exported.data)
})

test("current profile backups refresh stale ranks from score without changing recorded results", () => {
  for (const [score, staleRank, expected] of [[0, "", "BRONZE I"], [5500, "GOLD_IV", "SILVER II"], [30000, "BRONZE I", "PLATINUM IV"]]) {
    const event = { ...create(), leagueScore: score, leagueRank: staleRank, overallRank: 74, racesPlayed: 125, firstPlaces: 42 }
    const original = structuredClone(event)
    const exported = JSON.parse(JSON.stringify(backup(profile([event]))))
    assert.equal(isImportedProfileFile(exported), true)
    const migrated = migrateProfileData(exported.data)
    assert.equal(migrated.lohs[0].leagueRank, expected)
    assert.deepEqual({ ...migrated.lohs[0], leagueRank: staleRank }, original)
    assert.deepEqual(event, original)
    assert.strictEqual(migrateProfileData(migrated), migrated)
    assert.equal("stars" in migrated.lohs[0], false)
  }
})

test("legacy profile rank is derived from the recorded score instead of its old label", () => {
  const event = { ...legacy(), score: 15000, rank: "PLATINUM_IV" }
  const migrated = normalizeLoH(event)
  assert.equal(migrated.leagueRank, "GOLD III")
  assert.equal(migrated.leagueScore, event.score)
  assert.deepEqual(migrated.participants, event.participants)
  assert.strictEqual(normalizeLoH(migrated), migrated)
})

test("migration preserves separate legacy records that reference the same Uma", () => {
  const original = legacy()
  original.participants.push({ ...original.participants[0], wins: 0, races: 1, top3Finishes: 0 })
  const migrated = normalizeLoH(original)
  assert.deepEqual(migrated.participants, original.participants)
  assert.equal(isImportedProfileFile(backup(profile([migrated]))), true)
  assert.strictEqual(normalizeLoH(migrated), migrated)
})

test("lineup replacement retains former participants and never changes recorded performance", () => {
  const event = { ...create(), participants: [{ umaId: "a", races: 5, wins: 2, top3Finishes: 4, totalPoints: 800, avgPlace: 2.4 }], currentLineup: ["a"] }
  const updated = updateLoHLineup(event, ["b", "c", "d"], timestamp, "test-change")
  assert.deepEqual(event.currentLineup, ["a"])
  assert.deepEqual(updated.currentLineup, ["b", "c", "d"])
  assert.equal(updated.participants.length, 4)
  assert.deepEqual(updated.participants[0], event.participants[0])
  assert.equal(updated.leagueScore, event.leagueScore)
  assert.equal(updated.log.at(-1).message, "Lineup updated.")
  assert.equal(isLoHData(updated), true)
  assert.strictEqual(updateLoHLineup(updated, ["b", "c", "d"]), updated)
  assert.throws(() => updateLoHLineup(event, ["b", "b"]), /different Umas/)
  assert.throws(() => updateLoHLineup(event, ["a", "b", "c", "d"]), /three/)
})

test("backup validation rejects malformed new fields instead of falling back to legacy aliases", () => {
  const event = { ...normalizeLoH(legacy()), ...create() }
  for (const invalid of [{ leagueScore: NaN }, { overallRank: 0 }, { currentLineup: ["missing"] }, { log: [{}] }, { direction: "Invalid" }, { participants: [{ umaId: "a", races: 0, wins: 0, top3Finishes: 0, avgPlace: 13 }] }]) {
    assert.equal(isImportedProfileFile(backup(profile([{ ...event, ...invalid }]))), false)
  }
})

test("editing metadata preserves all recorded league results, participant totals and previous log entries", () => {
  const event = { ...create(), leagueScore: 24680, leagueRank: "PLATINUM II", overallRank: 74, racesPlayed: 125, firstPlaces: 42, top3Finishes: 87, completed: true,
    currentLineup: ["known"], participants: [{ umaId: "known", races: 125, wins: 42, top3Finishes: 87, totalPoints: 24680, avgPlace: 2.5 }] }
  const before = structuredClone(event)
  const updated = updateLoHEvent(event, [event], { ...details, number: 7, name: "Updated event", racecourse: "Kokura", distance: 332 }, timestamp, "edit-test")
  assert.deepEqual(event, before)
  assert.equal(updated.id, event.id)
  assert.equal(updated.number, 7)
  assert.equal(updated.racecourse, "Kokura")
  assert.equal(updated.distance, 332)
  for (const key of ["leagueScore", "leagueRank", "overallRank", "racesPlayed", "firstPlaces", "top3Finishes", "completed", "currentLineup", "participants"]) assert.deepEqual(updated[key], event[key])
  assert.deepEqual(updated.log.slice(0, -1), event.log)
  assert.equal(updated.log.at(-1).message, "LoH updated.")
  assert.equal(isImportedProfileFile(backup(profile([updated]))), true)
  assert.throws(() => updateLoHEvent(event, [event, { ...event, id: "other", number: 7 }], { ...details, number: 7 }), /already exists/)
})

test("editing the current team keeps former participants and retains existing counts for returning Umas", () => {
  const event = { ...create(), currentLineup: ["known"], participants: [{ umaId: "known", races: 12, wins: 4, top3Finishes: 8, totalPoints: 2000, runningStyle: "end_closer" }] }
  const lineup = [{ id: "known", name: "Known Uma", style: "Pace Chaser", ace: true, debuffer: false, autoRun: false }, { id: "new", name: "New Uma", style: "Late Surger", ace: false, debuffer: true, autoRun: false }]
  const updated = updateLoHEvent(event, [event], { ...details, lineup }, timestamp, "lineup-edit")
  assert.deepEqual(updated.currentLineup, ["known", "new"])
  assert.equal(updated.participants[0].races, 12)
  assert.equal(updated.participants[0].wins, 4)
  assert.equal(updated.participants[0].totalPoints, 2000)
  assert.equal(updated.participants[0].runningStyle, "pace_chaser")
  assert.equal(updated.participants[0].ace, true)
  const cleared = updateLoHEvent(updated, [updated], { ...details, lineup: [] }, timestamp, "clear-lineup")
  assert.deepEqual(cleared.currentLineup, [])
  assert.deepEqual(cleared.participants, updated.participants)
  assert.equal(isLoHData(cleared), true)
})

test("event creation and editing always use Random even when legacy conditions are supplied or omitted", () => {
  for (const [weather, condition] of [["Sunny", "Firm"], ["Rainy", "Heavy"], [null, null], ["Random", "Random"]]) {
    const event = create([], { weather, condition })
    assert.deepEqual([event.weather, event.condition], ["Random", "Random"])
    const updated = updateLoHEvent({ ...event, weather: "Snowy", condition: "Soft" }, [event], { ...details, weather, condition }, timestamp, "random-edit")
    assert.deepEqual([updated.weather, updated.condition], ["Random", "Random"])
  }
  const { weather, condition, ...withoutConditions } = details
  assert.deepEqual([weather, condition], ["Sunny", "Firm"])
  const event = createLoHEvent([], withoutConditions, "random-default", timestamp)
  assert.deepEqual([event.weather, event.condition], ["Random", "Random"])
})

test("normalization changes only event weather and condition and is immutable and idempotent", () => {
  for (const [weather, condition] of [["Sunny", "Firm"], ["Rainy", "Heavy"], [null, null]]) {
    const event = { ...create(), weather, condition, leagueScore: 24680, leagueRank: "PLATINUM II", overallRank: 74, completed: true,
      racesPlayed: 10, firstPlaces: 4, top3Finishes: 8, participants: [{ umaId: "old-uma", races: 10, wins: 4, top3Finishes: 8, totalPoints: 1500 }], currentLineup: ["old-uma"] }
    const before = structuredClone(event)
    const normalized = normalizeLoH(event)
    assert.deepEqual(normalized, { ...before, weather: "Random", condition: "Random" })
    assert.deepEqual(event, before)
    assert.strictEqual(normalizeLoH(normalized), normalized)
  }
})

test("load/import normalization preserves real per-set conditions, scores and CM data", () => {
  const lineup = ["a", "b", "c"].map(id => ({ id, name: id, style: "Pace Chaser", ace: false, debuffer: false, autoRun: false }))
  let event = create([], { lineup })
  for (const [index, [weather, condition]] of [["Sunny", "Firm"], ["Rainy", "Heavy"]].entries()) {
    if (index > 0) event = finishLoHDay(event, index)
    event = saveLoHRaceSet(event, { id: `set-${index}`, createdAt: `2026-10-30T0${index + 1}:00:00.000Z`, day: index + 1,
      weather, condition, lineupSnapshot: getLoHLineupSnapshot(event),
      races: Array.from({ length: 5 }, (_, race) => ({ id: `set-${index}-race-${race}`, placements: event.currentLineup.map((umaId, slot) => ({ umaId, place: slot + 1 })) })),
    })
  }
  const oldEvent = { ...event, weather: "Sunny", condition: "Firm" }
  const cm = { number: 32, name: "Frozen CM", track: "Tokyo", surface: "Turf", distance: 2400, length: "Medium", direction: "Left", weather: "Rainy", season: "Spring", condition: "Heavy", league: "Graded League", phase: "attempts", finalPlace: "", participants: [], currentLineup: [], attempts: [], log: [] }
  const data = { ...profile([oldEvent]), cms: [cm] }, before = structuredClone(data)
  assert.equal(isImportedProfileFile(backup(data)), true)
  const migrated = migrateProfileData(data)
  assert.deepEqual(data, before)
  assert.deepEqual(migrated.lohs[0], event)
  assert.deepEqual(migrated.lohs[0].raceSets.map(set => [set.weather, set.condition]), [["Sunny", "Firm"], ["Rainy", "Heavy"]])
  assert.strictEqual(migrated.cms[0], cm)
  assert.strictEqual(migrateProfileData(migrated), migrated)
  assert.equal(isImportedProfileFile(JSON.parse(JSON.stringify(backup(migrated)))), true)
  for (const field of ["weather", "condition"]) {
    const invalidSet = { ...event.raceSets[0], [field]: "Random" }
    assert.throws(() => assertLoHRaceSet(invalidSet), /valid weather/)
    assert.equal(isLoHData({ ...event, raceSets: [invalidSet] }), false)
  }
  assert.equal(TRACK_WEATHER.includes("Random"), false)
  assert.equal(TRACK_CONDITIONS.includes("Random"), false)
})

test("per-event LoH notes survive profile backups and metadata edits without altering history or CM notes", () => {
  const first = { ...create(), notes: "Need better stamina team\nKeep the current lineup." }
  const second = { ...create([], { number: 2 }), id: "loh-second", notes: "Try different runner" }
  const cm = { number: 32, name: "Frozen CM", track: "Tokyo", surface: "Turf", distance: 2400, length: "Medium", direction: "Left", weather: "Sunny", season: "Spring", condition: "Firm", phase: "attempts", finalPlace: "", participants: [], currentLineup: [], attempts: [], log: [], notes: "CM-only note" }
  const original = { ...profile([first, second]), cms: [cm] }, before = structuredClone(original)
  const exported = JSON.parse(JSON.stringify(backup(original)))
  assert.equal(isImportedProfileFile(exported), true)
  const restored = migrateProfileData(exported.data)
  assert.deepEqual(restored.lohs, [first, second])
  assert.equal(restored.cms[0].notes, "CM-only note")
  const edited = updateLoHEvent(restored.lohs[0], restored.lohs, { ...details, name: "Edited LoH" }, timestamp, "note-edit")
  assert.equal(edited.notes, first.notes)
  for (const key of ["participants", "currentLineup", "leagueScore", "racesPlayed", "raceSets"]) assert.deepEqual(edited[key], first[key])
  assert.deepEqual(original, before)
})

test("notes remain optional in old LoH profiles and invalid note values cannot enter backups", () => {
  const event = create()
  assert.equal("notes" in event, false)
  assert.equal(isImportedProfileFile(backup(profile([event, legacy()]))), true)
  for (const notes of ["", "  ", "Saved note\nSecond line"]) {
    assert.equal(isLoHData({ ...event, notes }), true)
    assert.equal(normalizeLoH({ ...event, notes }).notes, notes)
  }
  for (const notes of [null, 123, {}, []]) {
    assert.equal(isImportedProfileFile(backup(profile([{ ...event, notes }]))), false)
  }
})
