import assert from "node:assert/strict"
import test from "node:test"
import { importTS } from "./helpers/importTS.mjs"

const { migrateProfileData, PROFILE_DATA_VERSION } = await importTS(new URL("../src/profiles/profileDataMigration.ts", import.meta.url))
const { normalizeRunningStyle, snapshotAttemptResults, snapshotFinalResults, changeCMTeamResult, changeCMUmaPlacement, getResultConfiguration, getCMVersionIds } =
  await importTS(new URL("../src/CMs/cmParticipantConfiguration.ts", import.meta.url))
const { calculateUmaStatistics } = await importTS(new URL("../src/Statistics/umaStatistics.ts", import.meta.url))
const { calculateUmaDetailStatistics } = await importTS(new URL("../src/Statistics/umaDetailStatistics.ts", import.meta.url))
const { calculateUmaRunningStyleStatistics } = await importTS(new URL("../src/Statistics/umaRunningStyleStatistics.ts", import.meta.url))
const { isImportedProfileFile } = await importTS(new URL("../src/profiles/profileTransfer.ts", import.meta.url))

const versionId = "oguri-christmas"
const versions = [{ id: versionId, characterId: "oguri", displayName: "Oguri Cap (Christmas)", versionName: "Christmas", archived: false }]
const participant = (fields = {}) => ({ cmUmaId: "oguri", umaId: versionId, runningStyle: "pace_chaser", ace: true, debuffer: false,
  autoRun: false, won: false, finalParticipant: false, ...fields })
const event = (fields = {}) => ({ number: 20, name: "Test Cup", track: "Tokyo", surface: "Turf", distance: 2000, length: "Medium",
  direction: "Left", weather: "Sunny", season: "Spring", condition: "Firm", phase: "attempts", participants: [participant()],
  currentLineup: ["oguri"], attempts: [], finalPlace: "", log: [], ...fields })
const profile = (cms) => ({ cms, lohs: [], customUmaDatabase: { customCharacters: [], customVersions: [], archivedVersionIds: [] },
  favoriteUmaId: versionId, cmViewMode: "detailed", seenOfficialVersionIds: [], umaComparisonSlots: [null, versionId, null] })
const file = (data) => ({ format: "uma-tracker-profile", version: 1, profile: { sourceProfileId: "stable-identity", name: "Test" }, data })
const batch = (attempt, racesPlayed, wins) => ({ day: 1, attempt, racesPlayed, retired: false, umaWins: [{ cmUmaId: "oguri", wins }] })
const record = (cm, attempt, races, wins) => ({ ...cm, attempts: [...cm.attempts, snapshotAttemptResults(cm, batch(attempt, races, wins))] })
const styleTotals = (cm) => calculateUmaRunningStyleStatistics([cm], versionId).rows.filter((row) => row.races > 0)
  .map(({ style, races, wins }) => ({ style, races, wins }))

test("Global IDs and every saved legacy label map consistently, without conflating roles or AutoRun", () => {
  const groups = {
    runaway: ["Runaway", "runaway"], front_runner: ["Front Runner", "Front", "front", "front_runner", " FRONT-RUNNER "],
    pace_chaser: ["Pace Chaser", "Leader", "leader", "pace_chaser"],
    late_surger: ["Late Surger", "Betweener", "betweener", "late_surger"],
    end_closer: ["End Closer", "Chaser", "chaser", "end_closer"],
  }
  for (const [style, labels] of Object.entries(groups)) for (const label of labels) assert.equal(normalizeRunningStyle(label), style)
  for (const invalid of ["Ace", "Debuffer", "AutoRun", "", null, undefined, "unknown", "constructor", "__proto__"]) {
    assert.equal(normalizeRunningStyle(invalid), null)
  }
})

