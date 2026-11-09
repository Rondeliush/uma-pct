import assert from "node:assert/strict"
import test from "node:test"
import { importTS } from "./helpers/importTS.mjs"

const { getHomeTickerFacts } = await importTS(new URL("../src/Home/homeTickerData.ts", import.meta.url))
const { calculateUmaStatistics, sortUmaPerformance, MIN_RACES_FOR_WIN_RATE } = await importTS(new URL("../src/Statistics/umaStatistics.ts", import.meta.url))
const { getHomeCareerHighlights } = await importTS(new URL("../src/Home/homeData.ts", import.meta.url))
const { createLoHEvent } = await importTS(new URL("../src/LoH/lohData.ts", import.meta.url))
const progress = await importTS(new URL("../src/LoH/progress.ts", import.meta.url))

const characters = ["a", "b", "c"].map(id => ({ id, name: id }))
const versions = ["a", "b", "c", "a-alternate"].map((id, index) => ({ id, characterId: id.startsWith("a") ? "a" : id, displayName: ["Alpha", "Bravo", "Charlie", "Alpha (Alternate)"][index], versionName: "Original", archived: false }))
const configuration = id => ({ umaVersionId: id, runningStyle: "pace_chaser", ace: false, debuffer: false, entrySource: "manual", configurationSource: "recorded" })
const cm = (number, races, wins, ids = ["a", "b", "c"]) => ({ number, name: "Cup", track: "Tokyo", surface: "Turf", distance: 2000, length: "Medium", direction: "Left", weather: "Sunny", season: "Spring", condition: "Firm", phase: "attempts", finalPlace: "", log: [], currentLineup: ids, participants: ids.map(id => ({ cmUmaId: id, umaId: id, runningStyle: "pace_chaser", ace: false, debuffer: false, autoRun: false, finalParticipant: false, won: false })), attempts: races ? [{ day: 1, attempt: 1, racesPlayed: races, retired: false, umaWins: ids.map((id, index) => ({ cmUmaId: id, wins: index ? 0 : wins, configuration: configuration(id) })) }] : [] })
const loh = number => createLoHEvent([], { number, name: "League", racecourse: "Tokyo", surface: "Turf", distance: 2400, length: "Medium", direction: "Left", season: "Spring", lineup: ["a", "b", "c"].map(id => ({ id, name: id, style: "Pace Chaser", ace: false, debuffer: false, autoRun: false })) }, `loh-${number}`, "2026-11-01T00:00:00Z")
const addSet = (event, places = [1, 2, 3]) => progress.saveLoHRaceSet(event, { id: `set-${event.id}`, createdAt: "2026-11-01T01:00:00Z", day: 1, lineupSnapshot: progress.getLoHLineupSnapshot(event), weather: "Sunny", condition: "Firm", races: Array.from({ length: 5 }, (_, index) => ({ id: `race-${index}`, placements: ["a", "b", "c"].map((umaId, slot) => ({ umaId, place: places[slot] })) })) })
const facts = (cms = [], lohs = [], catalogue = versions) => getHomeTickerFacts(cms, lohs, characters, catalogue)
const find = (items, id) => items.find(item => item.id === id)

test("ticker omits empty rankings and never invents zero-valued facts", () => {
  assert.deepEqual(facts(), [])
  assert.deepEqual(facts([cm(1, 0, 0)], [loh(1)]), [])
  const oneRace = cm(1, 1, 0, ["a"])
  oneRace.attempts[0].umaWins[0].configuration.runningStyle = null
  assert.deepEqual(facts([oneRace]).map(item => item.id), ["cm-most-races"])
  assert.deepEqual(facts([oneRace])[0].entries, [{ id: "a", name: "Alpha", value: "1" }])
})

test("ticker rankings reuse exact-version Statistics ordering and retain alternate configurations without mutation", () => {
  const first = cm(1, 12, 7), second = cm(2, 3, 3), alternate = cm(3, 5, 4, ["a-alternate", "b", "c"])
  second.attempts[0].umaWins[0].configuration = { ...configuration("a"), runningStyle: "runaway", ace: true }
  const cms = [first, second, alternate], before = structuredClone(cms)
  const statistics = calculateUmaStatistics(cms, characters, versions)
  const ticker = getHomeTickerFacts(cms, [], characters, versions, statistics)
  assert.deepEqual(find(ticker, "cm-most-wins").entries.map(row => row.id), sortUmaPerformance(statistics.umas.filter(uma => uma.wins > 0), "wins").slice(0, 3).map(uma => uma.versionId))
  assert.deepEqual(find(ticker, "cm-most-races").entries.map(row => row.id), sortUmaPerformance(statistics.umas, "races").slice(0, 3).map(uma => uma.versionId))
  assert.deepEqual(find(ticker, "cm-most-wins").entries.map(row => row.value), ["10", "4"])
  assert.equal(find(ticker, "cm-most-wins").entries[1].name, "Alpha (Alternate)")
  assert.deepEqual(ticker, facts([...cms].reverse()))
  assert.deepEqual(cms, before)
})

