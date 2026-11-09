import type { CM, CMFinalPlacement, RunningStyle, TrackSurface, TrackLength, TrackDirection, TrackWeather, TrackSeason, TrackCondition } from "../types/types"
import type { UmaFormData } from "../components/event-form/eventFormData"
import type { LOH_EVENT_RANDOM, LOH_LOG_ENTRY_TYPES } from "./constants"

export type LoHPlacement =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | "6+"

export type LoHDayState = "locked" | "active" | "completed"

export type LoHUma = {
  umaId: string
  runningStyle?: RunningStyle | null
  ace?: boolean
  debuffer?: boolean
  autoRun?: boolean
  races: number
  wins: number
  top3Finishes: number
  totalPoints?: number
  avgPlace?: number | null
  participatedInExtraStage?: boolean
  extraStagePlacement?: LoHExtraStagePlacement
}

/** Kept readable when importing profiles created before the LoH event editor. */
export type LegacyLoH = {
  number: number
  name: string
  track: string
  participants: LoHUma[]
  score: number
  rank: string
  racesPlayed: number
  firstPlaces: number
  top3Finishes: number
  completed: boolean
}

export type LoHLogEntry = {
  id: string
  timestamp: string
  type: (typeof LOH_LOG_ENTRY_TYPES)[number]
  message: string
  details?: string[]
}

export type LoH = {
  id: string
  number: number
  name: string
  notes?: string
  racecourse: string
  // Unknown conditions in older profiles stay unknown until recorded.
  surface: TrackSurface | null
  distance: number | null
  length: TrackLength | null
  direction: TrackDirection | null
  /** Event conditions normalize to Random; concrete/null values remain readable for older profiles. */
  weather: typeof LOH_EVENT_RANDOM | TrackWeather | null
  season: TrackSeason | null
  condition: typeof LOH_EVENT_RANDOM | TrackCondition | null
  leagueScore: number
  /** Score-derived value; older saved labels are refreshed by normalizeLoH. */
  leagueRank: string
  overallRank: number | null
  currentLineup: string[]
  participants: LoHUma[]
  log: LoHLogEntry[]
  racesPlayed: number
  firstPlaces: number
  top3Finishes: number
  completed: boolean
  /** Race inputs are authoritative; aggregate fields are rebuilt by the progress helper. */
  raceSets?: LoHRaceSet[]
  /** Only explicit day confirmations are stored; tickets and active day are derived. */
  mainStage?: { completedDays: number[] }
  /** Configurations created through Extra Stage Add New; never Main Stage participants/history. */
  extraStageCandidates?: LoHLineupMember[]
  extraStage?: { registeredAt: string; lineupSnapshot: LoHLineupMember[]; result?: LoHExtraStageResult }
  /** Recorded totals from profiles that predate individual race recording. */
  legacyProgress?: LoHLegacyProgress
}

export type LoHEventDetails = Pick<CM, "number" | "name" | "surface" | "distance" | "length" | "direction" | "season"> & {
  racecourse: string
  weather?: LoH["weather"]
  condition?: LoH["condition"]
  lineup?: UmaFormData[]
}

export type LoHLineupMember = Pick<LoHUma, "umaId" | "runningStyle" | "ace" | "debuffer" | "autoRun">
export type LoHRacePlacement = { umaId: string; place: LoHPlacement }
export type LoHRace = { id: string; placements: LoHRacePlacement[] }

export type LoHRaceSetInput = {
  id: string
  createdAt: string
  day: number
  /** Stable order within a day. Older sets fall back to their recording time. */
  order?: number
  lineupSnapshot: LoHLineupMember[]
  races: LoHRace[]
  weather: TrackWeather | null
  condition: TrackCondition | null
}

export type LoHRaceSet = LoHRaceSetInput & { ticketUsed?: boolean }
export type LoHCalculatedRace = Omit<LoHRace, "placements"> & {
  placements: (LoHRacePlacement & { rawPoints: number })[]
  rawScore: number
  awardedScore: number
}
export type LoHCalculatedRaceSet = Omit<LoHRaceSet, "races"> & {
  ticketUsed: boolean
  setNumber: number
  races: LoHCalculatedRace[]
  rawScore: number
  awardedScore: number
  scoreBefore: number
  scoreAfter: number
}
export type LoHLegacyProgress = Pick<LoH, "leagueScore" | "racesPlayed" | "firstPlaces" | "top3Finishes" | "participants">

export type LoHExtraStagePlacement = CMFinalPlacement
export type LoHExtraStageResult = {
  id: string
  createdAt: string
  weather: TrackWeather
  condition: TrackCondition
  placements: { umaId: string; placement: LoHExtraStagePlacement }[]
}
export type LoHPhase = "MAIN_STAGE" | "AWAITING_MAIN_STAGE_RANK" | "NOT_QUALIFIED" | "EXTRA_STAGE_QUALIFIED" | "EXTRA_STAGE_READY" | "EXTRA_STAGE_RESULT_RECORDED" | "COMPLETED"
