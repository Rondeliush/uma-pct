import assert from "node:assert/strict"
import test from "node:test"
import { importTS } from "./helpers/importTS.mjs"

const { getLoHRankFromScore, getLoHRankProgress } = await importTS(new URL("../src/LoH/ranks.ts", import.meta.url))

test("League Rank promotes at each inclusive score threshold and stays stable between thresholds", () => {
  const expected = [
    [0, "BRONZE I"], [1000, "BRONZE II"], [2000, "BRONZE III"], [3000, "BRONZE IV"],
    [4000, "SILVER I"], [5500, "SILVER II"], [7000, "SILVER III"], [8500, "SILVER IV"],
    [10000, "GOLD I"], [12500, "GOLD II"], [15000, "GOLD III"], [17500, "GOLD IV"],
    [20000, "PLATINUM I"], [23000, "PLATINUM II"], [26000, "PLATINUM III"], [30000, "PLATINUM IV"],
  ]
  for (let index = 0; index < expected.length; index++) {
    const [score, rank] = expected[index]
    assert.equal(getLoHRankFromScore(score), rank, `at ${score} PT`)
    assert.equal(getLoHRankFromScore(score + 1), rank, `above ${score} PT`)
    if (index > 0) assert.equal(getLoHRankFromScore(score - 1), expected[index - 1][1], `below ${score} PT`)
  }
  assert.equal(getLoHRankFromScore(24680), "PLATINUM II")
  assert.equal(getLoHRankFromScore(999999), "PLATINUM IV")
})

test("progress starts at Bronze I and tracks the reached threshold rather than the previous level", () => {
  assert.deepEqual(getLoHRankProgress(0), { rank: "BRONZE I", threshold: 0, nextRank: "BRONZE II", nextThreshold: 1000, pointsToNext: 1000, percent: 0 })
  const silver = getLoHRankProgress(9000)
  assert.equal(silver.rank, "SILVER IV")
  assert.equal(silver.threshold, 8500)
  assert.equal(silver.nextRank, "GOLD I")
  assert.equal(silver.nextThreshold, 10000)
  assert.equal(silver.pointsToNext, 1000)
  assert.ok(Math.abs(silver.percent - 100 / 3) < 0.000001)
})

test("crossing a tier boundary resets progress to the new rank's lower bound", () => {
  for (const [threshold, previousRank, rank] of [[4000, "BRONZE IV", "SILVER I"], [10000, "SILVER IV", "GOLD I"], [20000, "GOLD IV", "PLATINUM I"]]) {
    const before = getLoHRankProgress(threshold - 1)
    assert.equal(before.rank, previousRank)
    assert.equal(before.nextRank, rank)
    assert.equal(before.nextThreshold, threshold)
    assert.equal(before.pointsToNext, 1)
    assert.ok(before.percent > 99 && before.percent < 100)
    const reached = getLoHRankProgress(threshold)
    assert.equal(reached.rank, rank)
    assert.equal(reached.threshold, threshold)
    assert.equal(reached.percent, 0)
    assert.ok(reached.pointsToNext > 0)
  }
})

test("Platinum IV is complete without inventing another rank or a negative point target", () => {
  for (const score of [30000, 35000, 999999]) {
    assert.deepEqual(getLoHRankProgress(score), { rank: "PLATINUM IV", threshold: 30000, nextRank: null, nextThreshold: null, pointsToNext: 0, percent: 100 })
  }
})