test("one CM can record Pace Chaser, End Closer, Pace Chaser for the same exact version", () => {
  let cm = record(event(), 1, 20, 10)
  cm = { ...cm, participants: [participant({ runningStyle: "end_closer" })] }
  cm = record(cm, 2, 20, 12)
  cm = { ...cm, participants: [participant({ runningStyle: "pace_chaser" })] }
  cm = record(cm, 3, 20, 11)
  assert.deepEqual(styleTotals(cm), [{ style: "pace_chaser", races: 40, wins: 21 }, { style: "end_closer", races: 20, wins: 12 }])
  const saved = JSON.stringify(cm.attempts)
  cm = { ...cm, participants: [participant({ runningStyle: "runaway", ace: false, debuffer: true, autoRun: true })] }
  const reloaded = migrateProfileData(JSON.parse(JSON.stringify(profile([cm])))).cms[0]
  assert.equal(JSON.stringify(reloaded.attempts), saved)
  assert.deepEqual(styleTotals(reloaded), styleTotals(cm))
  assert.ok(reloaded.attempts.every((attempt) => attempt.umaWins[0].configuration.ace &&
    !attempt.umaWins[0].configuration.debuffer && attempt.umaWins[0].configuration.entrySource === "manual" &&
    attempt.umaWins[0].configuration.configurationSource === "recorded"))
  assert.equal(calculateUmaDetailStatistics([reloaded], versionId).wins, 33)
})

test("subsequent role/source changes affect future results and preserve simultaneous Ace and Debuffer", () => {
  let cm = record(event(), 1, 5, 3)
  cm = { ...cm, participants: [participant({ runningStyle: "end_closer", ace: false, debuffer: true, autoRun: true })] }
  cm = record(cm, 2, 5, 2)
  cm = { ...cm, participants: [participant({ ace: true, debuffer: true })] }
  cm = record(cm, 3, 5, 1)
  const configs = cm.attempts.map((attempt) => attempt.umaWins[0].configuration)
  assert.deepEqual(configs.map(({ runningStyle, ace, debuffer, entrySource }) => [runningStyle, ace, debuffer, entrySource]),
    [["pace_chaser", true, false, "manual"], ["end_closer", false, true, "autorun"], ["pace_chaser", true, true, "manual"]])
})

test("correcting counts on an existing batch retains its original configuration", () => {
  const cm = record(event(), 1, 5, 3)
  const editedCurrent = { ...cm, participants: [participant({ runningStyle: "end_closer", umaId: "other-version", ace: false })] }
  const correction = snapshotAttemptResults(editedCurrent, batch(1, 4, 2))
  assert.equal(correction.racesPlayed, 4)
  assert.equal(correction.umaWins[0].wins, 2)
  assert.strictEqual(correction.umaWins[0].configuration, cm.attempts[0].umaWins[0].configuration)
})

test("legacy Leader preserves exact races, wins, finals and every version/event total", () => {
  const legacy = participant({ style: "Leader", won: true, finalParticipant: true })
  delete legacy.runningStyle
  const cm = event({ participants: [legacy], attempts: [batch(1, 80, 55)], finalPlace: "1st", phase: "completed" })
  const original = profile([cm])
  const before = structuredClone(original)
  const totalsBefore = calculateUmaStatistics(original.cms, [], versions)
  const detailsBefore = calculateUmaDetailStatistics(original.cms, versionId)
  const migrated = migrateProfileData(original)
  assert.deepEqual(original, before)
  assert.equal(migrated.dataVersion, PROFILE_DATA_VERSION)
  assert.equal(migrated.cms[0].participants[0].runningStyle, "pace_chaser")
  assert.equal(Object.hasOwn(migrated.cms[0].participants[0], "style"), false)
  assert.deepEqual(calculateUmaStatistics(migrated.cms, [], versions), totalsBefore)
  assert.deepEqual(calculateUmaDetailStatistics(migrated.cms, versionId), detailsBefore)
  assert.deepEqual(styleTotals(migrated.cms[0]), [{ style: "pace_chaser", races: 80, wins: 55 }])
  assert.equal(migrated.cms[0].attempts[0].umaWins[0].configuration.configurationSource, "legacy_inferred")
  assert.equal(migrated.cms[0].finalResults[0].configuration.configurationSource, "legacy_inferred")
  assert.equal(migrated.cms[0].finalResults[0].won, true)
  assert.deepEqual(migrated.umaComparisonSlots, original.umaComparisonSlots)
})

