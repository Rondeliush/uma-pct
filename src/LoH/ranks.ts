/** Inclusive lower bounds; this is the single source of League Rank thresholds. */
export const LOH_RANK_THRESHOLDS = [
  ["BRONZE I", 0],
  ["BRONZE II", 1_000],
  ["BRONZE III", 2_000],
  ["BRONZE IV", 3_000],
  ["SILVER I", 4_000],
  ["SILVER II", 5_500],
  ["SILVER III", 7_000],
  ["SILVER IV", 8_500],
  ["GOLD I", 10_000],
  ["GOLD II", 12_500],
  ["GOLD III", 15_000],
  ["GOLD IV", 17_500],
  ["PLATINUM I", 20_000],
  ["PLATINUM II", 23_000],
  ["PLATINUM III", 26_000],
  ["PLATINUM IV", 30_000],
] as const

export type LoHLeagueRank = (typeof LOH_RANK_THRESHOLDS)[number][0]

export function getLoHRankFromScore(score: number): LoHLeagueRank {
  for (let index = LOH_RANK_THRESHOLDS.length - 1; index >= 0; index--) {
    const [rank, minimumScore] = LOH_RANK_THRESHOLDS[index]
    if (score >= minimumScore) return rank
  }
  return LOH_RANK_THRESHOLDS[0][0]
}

/** Progress runs from the reached threshold to the next rank's inclusive bound. */
export function getLoHRankProgress(score: number) {
  const rank = getLoHRankFromScore(score)
  const index = LOH_RANK_THRESHOLDS.findIndex(([label]) => label === rank)
  const threshold = LOH_RANK_THRESHOLDS[index][1]
  const next = LOH_RANK_THRESHOLDS[index + 1]
  return {
    rank,
    threshold,
    nextRank: next?.[0] ?? null,
    nextThreshold: next?.[1] ?? null,
    pointsToNext: next ? Math.max(0, next[1] - score) : 0,
    percent: next ? Math.min(100, Math.max(0, ((score - threshold) / (next[1] - threshold)) * 100)) : 100,
  }
}
