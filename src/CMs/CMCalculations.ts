import type { CM, CMAttempt } from "../types/types"

export function calculateAttemptWins(
  attempt: CMAttempt
): number {
  return attempt.umaWins.reduce(
    (total, uma) => total + uma.wins,
    0
  )
}

export function calculateAttemptRaces(
  attempt: CMAttempt
): number {
  return attempt.racesPlayed
}

export function getDayAttemptTotals(
  attempts: CMAttempt[],
  day: 1 | 2 | 3 | 4
): number[] {
  return attempts
    .filter((attempt) => attempt.day === day)
    .sort((a, b) => a.attempt - b.attempt)
    .map(calculateAttemptWins)
}

export function calculateDayWinRateFromAttempts(
  attempts: CMAttempt[],
  day: 1 | 2 | 3 | 4
): number | null {
  const dayAttempts = attempts.filter(
    (attempt) => attempt.day === day
  )

  if (dayAttempts.length === 0) {
    return null
  }

  const wins = dayAttempts.reduce(
    (total, attempt) =>
      total + calculateAttemptWins(attempt),
    0
  )

  const races = dayAttempts.reduce(
    (total, attempt) =>
      total + calculateAttemptRaces(attempt),
    0
  )

  if (races === 0) {
    return null
  }

  return (wins / races) * 100
}

export function calculateRoundWinRateFromAttempts(
  attempts: CMAttempt[],
  days: [1 | 2 | 3 | 4, 1 | 2 | 3 | 4]
): number | null {
  const roundAttempts = attempts.filter(
    (attempt) => days.includes(attempt.day)
  )

  if (roundAttempts.length === 0) {
    return null
  }

  const wins = roundAttempts.reduce(
    (total, attempt) =>
      total + calculateAttemptWins(attempt),
    0
  )

  const races = roundAttempts.reduce(
  (total, attempt) =>
    total + calculateAttemptRaces(attempt),
  0
)

if (races === 0) {
  return null
}

  return (wins / races) * 100
}

export function calculateOverallWinRateFromAttempts(
  cm: CM
): number | null {
  const attempts = cm.attempts ?? []

  const wins = attempts.reduce(
    (total, attempt) =>
      total + calculateAttemptWins(attempt),
    0
  )

  const races = attempts.reduce(
  (total, attempt) =>
    total + calculateAttemptRaces(attempt),
  0
)

  const hasFinal = cm.finalPlace !== ""
  const finalWin =
    hasFinal && cm.finalPlace === "1st" ? 1 : 0
  const finalRaces = hasFinal ? 1 : 0

  if (races + finalRaces === 0) {
    return null
  }

  return (
    ((wins + finalWin) /
      (races + finalRaces)) *
    100
  )
}
export type Round2GroupResult =
  | "A"
  | "B"

export type FinalQualificationResult =
  | "Final A"
  | "Final B"
  | "Eliminated"
  | "Not qualified yet"

 export function calculateRound2GroupFromAttempts(
  attempts: CMAttempt[]
): Round2GroupResult {
  const round1Attempts = attempts.filter(
    (attempt) =>
      attempt.day === 1 ||
      attempt.day === 2
  )

  const hasThreeWins = round1Attempts.some(
    (attempt) =>
      calculateAttemptWins(attempt) >= 3
  )

  return hasThreeWins ? "A" : "B"
}


export function calculateFinalQualificationFromAttempts(
  attempts: CMAttempt[]
): FinalQualificationResult {
  const round2Group =
    calculateRound2GroupFromAttempts(attempts)

  const round2Attempts = attempts.filter(
    (attempt) =>
      attempt.day === 3 ||
      attempt.day === 4
  )

  const bestAttemptWins = round2Attempts.reduce(
    (best, attempt) =>
      Math.max(
        best,
        calculateAttemptWins(attempt)
      ),
    0
  )

  if (round2Group === "A") {
    if (bestAttemptWins >= 3) {
      return "Final A"
    }

    if (bestAttemptWins >= 1) {
      return "Final B"
    }

    return "Not qualified yet"
  }

  if (bestAttemptWins >= 1) {
    return "Final B"
  }

  return "Not qualified yet"
}