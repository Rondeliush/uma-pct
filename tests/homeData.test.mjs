import assert from "node:assert/strict"
import test from "node:test"
import { importTS } from "./helpers/importTS.mjs"

const home = await importTS(new URL("../src/Home/homeData.ts", import.meta.url))
const { createLoHEvent } = await importTS(new URL("../src/LoH/lohData.ts", import.meta.url))
const progress = await importTS(new URL("../src/LoH/progress.ts", import.meta.url))
const { calculateUmaDetailStatistics, getUmaDetailInsights } = await importTS(new URL("../src/Statistics/umaDetailStatistics.ts", import.meta.url))
const { calculateUmaStatistics, sortUmaPerformance } = await importTS(new URL("../src/Statistics/umaStatistics.ts", import.meta.url))

const versions = ["a", "b", "c", "a-alternate"].map(id => ({ id, characterId: id.startsWith("a") ? "a" : id, displayName: id, versionName: "Original" }))
const characters = ["a", "b", "c"].map(id => ({ id, name: id }))
const config = (id, style = "pace_chaser") => ({ umaVersionId: id, runningStyle: style, ace: false, debuffer: false, entrySource: "manual", configurationSource: "recorded" })
const round = (day, wins = 3, races = 5) => ({ day, attempt: 1, racesPlayed: races, retired: false, umaWins: ["a", "b", "c"].map((id, index) => ({ cmUmaId: id, wins: index ? 0 : wins, configuration: config(id) })) })
const cm = (extra = {}) => ({ number: 1, name: "Test Cup", track: "Tokyo", surface: "Turf", distance: 2000, length: "Medium", direction: "Left", weather: "Sunny", season: "Spring", condition: "Firm", phase: "attempts", participants: ["a", "b", "c"].map(id => ({ cmUmaId: id, umaId: id, runningStyle: "pace_chaser", ace: false, debuffer: false, autoRun: false, finalParticipant: false, won: false })), currentLineup: ["a", "b", "c"], attempts: [], finalPlace: "", log: [], ...extra })
const log = (type, timestamp) => ({ id: type, type, timestamp, message: type })
const loh = (number = 1, date = "2026-11-01T00:00:00Z") => createLoHEvent([], { number, name: "Test League", racecourse: "Tokyo", surface: "Turf", distance: 2400, length: "Medium", direction: "Left", season: "Spring", lineup: ["a", "b", "c"].map(id => ({ id, name: id, style: "Pace Chaser", ace: id === "a", debuffer: false, autoRun: id === "b" })) }, `loh-${number}`, date)
const addSet = (event, id = "set") => progress.saveLoHRaceSet(event, { id, createdAt: "2026-11-01T01:00:00Z", day: progress.getLoHMainStage(event).activeDay, weather: "Rainy", condition: "Heavy", lineupSnapshot: progress.getLoHLineupSnapshot(event), races: Array.from({ length: 5 }, (_, index) => ({ id: `${id}-${index}`, placements: event.currentLineup.map((umaId, slot) => ({ umaId, place: slot + 1 })) })) })
const endMain = event => { for (let day = 1; day <= 6; day++) event = progress.finishLoHDay(event, day); return event }
const item = event => home.getHomeEvents([], [event])[0]

test("Home career tiles keep empty CM and LoH records separate without a synthetic win rate", () => {
  assert.deepEqual(home.getHomeCareerStatistics([], []), {
    cm: { events: 0, races: 0, wins: 0, winRate: null },
    loh: { events: 0, races: 0, rawPoints: 0 },
  })
  const empty = home.getHomeCareerStatistics([cm({ phase: "finalLineup" })], [loh()])
  assert.deepEqual(empty.cm, { events: 1, races: 0, wins: 0, winRate: null })
  assert.deepEqual(empty.loh, { events: 1, races: 0, rawPoints: 0 })
})

