import assert from "node:assert/strict"
import test from "node:test"
import { importTS } from "./helpers/importTS.mjs"

const { calculateUmaStatistics } = await importTS(new URL("../src/Statistics/umaStatistics.ts", import.meta.url))
const { calculateUmaDetailStatistics, getUmaDetailInsights } = await importTS(new URL("../src/Statistics/umaDetailStatistics.ts", import.meta.url))
const { calculateUmaRunningStyleStatistics } = await importTS(new URL("../src/Statistics/umaRunningStyleStatistics.ts", import.meta.url))
const { calculateUmaRoleStatistics } = await importTS(new URL("../src/Statistics/umaRoleStatistics.ts", import.meta.url))
const { getUmaCareerOverall } = await importTS(new URL("../src/Statistics/umaCareerStatistics.ts", import.meta.url))
const { getUmaChampionsMeetingHistory } = await importTS(new URL("../src/Statistics/umaCMHistory.ts", import.meta.url))
const { getCMUmaOverallStats, getHistoricalParticipantEntries } = await importTS(new URL("../src/CMs/cmParticipantPresentation.ts", import.meta.url))

const config = (runningStyle, fields = {}) => ({ umaVersionId: "fuji", runningStyle, ace: false, debuffer: true, entrySource: "manual", configurationSource: "recorded", ...fields })
function fixture(placement = "first", finalPlace = "1st") {
  return { number: 45342, name: "Final race regression", track: "Tokyo", distance: 3434, length: "Long", surface: "Turf", finalPlace,
    participants: [{ cmUmaId: "a", umaId: "fuji-alternate", runningStyle: "end_closer", ace: true, debuffer: false, autoRun: true }],
    attempts: ["pace_chaser", "late_surger"].map((style, i) => ({ day: i === 0 ? 1 : 3, attempt: 1, racesPlayed: 5, retired: false,
      umaWins: [{ cmUmaId: "a", wins: i === 0 ? 3 : 5, configuration: config(style) }] })),
    // A stale won flag must never override the explicit placement.
    finalResults: [{ cmUmaId: "a", placement, placementSource: "recorded", won: placement !== "first", configuration: config("runaway") }],
  }
}
const row = (statistics, key, value) => statistics.rows.find(item => item[key] === value)
const counts = statistics => [statistics.races, statistics.wins, statistics.winRate?.toFixed(2)]

test("raced Final snapshot contributes once to every individual breakdown and keeps final achievements", () => {
  const cm = fixture(), before = structuredClone(cm)
  const uma = calculateUmaStatistics([cm], [], []).umas.find(uma => uma.versionId === "fuji")
  const detail = calculateUmaDetailStatistics([cm], "fuji")
  for (const stats of [uma, detail, getUmaCareerOverall(detail), detail.events[0], detail.distances[0], uma.distances[0]]) {
    assert.deepEqual(counts(stats), [11, 9, "81.82"])
  }
  assert.equal(detail.cmEvents, 1)
  assert.deepEqual([detail.finalAppearances, detail.finalWins, detail.finalWinRate, detail.podiumFinishes, detail.podiumRate], [1, 1, 100, 1, 100])
  assert.deepEqual([uma.finalAppearances, uma.finalWins], [1, 1])
  const insights = getUmaDetailInsights(detail)
  assert.deepEqual(counts(insights.surfaces[0]), [11, 9, "81.82"])
  assert.equal(insights.surfaces[0].surface, "Turf")
  assert.deepEqual(counts(insights.highlights.bestCM), [11, 9, "81.82"])
  const styles = calculateUmaRunningStyleStatistics([cm], "fuji")
  assert.equal(styles.totalRaces, 11)
  for (const [style, races, wins, usage] of [["runaway", 1, 1, "9.09"], ["pace_chaser", 5, 3, "45.45"], ["late_surger", 5, 5, "45.45"]]) {
    const stats = row(styles, "style", style)
    assert.deepEqual([stats.races, stats.wins, stats.usage.toFixed(2)], [races, wins, usage])
  }
  const roles = calculateUmaRoleStatistics([cm], "fuji")
  assert.deepEqual(counts(row(roles, "role", "debuffer")), [11, 9, "81.82"])
  assert.equal(row(roles, "role", "debuffer").usage, 100)
  const [history] = getUmaChampionsMeetingHistory([cm], "fuji", detail.events)
  assert.deepEqual(counts(history), [11, 9, "81.82"])
  assert.deepEqual(history.runningStyles.map(item => item.style), ["runaway", "pace_chaser", "late_surger"])
  assert.deepEqual(counts(getCMUmaOverallStats(cm).get("fuji")), [11, 9, "81.82"])
  // Configuration presentation already included the final; it must not gain a second race.
  const presentationCM = structuredClone(cm)
  presentationCM.finalResults[0].won = true
  assert.deepEqual(getHistoricalParticipantEntries(presentationCM).map(entry => counts(entry)), [[5, 3, "60.00"], [5, 5, "100.00"], [1, 1, "100.00"]])
  assert.equal(calculateUmaDetailStatistics([cm], "fuji-alternate").races, 0)
  cm.participants = []
  assert.deepEqual(calculateUmaDetailStatistics([cm], "fuji"), detail)
  cm.participants = before.participants
  assert.deepEqual(cm, before)
})