test("migration keeps all saved styles, zero-win batches, retired batches and unused lineup entries", () => {
  const cms = ["Front", "Leader", "Betweener", "Chaser", "Runaway"].map((style, index) => {
    const legacy = participant({ style, ace: index % 2 === 0, debuffer: index % 2 === 1, autoRun: index % 2 === 0 })
    delete legacy.runningStyle
    return event({ number: index, participants: [legacy, { ...legacy, cmUmaId: "unused", umaId: "unused" }],
      attempts: [batch(1, 5, index), { ...batch(2, 3, 0), retired: true }, { ...batch(3, 0, 0), retired: true }] })
  })
  const before = calculateUmaStatistics(cms, [], versions)
  const migrated = migrateProfileData(profile(cms))
  assert.deepEqual(calculateUmaStatistics(migrated.cms, [], versions), before)
  for (const cm of migrated.cms) {
    assert.equal(cm.attempts.length, 3)
    assert.ok(cm.attempts.every((attempt) => attempt.umaWins.length === 1))
    assert.deepEqual(cm.attempts.map((attempt) => [attempt.racesPlayed, attempt.umaWins[0].wins]),
      cms[cm.number].attempts.map((attempt) => [attempt.racesPlayed, attempt.umaWins[0].wins]))
  }
})

test("migration is idempotent across reloads and never re-infers snapshots from edited participants", () => {
  const cm = event({ attempts: [batch(1, 20, 10)] })
  const migrated = migrateProfileData(profile([cm]))
  assert.strictEqual(migrateProfileData(migrated), migrated)
  migrated.cms[0].participants[0] = participant({ runningStyle: "end_closer", ace: false })
  const reloaded = JSON.parse(JSON.stringify(migrated))
  assert.strictEqual(migrateProfileData(reloaded), reloaded)
  assert.equal(reloaded.cms[0].attempts[0].umaWins[0].configuration.runningStyle, "pace_chaser")
  assert.equal(reloaded.cms[0].attempts[0].umaWins[0].configuration.ace, true)
})

test("missing AutoRun affects only entry source, preserving known style and roles", () => {
  const legacy = participant({ style: "Leader", debuffer: true })
  delete legacy.runningStyle
  delete legacy.autoRun
  const migrated = migrateProfileData(profile([event({ participants: [legacy], attempts: [batch(1, 5, 2)] })]))
  const configuration = migrated.cms[0].attempts[0].umaWins[0].configuration
  assert.equal(configuration.entrySource, null)
  assert.equal(configuration.runningStyle, "pace_chaser")
  assert.equal(configuration.ace, true)
  assert.equal(configuration.debuffer, true)
  assert.ok(isImportedProfileFile(file(migrated)))
})

test("unresolvable legacy metadata remains unknown without losing or duplicating stored counts", () => {
  const cm = event({ participants: [participant({ runningStyle: null })], attempts: [batch(1, 5, 2),
    { ...batch(2, 5, 1), umaWins: [{ cmUmaId: "missing-participant", wins: 1 }] }] })
  const migrated = migrateProfileData(profile([cm])).cms[0]
  const orphan = migrated.attempts[1].umaWins[0].configuration
  assert.deepEqual(orphan, { umaVersionId: null, runningStyle: null, ace: null, debuffer: null, entrySource: null, configurationSource: "legacy_inferred" })
  assert.equal(migrated.attempts[1].umaWins[0].wins, 1)
  assert.equal(migrated.attempts[1].racesPlayed, 5)
  assert.equal(calculateUmaRunningStyleStatistics([migrated], versionId).unknownStyleRaces, 5)
})

