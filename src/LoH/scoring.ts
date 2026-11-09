import type { LoHPlacement } from "./types"
import { LOH_RANK_THRESHOLDS } from "./ranks"
import { LOH_LINEUP_SIZE, LOH_RACES_PER_SET } from "./constants"

/** Points for places 1–12, shared by entry, history and participant statistics. */
export const LOH_PLACEMENT_POINTS = [100, 60, 40, 30, 20, 10, 10, 10, 10, 10, 10, 10] as const
export const LOH_BRONZE_CAP = LOH_RANK_THRESHOLDS.find(([rank]) => rank === "SILVER I")![1]
export const LOH_ENTRY_PLACEMENTS = [1, 2, 3, 4, 5, "6+"] as const

export function isLoHPlacement(value: unknown): value is LoHPlacement {
  return value === "6+" || (typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= LOH_PLACEMENT_POINTS.length)
}

export function getLoHPlacementPoints(place: LoHPlacement): number {
  if (!isLoHPlacement(place)) throw new Error("Choose a placement from 1st to 5th, or 6th+.")
  return place === "6+" ? 10 : LOH_PLACEMENT_POINTS[place - 1]
}

export function isCompleteLoHRace(places: readonly unknown[]): places is LoHPlacement[] {
  const exact = places.filter(place => place !== "6+")
  return places.length === LOH_LINEUP_SIZE && places.every(isLoHPlacement) && new Set(exact).size === exact.length
}

export function getLoHRaceRawScore(places: readonly LoHPlacement[]): number {
  if (!isCompleteLoHRace(places)) throw new Error("Each race needs three placements. Exact places must be unique; 6th+ can repeat.")
  return places.reduce((total, place) => total + getLoHPlacementPoints(place), 0)
}

/** A set that starts in Bronze remains capped for all its remaining races. */
export function calculateLoHSetScore(rawScores: readonly number[], scoreBefore: number) {
  const maxRaceScore = [...LOH_PLACEMENT_POINTS].sort((a, b) => b - a).slice(0, LOH_LINEUP_SIZE).reduce((sum, points) => sum + points, 0)
  if (!Number.isFinite(scoreBefore) || scoreBefore < 0 || rawScores.length !== LOH_RACES_PER_SET || rawScores.some(score => !Number.isSafeInteger(score) || score < 0 || score > maxRaceScore)) throw new Error("Invalid race scores.")
  const ticketUsed = scoreBefore >= LOH_BRONZE_CAP
  let scoreAfter = scoreBefore
  const awardedScores = rawScores.map(raw => {
    const awarded = ticketUsed ? raw : Math.min(raw, Math.max(0, LOH_BRONZE_CAP - scoreAfter))
    scoreAfter += awarded
    return awarded
  })
  return { ticketUsed, awardedScores, rawScore: rawScores.reduce((a, b) => a + b, 0), awardedScore: scoreAfter - scoreBefore, scoreBefore, scoreAfter }
}
