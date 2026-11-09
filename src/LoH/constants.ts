export const LOH_LOG_ENTRY_TYPES = ["created", "eventUpdated", "lineupUpdated", "leagueRankUpdated", "raceSetSaved", "raceSetEdited", "raceSetDeleted", "completed"] as const
export const LOH_RACES_PER_SET = 5
export const LOH_LINEUP_SIZE = 3
export const LOH_MAIN_STAGE_DAYS = 6
export const LOH_TICKETS_PER_DAY = 5
export const LOH_TICKET_CAP = 10
export const LOH_EXTRA_STAGE_CUTOFF = 96
export const LOH_EVENT_RANDOM = "Random" as const

export const LOH_SHOWCASE_SLIDES = [
  {
    title: "Most LoH Wins",
    values: ["—", "—", "—"],
    umaIndexes: [0, 1, 2],
  },
  {
    title: "Most LoH Races",
    values: ["—", "—", "—"],
    umaIndexes: [0, 1, 2],
  },
  {
    title: "Most LoH Appearances",
    values: ["—", "—", "—"],
    umaIndexes: [0, 1, 2],
  },
  {
    title: "Most Top 3 Finishes",
    values: ["—", "—", "—"],
    umaIndexes: [0, 1, 2],
  },
]
