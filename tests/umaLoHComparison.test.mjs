import assert from "node:assert/strict"
import test from "node:test"
import { importTS } from "./helpers/importTS.mjs"

const { getUmaComparisonValues, getUmaComparisonWinners, formatUmaComparisonValue, UMA_COMPARISON_SECTIONS } = await importTS(new URL("../src/Statistics/umaComparison.ts", import.meta.url))
const { createLoHEvent } = await importTS(new URL("../src/LoH/lohData.ts", import.meta.url))
const { getLoHProgress, getLoHParticipantStats, getLoHLineupSnapshot } = await importTS(new URL("../src/LoH/progress.ts", import.meta.url))
const { calculateLoHUmaStatistics } = await importTS(new URL("../src/LoH/umaStatistics.ts", import.meta.url))

function event(places = [], number = 1, versionId = "original") {
  const event = createLoHEvent([], {
    number, name: "Compare LoH", racecourse: "Tokyo", surface: "Turf", distance: 1600, length: "Mile", direction: "Left", season: "Spring",
    lineup: [versionId, "teio", "ship"].map(id => ({ id, name: id, style: "Pace Chaser", ace: false, debuffer: false, autoRun: false })),
  }, `event-${number}`)
  // Numeric places beyond 5 remain readable in imported historical sets.
  event.raceSets = Array.from({ length: places.length / 5 }, (_, set) => ({
    id: `set-${number}-${set}`, day: 1, order: set + 1, createdAt: "2026-11-01T01:00:00Z", weather: "Sunny", condition: "Firm", lineupSnapshot: getLoHLineupSnapshot(event),
    races: places.slice(set * 5, set * 5 + 5).map((place, race) => {
      const others = [1, 2, 3].filter(value => value !== place)
      return { id: `race-${set}-${race}`, placements: [{ umaId: versionId, place }, { umaId: "teio", place: others[0] }, { umaId: "ship", place: others[1] }] }
    }),
  }))
  return event
}

function extra(event, placement) {
  const otherPlaces = ["first", "second", "third"].filter(value => value !== placement)
  return { ...event, extraStage: {
    registeredAt: "2026-11-02T01:00:00Z", lineupSnapshot: getLoHLineupSnapshot(event),
    result: { id: "extra", createdAt: "2026-11-02T02:00:00Z", weather: "Rainy", condition: "Soft", placements: [
      { umaId: event.currentLineup[0], placement }, { umaId: "teio", placement: otherPlaces[0] }, { umaId: "ship", placement: otherPlaces[1] },
    ] },
  } }
}

const values = events => getUmaComparisonValues([], "original", events).loh

test("LoH comparison uses actual placements for all buckets, points, rates and averages", () => {
  const loh = event([1, 2, 3, 4, 5, 6, 7, 8, 9, 12])
  const before = structuredClone(loh)
  const result = values([loh])
  assert.deepEqual([result.events, result.races, result.wins, result.rawPoints, result.averageRawPointsPerRace, result.averagePlacement], [1, 10, 1, 300, 30, 5.7])
  assert.deepEqual([result.firstPlaces, result.secondPlaces, result.thirdPlaces, result.fourthPlaces, result.fifthPlaces, result.sixthOrLowerPlaces], [1, 1, 1, 1, 1, 5])
  assert.deepEqual([result.firstPlaceRate, result.top3Rate, result.top6Rate], [10, 30, 60])
  assert.deepEqual([result.extraStageRaces, result.extraStageFirstPlaces, result.extraStageTop3Rate, result.extraStageAveragePlacement], [0, 0, null, null])
  assert.deepEqual(loh, before)
})

