import type { CM, CMFinalPlacement } from "../types/types"
import { calculateUmaDetailStatistics } from "./umaDetailStatistics"
import { formatUmaWinRate } from "./umaStatistics"

export type UmaComparisonFormat = "number" | "percentage" | "text"
export type UmaComparisonRanking = "highest" | "none"
export type UmaComparisonValue = number | string | null

export type UmaCompetitiveRecord = {
  races: number | null
  wins: number | null
  winRate: number | null
  events: number | null
}

export type UmaCmComparisonRecord = UmaCompetitiveRecord & {
  finalAppearances: number | null
  finalAAppearances: number | null
  finalBAppearances: number | null
  firstFinishes: number | null
  secondFinishes: number | null
  thirdFinishes: number | null
  fourthOrLowerFinishes: number | null
  podiumFinishes: number | null
  podiumRate: number | null
  finalAppearanceRate: number | null
  finalWinRate: number | null
}

export type UmaComparisonValues = {
  overall: UmaCompetitiveRecord
  cm: UmaCmComparisonRecord
}

type ComparisonSectionDefinition = {
  id: string
  label: string
  tone: "cyan" | "violet" | "muted"
  status: "ready" | "soon"
  rows: readonly {
    id: string; label: string; format: UmaComparisonFormat; ranking: UmaComparisonRanking
    getValue: (values: UmaComparisonValues) => UmaComparisonValue
  }[]
}

/** Event-specific rows and ranking rules keep the renderer independent of saved-data providers. */
export const UMA_COMPARISON_SECTIONS = [
  {
    id: "general", label: "General", tone: "cyan", status: "ready",
    rows: [
      { id: "races", label: "Races", format: "number", ranking: "highest", getValue: (values) => values.overall.races },
      { id: "wins", label: "Wins", format: "number", ranking: "highest", getValue: (values) => values.overall.wins },
      { id: "winRate", label: "Win Rate", format: "percentage", ranking: "highest", getValue: (values) => values.overall.winRate },
      { id: "eventsParticipated", label: "Events Participated", format: "number", ranking: "highest", getValue: (values) => values.overall.events },
    ],
  },
  {
    id: "cm", label: "Champions Meeting", tone: "violet", status: "ready",
    rows: [
      { id: "cmEvents", label: "CM Events", format: "number", ranking: "highest", getValue: (values) => values.cm.events },
      { id: "cmRaces", label: "CM Races", format: "number", ranking: "highest", getValue: (values) => values.cm.races },
      { id: "cmWins", label: "CM Wins", format: "number", ranking: "highest", getValue: (values) => values.cm.wins },
      { id: "cmWinRate", label: "CM Win Rate", format: "percentage", ranking: "highest", getValue: (values) => values.cm.winRate },
      { id: "finalAppearances", label: "Final Appearances", format: "number", ranking: "highest", getValue: (values) => values.cm.finalAppearances },
      { id: "finalAAppearances", label: "Final A Appearances", format: "number", ranking: "highest", getValue: (values) => values.cm.finalAAppearances },
      { id: "finalBAppearances", label: "Final B Appearances", format: "number", ranking: "highest", getValue: (values) => values.cm.finalBAppearances },
      { id: "firstFinishes", label: "1st Finishes", format: "number", ranking: "highest", getValue: (values) => values.cm.firstFinishes },
      { id: "secondFinishes", label: "2nd Finishes", format: "number", ranking: "highest", getValue: (values) => values.cm.secondFinishes },
      { id: "thirdFinishes", label: "3rd Finishes", format: "number", ranking: "highest", getValue: (values) => values.cm.thirdFinishes },
      { id: "fourthOrLowerFinishes", label: "4th+ Finishes", format: "number", ranking: "highest", getValue: (values) => values.cm.fourthOrLowerFinishes },
      { id: "podiumFinishes", label: "Podium Finishes", format: "number", ranking: "highest", getValue: (values) => values.cm.podiumFinishes },
      { id: "finalAppearanceRate", label: "Final Appearance Rate", format: "percentage", ranking: "highest", getValue: (values) => values.cm.finalAppearanceRate },
      { id: "podiumRate", label: "Podium Rate", format: "percentage", ranking: "highest", getValue: (values) => values.cm.podiumRate },
      { id: "finalWinRate", label: "Final Win Rate", format: "percentage", ranking: "highest", getValue: (values) => values.cm.finalWinRate },
    ],
  },
  {
    id: "loh", label: "League of Heroes", tone: "muted", status: "soon",
    rows: [],
  },
] as const satisfies readonly ComparisonSectionDefinition[]

