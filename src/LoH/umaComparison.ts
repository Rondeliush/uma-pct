import type { UmaCompetitiveRecord } from "../Statistics/umaComparison"
import { LOH_EXTRA_STAGE_PLACEMENTS } from "./extraStage"
import { getLoHLegacyProgress, getLoHParticipantStats, getLoHProgress } from "./progress"
import { LOH_ENTRY_PLACEMENTS } from "./scoring"
import type { LoH } from "./types"

export type UmaLoHComparisonRecord = UmaCompetitiveRecord & {
  rawPoints: number | null
  averageRawPointsPerRace: number | null
  averagePlacement: number | null
  firstPlaces: number | null
  secondPlaces: number | null
  thirdPlaces: number | null
  fourthPlaces: number | null
  fifthPlaces: number | null
  sixthOrLowerPlaces: number | null
  firstPlaceRate: number | null
  top3Rate: number | null
  top6Rate: number | null
  extraStageRaces: number | null
  extraStageFirstPlaces: number | null
  extraStageTop3Rate: number | null
  extraStageAveragePlacement: number | null
}

/** Use exact version history across every configuration, including raced Extra Stage snapshots. */
export function getUmaLoHComparisonRecord(events: LoH[], versionId: string | null): UmaLoHComparisonRecord {
  const unavailable: UmaLoHComparisonRecord = {
    events: null, races: null, wins: null, winRate: null, rawPoints: null,
    averageRawPointsPerRace: null, averagePlacement: null,
    firstPlaces: null, secondPlaces: null, thirdPlaces: null, fourthPlaces: null, fifthPlaces: null, sixthOrLowerPlaces: null,
    firstPlaceRate: null, top3Rate: null, top6Rate: null,
    extraStageRaces: null, extraStageFirstPlaces: null, extraStageTop3Rate: null, extraStageAveragePlacement: null,
  }
  if (versionId === null) return unavailable

  let appearances = 0, races = 0, wins = 0, mainStageRaces = 0, rawPoints = 0, placeTotal = 0, top3 = 0, top6 = 0
  let extraRaces = 0, extraWins = 0, extraTop3 = 0, extraPlaceTotal = 0
  let unknownPoints = false, unknownAverage = false, legacyPlacements = false, groupedSixth = false, groupedExtraPlacement = false
  const placements = LOH_ENTRY_PLACEMENTS.map(() => 0)
  for (const event of events) {
    const history = getLoHProgress(event)
    const uma = getLoHParticipantStats(event, history).find(uma => uma.umaId === versionId)
    if (!uma || uma.races === 0) continue
    appearances++
    races += uma.races
    wins += uma.wins
    top3 += uma.top3Finishes
    mainStageRaces += uma.races - Number(!!uma.participatedInExtraStage)
    unknownPoints ||= uma.totalPoints === undefined
    rawPoints += uma.totalPoints ?? 0
    unknownAverage ||= uma.avgPlace == null
    placeTotal += (uma.avgPlace ?? 0) * uma.races
    legacyPlacements ||= !!getLoHLegacyProgress(event)?.participants.some(item => item.umaId === versionId && item.races > 0)
    for (const set of history.raceSets) for (const race of set.races) {
      const result = race.placements.find(item => item.umaId === versionId)
      if (!result) continue
      const { place } = result
      placements[place === "6+" ? placements.length - 1 : Math.min(place, placements.length) - 1]++
      groupedSixth ||= place === "6+"
      if (typeof place === "number" && place <= 6) top6++
    }
    const extra = uma.extraStagePlacement
    if (extra) {
      extraRaces++
      extraWins += Number(extra === "first")
      if (extra === "fourth_or_lower") groupedExtraPlacement = true
      else {
        const placeIndex = LOH_EXTRA_STAGE_PLACEMENTS.indexOf(extra)
        placements[placeIndex]++
        extraTop3++
        extraPlaceTotal += placeIndex + 1
        top6++
      }
    }
  }
  if (appearances === 0) return unavailable
  const firstPlaceRate = wins / races * 100
  const unknownLowerPlacements = legacyPlacements || groupedExtraPlacement
  return {
    events: appearances, races, wins, winRate: firstPlaceRate,
    rawPoints: unknownPoints ? null : rawPoints,
    // Only Main Stage awards raw points; Extra Stage races must not dilute this average.
    averageRawPointsPerRace: unknownPoints || mainStageRaces === 0 ? null : rawPoints / mainStageRaces,
    averagePlacement: unknownAverage ? null : placeTotal / races,
    firstPlaces: wins, secondPlaces: legacyPlacements ? null : placements[1], thirdPlaces: legacyPlacements ? null : placements[2],
    fourthPlaces: unknownLowerPlacements ? null : placements[3], fifthPlaces: unknownLowerPlacements ? null : placements[4],
    sixthOrLowerPlaces: unknownLowerPlacements ? null : placements[5],
    firstPlaceRate, top3Rate: top3 / races * 100,
    // 6th+ may mean 6th or 7th–12th. Likewise, Extra Stage 4th+ cannot imply Top 6.
    top6Rate: legacyPlacements || groupedSixth || groupedExtraPlacement ? null : top6 / races * 100,
    extraStageRaces: extraRaces,
    extraStageFirstPlaces: extraWins,
    extraStageTop3Rate: extraRaces === 0 ? null : extraTop3 / extraRaces * 100,
    extraStageAveragePlacement: extraRaces === 0 || groupedExtraPlacement ? null : extraPlaceTotal / extraRaces,
  }
}