test("Home CM career totals count saved events, played rounds and finals once with weighted WR", () => {
  const events = [
    cm({ attempts: [round(1, 3, 5)], phase: "completed", finalPlace: "1st" }),
    cm({ number: 2, attempts: [{ ...round(1, 0, 2), retired: true }], phase: "completed", finalPlace: "2nd" }),
    cm({ number: 3 }),
  ]
  const before = structuredClone(events)
  assert.deepEqual(home.getHomeCareerStatistics(events, []).cm, { events: 3, races: 9, wins: 4, winRate: 4 / 9 * 100 })
  assert.deepEqual(home.getHomeCareerStatistics([cm({ attempts: [round(1, 0)] })], []).cm, { events: 1, races: 5, wins: 0, winRate: 0 })
  assert.deepEqual(events, before)
})

test("Home LoH career totals count Main Stage and the single recorded Extra Stage race without tripling the team", () => {
  let event = addSet(loh())
  const main = home.getHomeCareerStatistics([], [event])
  assert.deepEqual(main.loh, { events: 1, races: 5, rawPoints: 1000 })
  event = progress.registerLoHExtraStageLineup(progress.confirmLoHMainStageRank(endMain(event), 74), ["a", "b", "c"], "2026-11-01T02:00:00Z")
  assert.deepEqual(home.getHomeCareerStatistics([], [event]).loh, main.loh, "registration alone is not a race")
  event = progress.saveLoHExtraStageResult(event, { id: "extra-result", createdAt: "2026-11-01T03:00:00Z", weather: "Sunny", condition: "Firm", placements: ["a", "b", "c"].map((umaId, index) => ({ umaId, placement: ["first", "second", "third"][index] })) })
  const events = [event, addSet(loh(2), "second-event"), loh(3)]
  const before = structuredClone(events)
  const totals = home.getHomeCareerStatistics([], events)
  assert.deepEqual(totals.cm, { events: 0, races: 0, wins: 0, winRate: null })
  assert.deepEqual(totals.loh, { events: 3, races: 11, rawPoints: 2000 })
  assert.deepEqual(events, before)
})

test("Home LoH raw points ignore Bronze-capped awarded points, ranks and stale aggregate caches", () => {
  const initial = { ...loh(), legacyProgress: { leagueScore: 3980, racesPlayed: 0, firstPlaces: 0, top3Finishes: 0, participants: [] } }
  const event = addSet(initial)
  const set = progress.getLoHProgress(event).raceSets[0]
  assert.equal(set.rawScore, 1000)
  assert.equal(set.awardedScore, 20)
  const stale = { ...event, leagueScore: 987654, overallRank: 1, racesPlayed: 9999, participants: event.participants.map(uma => ({ ...uma, totalPoints: 999999 })) }
  const totals = home.getHomeCareerStatistics([cm({ attempts: [round(1, 1)] })], [stale])
  assert.deepEqual(totals.cm, { events: 1, races: 5, wins: 1, winRate: 20 })
  assert.deepEqual(totals.loh, { events: 1, races: 5, rawPoints: 1000 })
})

test("Home preserves legacy LoH race counts without inventing raw points from aggregate scores", () => {
  const event = { ...loh(), leagueScore: 5000, racesPlayed: 7, firstPlaces: 2, participants: [], raceSets: undefined }
  assert.deepEqual(home.getHomeCareerStatistics([], [event]).loh, { events: 1, races: 7, rawPoints: 0 })
})

test("only one current event is selected by saved activity, never by CM vs LoH numbers", () => {
  const cms = [cm({ number: 9999, log: [log("created", "2026-10-01T00:00:00Z")] })]
  const lohs = [loh(1)]
  assert.equal(home.getHomeOverview(cms, lohs).active.kind, "loh")
  cms[0].log.push(log("attemptAdded", "2026-11-02T00:00:00Z"))
  assert.equal(home.getHomeOverview(cms, lohs).active.kind, "cm")
  const state = home.getHomeOverview(cms, lohs)
  assert.equal(state.recent.length, 0)
  assert.deepEqual(state, home.getHomeOverview(cms, lohs))
})