test("absent legacy role flags do not discard a known style or invent a normal role", () => {
  const legacy = participant({ style: "Leader" })
  delete legacy.runningStyle
  delete legacy.ace
  delete legacy.debuffer
  const original = file(profile([event({ participants: [legacy], attempts: [batch(1, 5, 2)] })]))
  assert.ok(isImportedProfileFile(original))
  const migrated = migrateProfileData(original.data)
  const configuration = migrated.cms[0].attempts[0].umaWins[0].configuration
  assert.equal(configuration.runningStyle, "pace_chaser")
  assert.equal(configuration.ace, null)
  assert.equal(configuration.debuffer, null)
  assert.equal(configuration.entrySource, "manual")
  assert.ok(isImportedProfileFile(file(migrated)))
})

test("rounds and finals use snapshot version IDs after current version/role edits or participant removal", () => {
  let cm = record(event(), 1, 5, 3)
  cm = changeCMUmaPlacement(changeCMTeamResult({ ...cm, participants: [participant({ finalParticipant: true })] }, "1st"), "oguri", "first")
  const before = calculateUmaStatistics([cm], [], versions)
  const detailsBefore = calculateUmaDetailStatistics([cm], versionId)
  cm = { ...cm, participants: [participant({ umaId: "other-version", runningStyle: "end_closer", ace: false })] }
  assert.deepEqual(calculateUmaStatistics([cm], [], versions), before)
  assert.deepEqual(calculateUmaDetailStatistics([cm], versionId), detailsBefore)
  assert.ok(getCMVersionIds(cm).includes(versionId))
  cm = { ...cm, participants: [] }
  assert.deepEqual(calculateUmaStatistics([cm], [], versions), before)
  assert.deepEqual(calculateUmaDetailStatistics([cm], versionId), detailsBefore)
  assert.equal(cm.finalResults[0].configuration.ace, true)
})

test("final winner corrections preserve configurations, pending lineups do not create final records", () => {
  const pending = snapshotFinalResults(event({ participants: [participant({ finalParticipant: true })] }))
  assert.equal(pending.finalResults, undefined)
  assert.equal(calculateUmaDetailStatistics([pending], versionId).finalAppearances, 0)
  const saved = snapshotFinalResults({ ...pending, finalPlace: "2nd" })
  const correction = changeCMUmaPlacement(changeCMTeamResult({ ...saved, participants: [participant({ runningStyle: "end_closer", finalParticipant: true })] }, "1st"), "oguri", "first")
  assert.equal(correction.finalResults[0].won, true)
  assert.strictEqual(correction.finalResults[0].configuration, saved.finalResults[0].configuration)
  assert.equal(snapshotFinalResults({ ...correction, finalPlace: "" }).finalResults, undefined)
})

test("old exports remain valid and new exports round-trip all snapshots and provenance", () => {
  const legacy = participant({ style: "Leader" })
  delete legacy.runningStyle
  const oldFile = file(profile([event({ participants: [legacy], attempts: [batch(1, 80, 55)] })]))
  assert.ok(isImportedProfileFile(oldFile))
  const data = migrateProfileData(oldFile.data)
  data.cms[0] = { ...data.cms[0], participants: [participant({ runningStyle: "end_closer" })] }
  data.cms[0] = record(data.cms[0], 2, 20, 12)
  const exported = JSON.parse(JSON.stringify(file(data)))
  assert.ok(isImportedProfileFile(exported))
  assert.deepEqual(exported.data, data)
  assert.strictEqual(migrateProfileData(exported.data), exported.data)
  assert.equal(exported.profile.sourceProfileId, "stable-identity")
  assert.deepEqual(exported.data.cms[0].attempts.map((attempt) => attempt.umaWins[0].configuration.configurationSource), ["legacy_inferred", "recorded"])
})