test("Extra Stage contributes one individual race while Raw PT and its average remain Main Stage only", () => {
  const loh = extra(event([1, 2, 3, 4, 5, 6, 7, 8, 9, 12]), "second")
  const result = values([loh])
  const canonical = getLoHParticipantStats(loh).find(uma => uma.umaId === "original")
  assert.deepEqual([result.races, result.wins, result.rawPoints, result.averagePlacement], [canonical.races, canonical.wins, canonical.totalPoints, canonical.avgPlace])
  assert.deepEqual([result.races, result.firstPlaces, result.secondPlaces, result.averageRawPointsPerRace], [11, 1, 2, 30])
  assert.equal(result.firstPlaceRate, 1 / 11 * 100)
  assert.equal(result.top3Rate, 4 / 11 * 100)
  assert.equal(result.top6Rate, 7 / 11 * 100)
  assert.deepEqual([result.extraStageRaces, result.extraStageFirstPlaces, result.extraStageTop3Rate, result.extraStageAveragePlacement], [1, 0, 100, 2])
})

test("LoH values aggregate every historical configuration and exact alternate versions stay separate", () => {
  const loh = event(Array(10).fill(1))
  loh.raceSets[1].lineupSnapshot[0] = { umaId: "original", runningStyle: "end_closer", ace: true, debuffer: true, autoRun: true }
  loh.participants[0] = { ...loh.participants[0], runningStyle: "runaway", totalPoints: 999999, wins: 999, races: 999 }
  const alternate = event(Array(5).fill(3), 2, "alternate")
  const before = structuredClone([loh, alternate])
  const original = getUmaComparisonValues([], "original", [loh, alternate]).loh
  const alt = getUmaComparisonValues([], "alternate", [loh, alternate]).loh
  assert.deepEqual([original.events, original.races, original.wins, original.rawPoints], [1, 10, 10, 1000])
  assert.deepEqual([alt.events, alt.races, alt.wins, alt.rawPoints], [1, 5, 0, 200])
  assert.ok(Object.values(getUmaComparisonValues([], "unused", [loh, alternate]).loh).every(value => value === null))
  assert.deepEqual([loh, alternate], before)
})

test("averages and rates use weighted totals across events, excluding Extra Stage from Raw PT denominators", () => {
  const first = extra(event(Array(5).fill(1)), "first")
  const second = extra(event(Array(10).fill(3), 2), "third")
  const result = values([first, second])
  assert.deepEqual([result.events, result.races, result.rawPoints, result.averageRawPointsPerRace], [2, 17, 900, 60])
  assert.equal(result.averagePlacement, (5 + 30 + 1 + 3) / 17)
  assert.equal(result.firstPlaceRate, 6 / 17 * 100)
  assert.deepEqual([result.extraStageRaces, result.extraStageFirstPlaces, result.extraStageTop3Rate, result.extraStageAveragePlacement], [2, 1, 100, 2])
})

test("Bronze cap, awarded points and League Score never replace individual raw points", () => {
  const loh = event(Array(25).fill(4))
  assert.equal(getLoHProgress(loh).leagueScore, 4000)
  const result = values([loh])
  assert.deepEqual([result.rawPoints, result.averageRawPointsPerRace, result.fourthPlaces], [750, 30, 25])
})

test("grouped 6th+ remains a known bucket without inventing exact averages or Top 6", () => {
  const result = values([event([1, 2, 3, 4, "6+"])])
  assert.deepEqual([result.rawPoints, result.averageRawPointsPerRace, result.sixthOrLowerPlaces], [240, 48, 1])
  assert.equal(result.averagePlacement, null)
  assert.equal(result.top6Rate, null)
  assert.equal(result.top3Rate, 60)
  assert.equal(result.fifthPlaces, 0)
})

test("Extra Stage 4th+ cannot invent exact lower places, Top 6 or an average, but is a known Top 3 loss", () => {
  const result = values([extra(event([1, 2, 3, 4, 5]), "fourth_or_lower")])
  assert.deepEqual([result.races, result.wins, result.secondPlaces, result.thirdPlaces, result.extraStageRaces], [6, 1, 1, 1, 1])
  assert.deepEqual([result.fourthPlaces, result.fifthPlaces, result.sixthOrLowerPlaces, result.averagePlacement, result.top6Rate, result.extraStageAveragePlacement], [null, null, null, null, null, null])
  assert.equal(result.extraStageTop3Rate, 0)
  assert.equal(result.top3Rate, 50)
})