test("results mix formats by completion date, preserving eliminated and no-final outcomes", () => {
  const cms = [cm({ number: 5, phase: "completed", attempts: [round(1), round(3)], finalPlace: "1st", log: [log("completed", "2026-10-30T00:00:00Z")] }), cm({ number: 2, phase: "eliminated", log: [log("eliminated", "2026-11-02T00:00:00Z")] })]
  const league = { ...loh(), completed: true, log: [log("completed", "2026-11-01T00:00:00Z")] }
  const snapshot = structuredClone({ cms, league })
  const overview = home.getHomeOverview(cms, [league])
  assert.equal(overview.active, null)
  assert.deepEqual(overview.recent.map(record => `${record.kind}${record.event.number}`), ["cm2", "loh1", "cm5"])
  assert.equal(home.getHomeEventResult(overview.lastCM), "Eliminated")
  assert.match(home.getHomeEventResult(overview.recent[2]), /Final A · 1st Place/)
  assert.deepEqual({ cms, league }, snapshot)
})

test("legacy completion dates remain unknown instead of using today or creation dates", () => {
  const league = { ...loh(), completed: true }
  const [record] = home.getHomeEvents([], [league])
  assert.equal(record.completedAt, null)
  const invalid = home.getHomeEvents([cm({ phase: "completed", log: [log("completed", "not-a-date")] })], [])[0]
  assert.equal(invalid.completedAt, null)
  assert.equal(home.getHomeEventResult(invalid), "Final result not recorded")
  assert.equal(home.getHomeOverview([], []).lastCompleted, null)
})

test("latest Uma slides retain authoritative ID order and handle zero, one and missing entries", () => {
  assert.deepEqual(home.getLatestHomeUmas(["c", "a-alternate", "missing", "b", "c"], versions).map(version => version.id), ["c", "a-alternate", "b"])
  assert.deepEqual(home.getLatestHomeUmas([], versions), [])
  assert.deepEqual(home.getLatestHomeUmas(["b"], versions).map(version => version.id), ["b"])
})

test("CM current status uses recorded qualification and keeps final snapshot separate", () => {
  const event = cm({ attempts: [round(1), round(3)] })
  let record = home.getHomeEvents([event], [])[0]
  assert.equal(home.getHomeEventStatus(record).title, "Round 2")
  assert.equal(home.getHomeEventStatus(record).detail, "Group A")
  assert.equal(home.getHomeEventStatus(record).winRate, 60)
  event.phase = "finalLineup"
  assert.equal(home.getHomeEventStatus(record).action, "Select Final Lineup")
  event.phase = "finalResult"
  event.finalResults = ["a-alternate", "b", "c"].map((id, index) => ({ cmUmaId: index ? id : "a", won: index === 0, configuration: config(id), placement: index === 0 ? "first" : null, placementSource: "recorded" }))
  record = home.getHomeEvents([event], [])[0]
  assert.deepEqual(home.getHomeEventLineup(record), ["a-alternate", "b", "c"])
  assert.equal(home.getHomeEventFeaturedUma(record), "a-alternate")
  assert.deepEqual(event.currentLineup, ["a", "b", "c"])
})

test("LoH current status/continue follows canonical active day, Bronze phase and ticket carryover", () => {
  let event = loh()
  assert.equal(home.getHomeEventStatus(item(event)).ticketText, "Free")
  for (let i = 1; i <= 5; i++) event = addSet(event, `set-${i}`)
  event = progress.finishLoHDay(event, 1)
  const status = home.getHomeEventStatus(item(event))
  assert.equal(status.day, 2)
  assert.equal(status.action, "Continue Day 2")
  assert.equal(status.ticketText, `${progress.getLoHMainStage(event).days[1].ticketsRemaining} / 10`)
})