test("import validation rejects malformed snapshot fields and unsupported future data versions", () => {
  const saved = file(migrateProfileData(profile([record(event(), 1, 5, 3)])))
  for (const [key, value] of [["runningStyle", "Leader"], ["configurationSource", "made-up"], ["entrySource", "Ace"],
    ["ace", "yes"], ["debuffer", "no"], ["umaVersionId", 4]]) {
    const invalid = structuredClone(saved)
    invalid.data.cms[0].attempts[0].umaWins[0].configuration[key] = value
    assert.equal(isImportedProfileFile(invalid), false, key)
  }
  const missing = structuredClone(saved)
  delete missing.data.cms[0].attempts[0].umaWins[0].configuration
  assert.equal(isImportedProfileFile(missing), false)
  assert.equal(isImportedProfileFile(file({ ...saved.data, dataVersion: PROFILE_DATA_VERSION + 1 })), false)
  assert.throws(() => migrateProfileData({ ...saved.data, dataVersion: PROFILE_DATA_VERSION + 1 }), /unsupported data version/)
})

test("explicit unknown values in an existing snapshot never fall back to current participant settings", () => {
  const cm = record(event(), 1, 5, 3)
  const result = cm.attempts[0].umaWins[0]
  result.configuration = { ...result.configuration, runningStyle: null, entrySource: null }
  assert.equal(getResultConfiguration(cm, result).runningStyle, null)
  assert.equal(calculateUmaRunningStyleStatistics([cm], versionId).unknownStyleRaces, 5)
  assert.strictEqual(migrateProfileData(migrateProfileData(profile([cm]))).cms[0].attempts[0].umaWins[0].configuration, result.configuration)
})

test("mixed legacy and recorded batches migrate only missing snapshots, even with a current version marker", () => {
  let cm = record(event(), 1, 5, 3)
  const recorded = cm.attempts[0].umaWins[0]
  cm = { ...cm, participants: [participant({ runningStyle: "end_closer", debuffer: true })],
    attempts: [...cm.attempts, batch(2, 5, 2)] }
  const migrated = migrateProfileData({ ...profile([cm]), dataVersion: PROFILE_DATA_VERSION })
  assert.strictEqual(migrated.cms[0].attempts[0].umaWins[0], recorded)
  assert.equal(migrated.cms[0].attempts[1].umaWins[0].configuration.runningStyle, "end_closer")
  assert.equal(migrated.cms[0].attempts[1].umaWins[0].configuration.configurationSource, "legacy_inferred")
  assert.equal(migrated.cms[0].attempts.length, 2)
  assert.strictEqual(migrateProfileData(migrated), migrated)
})

test("every version and CM retains totals with alternate IDs, duplicate version references and finals", () => {
  const ids = [versionId, "oguri-original", "teio-original"]
  const cms = ["1st", "2nd", "3rd", ""].map((finalPlace, index) => {
    const participants = ids.map((umaId, i) => {
      const saved = participant({ cmUmaId: "p" + i, umaId, style: ["Leader", "Chaser", "Front"][i],
        ace: i === 0, debuffer: i === 1, finalParticipant: true, won: i === index })
      delete saved.runningStyle
      return saved
    })
    participants.push({ ...participants[0], cmUmaId: "duplicate", won: false })
    return event({ number: index, participants, finalPlace, attempts: [
      { ...batch(1, 5, 0), umaWins: [{ cmUmaId: "p0", wins: 1 }, { cmUmaId: "duplicate", wins: 1 }, { cmUmaId: "p1", wins: 2 }, { cmUmaId: "p2", wins: 0 }] },
      { ...batch(2, 3, 0), retired: true, umaWins: [{ cmUmaId: "p1", wins: 1 }, { cmUmaId: "p2", wins: 0 }] },
    ] })
  })
  const migrated = migrateProfileData(profile(cms)).cms
  assert.deepEqual(calculateUmaStatistics(migrated, [], versions), calculateUmaStatistics(cms, [], versions))
  for (const id of ids) {
    assert.deepEqual(calculateUmaDetailStatistics(migrated, id), calculateUmaDetailStatistics(cms, id))
    for (let index = 0; index < cms.length; index++) {
      assert.deepEqual(calculateUmaStatistics([migrated[index]], [], versions), calculateUmaStatistics([cms[index]], [], versions))
      assert.deepEqual(calculateUmaDetailStatistics([migrated[index]], id), calculateUmaDetailStatistics([cms[index]], id))
    }
  }
})