test("legacy aggregates preserve known totals while incomplete placement history and points stay unavailable", () => {
  const legacy = { ...event(), raceSets: undefined, leagueScore: 4000, racesPlayed: 2, firstPlaces: 1, top3Finishes: 2,
    participants: [{ umaId: "original", races: 2, wins: 1, top3Finishes: 2, totalPoints: 160, avgPlace: 1.5 }] }
  const known = values([legacy])
  assert.deepEqual([known.races, known.wins, known.rawPoints, known.averageRawPointsPerRace, known.averagePlacement, known.top3Rate], [2, 1, 160, 80, 1.5, 100])
  assert.deepEqual([known.secondPlaces, known.thirdPlaces, known.fourthPlaces, known.fifthPlaces, known.sixthOrLowerPlaces, known.top6Rate], [null, null, null, null, null, null])
  delete legacy.participants[0].totalPoints
  delete legacy.participants[0].avgPlace
  const mixed = values([legacy, event(Array(5).fill(1), 2)])
  assert.deepEqual([mixed.events, mixed.races, mixed.firstPlaces, mixed.rawPoints, mixed.averageRawPointsPerRace, mixed.averagePlacement], [2, 7, 6, null, null, null])
})

test("an Extra Stage-only Uma has a real race, no Main Stage points average, and no invented registration results", () => {
  const registered = { ...event(), extraStage: { registeredAt: "2026-11-02T01:00:00Z", lineupSnapshot: getLoHLineupSnapshot(event()) } }
  assert.ok(Object.values(values([registered])).every(value => value === null))
  const raced = values([extra(event(), "first")])
  assert.deepEqual([raced.events, raced.races, raced.firstPlaces, raced.rawPoints, raced.averageRawPointsPerRace, raced.extraStageRaces], [1, 1, 1, 0, null, 1])
  assert.deepEqual([raced.firstPlaceRate, raced.top3Rate, raced.top6Rate, raced.averagePlacement, raced.extraStageTop3Rate], [100, 100, 100, 1, 100])
})

test("General includes LoH weighted counts, CM values stay unchanged and LoH agrees with the Statistics provider", () => {
  const cm = { number: 1, name: "CM", surface: "Turf", distance: 1600, length: "Mile", finalPlace: "", participants: [{ cmUmaId: "c1", umaId: "original", finalParticipant: false, won: false }],
    attempts: [{ day: 1, attempt: 1, racesPlayed: 10, retired: false, umaWins: [{ cmUmaId: "c1", wins: 6 }] }] }
  const loh = extra(event([1, 2, 3, 4, 5]), "first")
  const result = getUmaComparisonValues([cm], "original", [loh])
  assert.deepEqual(result.overall, { races: 16, wins: 8, winRate: 50, events: 2 })
  assert.deepEqual(result.cm, getUmaComparisonValues([cm], "original").cm)
  const canonical = calculateLoHUmaStatistics([loh], []).umas.find(uma => uma.versionId === "original")
  assert.deepEqual([result.loh.races, result.loh.wins, result.loh.winRate, result.loh.rawPoints, result.loh.events], [canonical.races, canonical.wins, canonical.winRate, canonical.rawPoints, canonical.lohEvents])
})

test("average placement highlights the lowest exact values including ties, with stable decimal formatting", () => {
  for (const id of ["lohAveragePlacement", "lohExtraStageAveragePlacement"]) {
    const row = UMA_COMPARISON_SECTIONS.find(section => section.id === "loh").rows.find(row => row.id === id)
    assert.equal(row.ranking, "lowest")
    assert.deepEqual(getUmaComparisonWinners([2.5, 1.25, null, 1.25, NaN], row.format, row.ranking), [false, true, false, true, false])
  }
  assert.equal(formatUmaComparisonValue(2, "decimal"), "2.00")
  assert.equal(formatUmaComparisonValue(300 / 7, "decimal"), "42.86")
  assert.equal(formatUmaComparisonValue(null, "decimal"), "—")
})
