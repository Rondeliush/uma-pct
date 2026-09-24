export type UmaStyle =
  | "Runaway"
  | "Front Runner"
  | "Pace Chaser"
  | "Late Surger"
  | "End Closer"

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
  style: UmaStyle
  ace: boolean
  debuffer: boolean
  won: boolean
  autoRun: boolean
  finalParticipant: boolean
}

export type CMAttemptUmaResult = {
  cmUmaId: string
  wins: number
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

export type TrackDirection = 
  | "Left" 
  | "Right" 
  | "Straight"

export type TrackWeather = 
  | "Sunny" 
  | "Cloudy" 
  | "Rainy" 
  | "Snowy"

export type TrackSeason = 
  | "Spring" 
  | "Summer" 
  | "Autumn" 
  | "Winter"

export type TrackCondition = 
  | "Firm" 
  | "Good" 
  | "Yielding" 
  | "Soft" 
  | "Heavy"


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