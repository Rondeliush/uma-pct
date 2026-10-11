import assert from "node:assert/strict"
import test from "node:test"
import { importTS } from "./helpers/importTS.mjs"

const { getUmaCareerOverall } = await importTS(new URL("../src/Statistics/umaCareerStatistics.ts", import.meta.url))
const { calculateUmaDetailStatistics } = await importTS(new URL("../src/Statistics/umaDetailStatistics.ts", import.meta.url))

const cmStatistics = () => calculateUmaDetailStatistics([{
  number: 1, name: "Career check", distance: 2000, length: "Medium", surface: "Turf", finalPlace: "1st",
  participants: [],
  attempts: [{ day: 1, attempt: 1, racesPlayed: 10, retired: false, umaWins: [{ cmUmaId: "removed", wins: 6,
    configuration: { umaVersionId: "original", runningStyle: "front_runner", ace: false, debuffer: false, entrySource: "manual", configurationSource: "recorded" },
  }] }],
  finalResults: [{ cmUmaId: "removed", won: true,
    configuration: { umaVersionId: "original", runningStyle: "front_runner", ace: false, debuffer: false, entrySource: "manual", configurationSource: "recorded" },
  }],
}], "original")

test("Career Overall equals CM round totals and event participation with only CM supported", () => {
  const statistics = cmStatistics()
  const before = structuredClone(statistics)
  assert.deepEqual(getUmaCareerOverall(statistics), { races: 10, wins: 6, winRate: 60, events: 1 })
  assert.equal(statistics.finalAppearances, 1)
  assert.equal(statistics.finalWins, 1)
  assert.deepEqual(statistics, before)
})

test("Overall combines compatible mode records with a weighted rate while preserving CM achievements", () => {
  const statistics = cmStatistics()
  const additionalModes = [{ races: 30, wins: 3, winRate: 10, events: 2 }]
  const before = structuredClone({ statistics, additionalModes })
  assert.deepEqual(getUmaCareerOverall(statistics, additionalModes), { races: 40, wins: 9, winRate: 22.5, events: 3 })
  assert.deepEqual({ statistics, additionalModes }, before)
  assert.equal(statistics.cmEvents, 1)
  assert.equal(statistics.finalAppearances, 1)
  assert.equal(statistics.finalWins, 1)
})

test("Overall never invents a win equivalent for a supported mode with unavailable wins", () => {
  assert.deepEqual(getUmaCareerOverall(cmStatistics(), [{ races: 30, wins: null, winRate: null, events: 2 }]), {
    races: 40, wins: null, winRate: null, events: 3,
  })
})

test("empty and final-only CM history retain zero round counts and unavailable win rate", () => {
  const empty = calculateUmaDetailStatistics([], "unused")
  assert.deepEqual(getUmaCareerOverall(empty), { races: 0, wins: 0, winRate: null, events: 0 })
  const finalOnly = { ...empty, cmEvents: 1, finalAppearances: 1, finalWins: 1 }
  assert.deepEqual(getUmaCareerOverall(finalOnly), { races: 0, wins: 0, winRate: null, events: 1 })
})