const validNumber = (value: number | null | undefined) => typeof value === "number" && Number.isFinite(value) ? value : null
const percentage = (numerator: number | null, denominator: number | null) => numerator !== null && denominator !== null && denominator > 0
  ? numerator / denominator * 100 : null

/** Sum supported mode records and recompute the weighted Overall rate from the combined counts. */
export function aggregateUmaCompetitiveRecords(records: UmaCompetitiveRecord[]): UmaCompetitiveRecord {
  const recorded = records.filter((record) => record.races !== null || record.wins !== null || record.events !== null)
  const total = (key: "races" | "wins" | "events") => recorded.length > 0 && recorded.every((record) => validNumber(record[key]) !== null)
    ? recorded.reduce((sum, record) => sum + record[key]!, 0) : null
  const races = total("races")
  const wins = total("wins")
  return { races, wins, winRate: percentage(wins, races), events: total("events") }
}

function getUmaCmComparisonRecord(cms: CM[], versionId: string | null): UmaCmComparisonRecord {
  const unavailable: UmaCmComparisonRecord = {
    races: null, wins: null, winRate: null, events: null,
    finalAppearances: null, finalAAppearances: null, finalBAppearances: null,
    firstFinishes: null, secondFinishes: null, thirdFinishes: null, fourthOrLowerFinishes: null,
    podiumFinishes: null, podiumRate: null, finalAppearanceRate: null, finalWinRate: null,
  }
  if (versionId === null) return unavailable
  const statistics = calculateUmaDetailStatistics(cms, versionId)
  if (statistics.cmEvents === 0) return unavailable

  // Partial A/B counts would rank incomplete history against complete records.
  const hasUnknownFinalGroup = statistics.finals.some((final) => final.group === null)
  const finalCount = (group: "Final A" | "Final B") => hasUnknownFinalGroup ? null
    : statistics.finals.find((final) => final.group === group)?.appearances ?? 0
  const finishCount = (placement: CMFinalPlacement) => statistics.finals.reduce((sum, final) => sum + final.placements[placement], 0)
  const races = validNumber(statistics.races)
  const wins = validNumber(statistics.wins)
  const events = validNumber(statistics.cmEvents)
  const finalAppearances = validNumber(statistics.finalAppearances)
  return {
    races, wins, winRate: percentage(wins, races), events,
    finalAppearances,
    finalAAppearances: finalCount("Final A"),
    finalBAppearances: finalCount("Final B"),
    firstFinishes: finishCount("first"),
    secondFinishes: finishCount("second"),
    thirdFinishes: finishCount("third"),
    fourthOrLowerFinishes: finishCount("fourth_or_lower"),
    podiumFinishes: validNumber(statistics.podiumFinishes),
    // Shared individual-placement rates exclude unrecorded finals from their denominators.
    podiumRate: validNumber(statistics.podiumRate),
    finalAppearanceRate: percentage(finalAppearances, events),
    finalWinRate: validNumber(statistics.finalWinRate),
  }
}

export function getUmaComparisonValues(cms: CM[], versionId: string | null): UmaComparisonValues {
  // Add real saved-data providers here when supported; Overall includes every registered mode.
  const supportedModes = { cm: getUmaCmComparisonRecord(cms, versionId) }
  return { overall: aggregateUmaCompetitiveRecords(Object.values(supportedModes)), ...supportedModes }
}

export function getUmaComparisonWinners(values: UmaComparisonValue[], format: UmaComparisonFormat, ranking: UmaComparisonRanking = "highest"): boolean[] {
  if (format === "text" || ranking === "none") return values.map(() => false)
  const numeric = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value))
  const best = numeric.length > 0 ? Math.max(...numeric) : null
  return values.map((value) => best !== null && value === best)
}

export function formatUmaComparisonValue(value: UmaComparisonValue, format: UmaComparisonFormat): string {
  if (value === null || (typeof value === "number" && !Number.isFinite(value))) return "—"
  if (typeof value === "string") return value.trim() || "—"
  return format === "percentage" ? formatUmaWinRate(value) : value.toLocaleString("en")
}