test("Highest WR uses the existing minimum sample and cannot promote a one-race winner", () => {
  const cms = [cm(1, MIN_RACES_FOR_WIN_RATE, 8), cm(2, 1, 1, ["a-alternate", "b", "c"])]
  const highest = find(facts(cms), "cm-highest-win-rate")
  assert.match(highest.label, new RegExp(`min\\. ${MIN_RACES_FOR_WIN_RATE} races`))
  assert.equal(highest.entries[0].id, "a")
  assert.equal(highest.entries[0].value, "80.0%")
  assert.equal(highest.entries.some(row => row.id === "a-alternate"), false)
  assert.equal(find(facts([cm(1, MIN_RACES_FOR_WIN_RATE - 1, 8)]), "cm-highest-win-rate"), undefined)
  const statistics = calculateUmaStatistics(cms, characters, versions)
  statistics.umas.find(uma => uma.versionId === "a").winRate = NaN
  const invalid = getHomeTickerFacts(cms, [], characters, versions, statistics)
  assert.equal(JSON.stringify(invalid).includes("NaN"), false)
  assert.equal(find(invalid, "cm-highest-win-rate").entries.some(row => row.id === "a"), false)
})

test("CM final wins, distances, surfaces and running styles reuse recorded Statistics scopes", () => {
  const event = cm(1, 10, 8)
  event.phase = "completed"
  event.finalPlace = "1st"
  event.finalResults = ["a", "b", "c"].map((id, index) => ({ cmUmaId: id, won: index === 0, placement: ["first", "second", "third"][index], placementSource: "recorded", configuration: configuration(id) }))
  const ticker = facts([event]), highlights = getHomeCareerHighlights([event], characters, versions)
  assert.deepEqual(find(ticker, "cm-final-wins").entries, [{ id: "a", name: "Alpha", value: "1" }])
  assert.equal(find(ticker, "cm-best-distance").entries[0].name, `${highlights.bestDistance.distance.toLocaleString("en-US")} m`)
  assert.equal(find(ticker, "cm-best-distance").entries[0].value, "80.0% WR")
  assert.equal(find(ticker, "cm-best-surface").entries[0].name, highlights.bestSurface.surface)
  assert.equal(find(ticker, "cm-running-style").entries[0].value, "30 runs", "global running-style statistics count recorded round participations")
  assert.equal(find(ticker, "cm-most-wins").entries[0].value, "9", "individual CM statistics include the recorded final")
  assert.equal(find(ticker, "cm-most-races").entries[0].value, "11")
})

test("LoH raw leaders aggregate placements across events and ignore Bronze cap, Extra Stage and stale caches", () => {
  let event = addSet({ ...loh(1), legacyProgress: { leagueScore: 3980, racesPlayed: 0, firstPlaces: 0, top3Finishes: 0, participants: [] } })
  assert.equal(progress.getLoHProgress(event).raceSets[0].awardedScore, 20)
  for (let day = 1; day <= 6; day++) event = progress.finishLoHDay(event, day)
  event = progress.registerLoHExtraStageLineup(progress.confirmLoHMainStageRank(event, 74), ["a", "b", "c"], "2026-11-01T02:00:00Z")
  const beforeExtra = find(facts([], [event]), "loh-raw-points")
  event = progress.saveLoHExtraStageResult(event, { id: "extra", createdAt: "2026-11-01T03:00:00Z", weather: "Sunny", condition: "Firm", placements: ["a", "b", "c"].map((umaId, index) => ({ umaId, placement: ["first", "second", "third"][index] })) })
  assert.deepEqual(find(facts([], [event]), "loh-raw-points"), beforeExtra)
  const stale = { ...event, leagueScore: 900000, participants: event.participants.map(uma => ({ ...uma, totalPoints: 999999 })) }
  const events = [stale, addSet(loh(2), [3, 1, 2])], before = structuredClone(events)
  const ticker = facts([], events)
  assert.deepEqual(ticker.map(item => item.id), ["loh-raw-points"], "LoH cannot supply any CM ranking")
  assert.deepEqual(ticker[0].entries.map(row => [row.id, row.value]), [["b", "800 PT"], ["a", "700 PT"], ["c", "500 PT"]])
  assert.deepEqual(ticker, facts([], [...events].reverse()))
  assert.deepEqual(events, before)
})

test("ticker does not infer LoH raw points from legacy League Score or invent missing Uma names", () => {
  const legacy = { ...loh(1), raceSets: undefined, leagueScore: 9000, racesPlayed: 45 }
  assert.deepEqual(facts([], [legacy]), [])
  assert.deepEqual(facts([], [addSet(loh(2))], []), [])
})
