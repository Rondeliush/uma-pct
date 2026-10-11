export type UmaStyle =
  | "Runaway"
  | "Front Runner"
  | "Pace Chaser"
  | "Late Surger"
  | "End Closer"

export type RunningStyle =
  | "runaway"
  | "front_runner"
  | "pace_chaser"
  | "late_surger"
  | "end_closer"

/** Ace and Debuffer are independent roles in the existing lineup editor. */
export type CMParticipantConfiguration = Readonly<{
  umaVersionId: string | null
  runningStyle: RunningStyle | null
  ace: boolean | null
  debuffer: boolean | null
  entrySource: "manual" | "autorun" | null
  configurationSource: "recorded" | "legacy_inferred"
}>

export type UmaCharacter = {
  id: string
  name: string
}

export type UmaVersion = {
  id: string
  characterId: string
  displayName: string
  versionName: string
  archived: boolean
  avatar?: string
}

export type CMUma = {
  cmUmaId: string
  umaId: string
  runningStyle: RunningStyle | null
  ace?: boolean
  debuffer?: boolean
  won: boolean
  autoRun?: boolean
  finalParticipant: boolean
}

export type CMAttemptUmaResult = {
  cmUmaId: string
  wins: number
  configuration: CMParticipantConfiguration
}

export type CMFinalPlacement = "first" | "second" | "third" | "fourth_or_lower"

export type CMFinalUmaResult = {
  cmUmaId: string
  placement: CMFinalPlacement | null
  /** Allows incomplete legacy finals to remain unknown without relaxing new result validation. */
  placementSource: "recorded" | "legacy_inferred"
  won: boolean
  configuration: CMParticipantConfiguration
}

export type CMAttempt = {
  day: 1 | 2 | 3 | 4
  attempt: 1 | 2 | 3 | 4

  racesPlayed: number
  retired: boolean

  umaWins: CMAttemptUmaResult[]
}

export type CMLogEntryType =
  | "created"
  | "trackUpdated"
  | "lineupUpdated"
  | "umaUpdated"
  | "attemptAdded"
  | "attemptEdited"
  | "qualificationUpdated"
  | "proceededToFinal"
  | "finalLineupSet"
  | "finalPlaceUpdated"
  | "winnerSelected"
  | "finalParticipantPlacementUpdated"
  | "completed"
  | "eliminated"

export type CMLogEntry = {
  id: string
  timestamp: string
  type: CMLogEntryType
  message: string
  details?: string[]
}

export type TrackSurface = 
  | "Turf" 
  | "Dirt"

export type TrackLength = 
  | "Short" 
  | "Mile" 
  | "Medium" 
  | "Long"

export const TRACK_DIRECTIONS = ["Left", "Right", "Straight"] as const
export type TrackDirection = (typeof TRACK_DIRECTIONS)[number]

export const TRACK_WEATHER = ["Sunny", "Cloudy", "Rainy", "Snowy"] as const
export type TrackWeather = (typeof TRACK_WEATHER)[number]

export const TRACK_SEASONS = ["Spring", "Summer", "Autumn", "Winter"] as const
export type TrackSeason = (typeof TRACK_SEASONS)[number]

export const TRACK_CONDITIONS = ["Firm", "Good", "Yielding", "Soft", "Heavy"] as const
export type TrackCondition = (typeof TRACK_CONDITIONS)[number]


export type CM = {
  number: number
  name: string
  track: string
  surface: TrackSurface
  distance: number
  length: TrackLength
  direction: TrackDirection
  weather: TrackWeather
  season: TrackSeason
  condition: TrackCondition
  

// CM PARTICIPANTS & RESULTS
  league?: CMLeague
  phase: CMPhase
  participants: CMUma[]
  currentLineup: string[]
  attempts: CMAttempt[]
  finalResults?: CMFinalUmaResult[]
  log: CMLogEntry[]
  notes?: string
  finalPlace: string
  
}
export type CMPhase =
  | "attempts"
  | "finalLineup"
  | "finalResult"
  | "completed"
  | "eliminated"

  export type CMLeague =
  | "Open League"
  | "Graded League"

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

export type LoHUma = {
  umaId: string
  races: number
  wins: number
  top3Finishes: number
}

export type LoH = {
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