test("an individual second place adds a race without a win, even when the team wins", () => {
  for (const teamPlace of ["1st", "2nd", "3rd"]) {
    const cm = fixture("second", teamPlace)
    const detail = calculateUmaDetailStatistics([cm], "fuji")
    assert.deepEqual(counts(detail), [11, 8, "72.73"])
    assert.deepEqual([detail.finalAppearances, detail.finalWins], [1, 0])
    assert.deepEqual(counts(calculateUmaStatistics([cm], [], []).umas[0]), [11, 8, "72.73"])
    assert.deepEqual(counts(row(calculateUmaRunningStyleStatistics([cm], "fuji"), "style", "runaway")), [1, 0, "0.00"])
    assert.deepEqual(counts(row(calculateUmaRoleStatistics([cm], "fuji"), "role", "debuffer")), [11, 8, "72.73"])
  }
})

test("selected but unraced finals contribute neither races nor snapshot breakdowns", () => {
  for (const finalPlace of ["", "unexpected"]) {
    const cm = fixture("first", finalPlace)
    assert.deepEqual(counts(calculateUmaStatistics([cm], [], []).umas[0]), [10, 8, "80.00"])
    const detail = calculateUmaDetailStatistics([cm], "fuji")
    assert.deepEqual(counts(detail), [10, 8, "80.00"])
    assert.equal(detail.finalAppearances, 0)
    assert.equal(calculateUmaRunningStyleStatistics([cm], "fuji").totalRaces, 10)
    assert.equal(calculateUmaRoleStatistics([cm], "fuji").totalRaces, 10)
  }
})

test("duplicate legacy references count a final once per version and never multiply individual wins", () => {
  const cm = fixture()
  cm.finalResults.push({ ...cm.finalResults[0], cmUmaId: "duplicate" }, { ...cm.finalResults[0], cmUmaId: "losing-duplicate", placement: "second" })
  assert.deepEqual(counts(calculateUmaStatistics([cm], [], []).umas[0]), [11, 9, "81.82"])
  assert.deepEqual(counts(calculateUmaDetailStatistics([cm], "fuji")), [11, 9, "81.82"])
  assert.deepEqual(counts(row(calculateUmaRunningStyleStatistics([cm], "fuji"), "style", "runaway")), [1, 1, "100.00"])
  assert.deepEqual(counts(row(calculateUmaRoleStatistics([cm], "fuji"), "role", "debuffer")), [11, 9, "81.82"])
})

test("unknown final snapshot metadata remains unknown rather than borrowing the current lineup", () => {
  const cm = fixture()
  cm.finalResults[0].configuration = config(null, { ace: null, debuffer: null })
  const styles = calculateUmaRunningStyleStatistics([cm], "fuji")
  assert.deepEqual([styles.totalRaces, styles.unknownStyleRaces], [11, 1])
  assert.equal(row(styles, "style", "pace_chaser").usage, 5 / 11 * 100)
  const roles = calculateUmaRoleStatistics([cm], "fuji")
  assert.deepEqual([roles.totalRaces, roles.unknownRoleRaces], [11, 1])
  assert.deepEqual(counts(row(roles, "role", "unknown")), [1, 1, "100.00"])
})

test("a final-only participant counts a single normal race and separate final appearance", () => {
  const cm = fixture()
  cm.attempts = []
  const detail = calculateUmaDetailStatistics([cm], "fuji")
  assert.deepEqual(counts(detail), [1, 1, "100.00"])
  assert.deepEqual([detail.cmEvents, detail.finalAppearances, detail.finalWins, detail.finals[0].group], [1, 1, 1, null])
  assert.deepEqual(counts(calculateUmaStatistics([cm], [], []).umas[0]), [1, 1, "100.00"])
  assert.equal(row(calculateUmaRunningStyleStatistics([cm], "fuji"), "style", "runaway").usage, 100)
  assert.equal(row(calculateUmaRoleStatistics([cm], "fuji"), "role", "debuffer").usage, 100)
})