test("LoH awaiting-rank, lineup-required, registered and recorded results consume the real phase", () => {
  const awaiting = endMain(addSet(loh()))
  assert.equal(home.getHomeEventStatus(item(awaiting)).title, "Confirm Overall Rank")
  const qualified = progress.confirmLoHMainStageRank(awaiting, 74)
  assert.equal(home.getHomeEventStatus(item(qualified)).tab, "umas")
  assert.equal(home.getHomeEventStatus(item(qualified)).action, "Set Lineup")
  const registered = progress.registerLoHExtraStageLineup(qualified, ["a", "b", "c"])
  assert.equal(home.getHomeEventStatus(item(registered)).title, "Extra Stage result pending")
  const saved = progress.saveLoHExtraStageResult(registered, { id: "extra", createdAt: "2026-11-01T02:00:00Z", weather: "Sunny", condition: "Firm", placements: ["a", "b", "c"].map((umaId, i) => ({ umaId, placement: ["second", "first", "third"][i] })) })
  assert.equal(home.getHomeEventStatus(item(saved)).title, "Ready to complete LoH")
  assert.equal(home.getHomeEventFeaturedUma(item(saved)), "b")
  assert.match(home.getHomeEventResult(item(saved)), /Overall Rank #74 · Extra Stage Winner/)
})

test("favorite CM totals reuse Statistics, include final and keep versions distinct", () => {
  const event = cm({ phase: "completed", attempts: [round(1), round(3)], finalPlace: "1st", finalResults: ["a", "b", "c"].map((id, i) => ({ cmUmaId: id, won: i === 0, placement: i === 0 ? "first" : null, placementSource: "recorded", configuration: config(id) })) })
  const favorite = home.getHomeFavoriteStatistics([event], [], "a")
  const canonical = calculateUmaDetailStatistics([event], "a")
  assert.deepEqual(favorite.cm, canonical)
  assert.deepEqual(favorite.cmHighlights, getUmaDetailInsights(canonical).highlights)
  assert.equal(favorite.cm.races, 11)
  assert.equal(favorite.cm.wins, 7)
  assert.equal(home.getHomeFavoriteStatistics([event], [], "a-alternate").cm.races, 0)
})

test("favorite LoH uses raw individual points across events, weighted wins and a real Extra Stage race", () => {
  let event = { ...loh(), leagueScore: 3990 }
  for (let i = 1; i <= 5; i++) event = addSet(event, `set-${i}`)
  assert.equal(event.leagueScore, 8000, "the first set is Bronze-capped to 10 awarded points; later sets use tickets")
  const qualified = progress.confirmLoHMainStageRank(endMain(event), 74)
  const registered = progress.registerLoHExtraStageLineup(qualified, ["a", "b", "c"])
  const saved = progress.saveLoHExtraStageResult(registered, { id: "extra", createdAt: "2026-11-01T02:00:00Z", weather: "Sunny", condition: "Firm", placements: ["a", "b", "c"].map((umaId, i) => ({ umaId, placement: ["second", "first", "third"][i] })) })
  const snapshot = structuredClone(saved)
  const stats = home.getHomeFavoriteStatistics([], [saved, addSet(loh(2))], "a").loh
  assert.equal(stats.events, 2)
  assert.equal(stats.races, 31)
  assert.equal(stats.wins, 30)
  assert.equal(stats.winRate, 30 / 31 * 100)
  assert.equal(stats.rawPoints, 3000)
  assert.equal(stats.extraStages, 1)
  assert.equal(stats.extraStageWins, 0)
  assert.deepEqual(saved, snapshot)
})

test("unknown legacy raw points stay unknown and no-race favorites are a useful empty state", () => {
  const legacy = { ...loh(), raceSets: undefined, leagueScore: 100, racesPlayed: 5, firstPlaces: 1, participants: loh().participants.map(uma => ({ ...uma, races: 5, wins: 1, top3Finishes: 1 })) }
  assert.equal(home.getHomeFavoriteStatistics([], [legacy], "a").loh.rawPoints, null)
  const stats = home.getHomeFavoriteStatistics([], [loh()], "a").loh
  assert.equal(stats.races, 0)
  assert.equal(stats.winRate, null)
  assert.equal(stats.rawPoints, 0)
})

test("career highlights use existing CM totals, minimum sample and the most-used Uma ranking", () => {
  const cms = [cm({ number: 1, attempts: [round(1, 5, 5)], distance: 1200 }), cm({ number: 2, attempts: [round(1, 7, 10)], distance: 2000, surface: "Dirt" })]
  const stats = calculateUmaStatistics(cms, characters, versions)
  const before = structuredClone(cms)
  const highlights = home.getHomeCareerHighlights(cms, characters, versions)
  assert.equal(highlights.bestDistance.distance, 2000, "five perfect races are not an eligible best distance")
  assert.equal(highlights.bestDistance.winRate, 70)
  assert.equal(highlights.bestSurface.surface, "Dirt")
  assert.deepEqual(highlights.mostUsed, sortUmaPerformance(stats.umas, "races")[0])
  assert.equal(home.getHomeCareerHighlights([], characters, versions).bestDistance, null)
  assert.deepEqual(cms, before)
})

test("Featured Uma requires the Statistics sample and reuses recorded CM rounds and finals", () => {
  const event = cm({ phase: "completed", attempts: [round(1, 3, 5), { ...round(3, 0, 4), retired: true }], finalPlace: "1st", finalResults: [{ cmUmaId: "a", placement: "first", placementSource: "recorded", won: true, configuration: config("a") }] })
  const before = structuredClone(event)
  const performance = calculateUmaStatistics([event], characters, versions).umas
  const pool = home.getHomeFeaturedUmas(performance, versions)
  assert.deepEqual(pool.map(item => item.uma.id), ["a"], "nine races plus a recorded final meet the existing ten-race minimum")
  assert.equal(pool[0].stats.races, 10)
  assert.equal(pool[0].stats.wins, 4)
  assert.equal(pool[0].stats.winRate, 40)
  assert.deepEqual(event, before)
  assert.deepEqual(home.getHomeFeaturedUmas([], versions), [])
})

test("Featured Uma keeps zero-win, archived and alternate-version records eligible without inventing identities", () => {
  const performance = [
    { versionId: "a", races: 9, wins: 9, winRate: 100 },
    { versionId: "a-alternate", races: 10, wins: 0, winRate: 0 },
    { versionId: "b", races: 20, wins: 10, winRate: 50 },
    { versionId: "c", races: 0, wins: 0, winRate: null },
    { versionId: "unresolved", races: 200, wins: 100, winRate: 50 },
  ]
  const catalogue = versions.map(version => ({ ...version, archived: version.id === "b" }))
  const before = structuredClone({ performance, catalogue })
  const pool = home.getHomeFeaturedUmas(performance, catalogue)
  assert.deepEqual(pool.map(item => item.uma.id), ["a-alternate", "b"])
  assert.equal(pool[0].stats.winRate, 0, "a real zero percent record is valid data")
  assert.equal(pool[1].uma.archived, true)
  assert.deepEqual({ performance, catalogue }, before)
})

test("Featured Uma shows the same exact-version LoH raw totals as Favorite Uma while retaining CM stats", () => {
  const performance = versions.map(uma => ({ versionId: uma.id, races: 20, wins: 7, winRate: 35 }))
  const events = [addSet(loh()), addSet(loh(2), "second")]
  const before = structuredClone({ performance, events })
  const pool = home.getHomeFeaturedUmas(performance, versions, events)
  assert.deepEqual(pool.map(item => [item.uma.id, item.lohRawPoints]), [["a", 1000], ["b", 600], ["c", 400], ["a-alternate", 0]])
  for (const item of pool) {
    assert.equal(item.lohRawPoints, home.getHomeFavoriteStatistics([], events, item.uma.id).loh.rawPoints)
    assert.equal(item.stats, performance.find(stats => stats.versionId === item.uma.id))
    assert.equal(item.stats.races, 20)
    assert.equal(item.stats.winRate, 35)
  }
  assert.deepEqual({ performance, events }, before)
})

test("Featured Uma keeps unknown legacy raw points unavailable and uses zero when no LoH races exist", () => {
  const performance = [{ versionId: "a", races: 10, wins: 3, winRate: 30 }]
  assert.equal(home.getHomeFeaturedUmas(performance, versions)[0].lohRawPoints, 0)
  const event = { ...loh(), raceSets: undefined, racesPlayed: 5, leagueScore: 4000, participants: [{ umaId: "a", races: 5, wins: 1, top3Finishes: 3 }] }
  assert.equal(home.getHomeFeaturedUmas(performance, versions, [event])[0].lohRawPoints, null)
})
