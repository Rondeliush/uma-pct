import { useState } from "react"
import type { CM } from "../types/types"
import { useUmaDatabase } from "../context/UmaDatabaseContext"
import UmaAvatarImage from "../components/UmaAvatarImage"
import {
  calculateFinalQualificationFromAttempts,
  calculateRound2GroupFromAttempts,
} from "./CMCalculations"

type CMLogProps = {
  cm: CM
}

function CMLog({ cm }: CMLogProps) {
  const { versions } = useUmaDatabase()

  const [activeLogTab, setActiveLogTab] =
    useState<"changeLog" | "raceHistory">("raceHistory")

  const finalQualification =
    calculateFinalQualificationFromAttempts(cm.attempts)

  const round2Group =
    calculateRound2GroupFromAttempts(cm.attempts)

  const finalParticipants = cm.participants.filter(
    (participant) => participant.finalParticipant
  )

  const rounds = [
    {
      title: "Round 1",
      days: [1, 2] as const,
    },
    {
      title: "Round 2",
      days: [3, 4] as const,
    },
  ]

  const getRoundStats = (days: readonly number[]) => {
  const attempts = cm.attempts.filter((attempt) =>
    days.includes(attempt.day)
  )

  const wins = attempts.reduce(
    (total, attempt) =>
      total +
      attempt.umaWins.reduce(
        (sum, uma) => sum + uma.wins,
        0
      ),
    0
  )

  const races = attempts.reduce(
    (total, attempt) =>
      total + attempt.racesPlayed,
    0
  )

  const winRate =
    races > 0
      ? (wins / races) * 100
      : null

  return {
    wins,
    races,
    winRate,
  }
}

  return (
  <div className="px-5 py-5">
      

            {/* LOG TABS */}
            <div className="mx-auto flex max-w-[460px] border-b border-white/[0.07]">
              <button
                type="button"
                onClick={() => setActiveLogTab("changeLog")}
                className={`relative flex h-10 flex-1 items-center justify-center text-sm font-bold transition ${
                  activeLogTab === "changeLog"
                    ? "text-cyan-200"
                    : "text-blue-100/40 hover:text-blue-100/75"
                }`}
              >
                Change Log

                {activeLogTab === "changeLog" && (
                  <div className="absolute bottom-0 left-1/2 h-[2px] w-20 -translate-x-1/2 bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.35)]" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveLogTab("raceHistory")}
                className={`relative flex h-10 flex-1 items-center justify-center text-sm font-bold transition ${
                  activeLogTab === "raceHistory"
                    ? "text-cyan-200"
                    : "text-blue-100/40 hover:text-blue-100/75"
                }`}
              >
                Race History

                {activeLogTab === "raceHistory" && (
                  <div className="absolute bottom-0 left-1/2 h-[2px] w-20 -translate-x-1/2 bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.35)]" />
                )}
              </button>
            </div>

            {activeLogTab === "raceHistory" && (

        <div className="cm-scrollbar mt-4 max-h-[55vh] space-y-7 overflow-y-auto pr-2">
        {rounds.map((round) => {
                const stats = getRoundStats(round.days)

                return (
                    <div
                    key={round.title}
                    className={round.title === "Round 2" ? "pt-2" : ""}
                    >


                    {/* ROUND */}
            <div className="mb-3 flex items-end justify-between">
              <div>
                <div
                  className={`text-lg font-black ${
                    round.title === "Round 2"
                      ? "text-violet-300"
                      : "text-cyan-300"
                  }`}
                >
                  {round.title}
                </div>

                {round.title === "Round 2" && (
                  <div className="mt-0.5 text-[11px] font-bold text-violet-200/45">
                    Group {round2Group}
                  </div>
                )}
              </div>

              <div className="text-right">
                <div className="text-[9px] font-black uppercase tracking-[0.14em] text-blue-100/30">
                  Round Record
                </div>

                <div className="mt-0.5 text-xs font-bold text-blue-100/65">
                  {stats.wins} / {stats.races}
                  <span className="mx-1.5 text-blue-100/20">·</span>
                  {stats.winRate === null
                    ? "— WR"
                    : `${stats.winRate.toFixed(2)}% WR`}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {round.days.map((day) => {
                const dayAttempts = cm.attempts
                  .filter((attempt) => attempt.day === day)
                  .sort(
                    (a, b) =>
                      a.attempt - b.attempt
                  )

                return (
                  <div key={day}>
                    {/* DAY */}
                    <div
                    className={`mb-3 border-b border-white/[0.07] pb-2 text-sm font-black ${
                      round.title === "Round 2"
                        ? "text-violet-300"
                        : "text-cyan-300"
                    }`}
                  >
                    Day {day}
                  </div>

                    {dayAttempts.length === 0 ? (
                      <div className="text-sm text-gray-500">
                        No attempts.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {dayAttempts.map((attempt) => {
                          const totalWins =
                            attempt.umaWins.reduce(
                              (sum, uma) =>
                                sum + uma.wins,
                              0
                            )

                          return (
                            <div
                                key={`${day}-${attempt.attempt}`}
                                className={`rounded-lg border px-3 py-2.5 ${
                                  round.title === "Round 2"
                                    ? "border-violet-400/15 bg-violet-400/[0.02]"
                                    : "border-cyan-400/15 bg-cyan-400/[0.02]"
                                }`}
                              >
                                {/* ATTEMPT HEADER */}
                                <div className="flex items-center justify-between gap-4">
                                  <div className="flex items-center gap-2.5">
                                    <span className="text-sm font-black text-white">
                                      Attempt {attempt.attempt}
                                    </span>

                                    {attempt.retired && (
                                      <span className="rounded-md border border-amber-400/20 bg-amber-400/[0.05] px-2 py-0.5 text-[10px] font-bold text-amber-200/70">
                                        Retired
                                      </span>
                                    )}
                                  </div>

                                  <div className="text-xs font-bold text-blue-100/60">
                                    {attempt.racesPlayed === 0
                                      ? "No races played"
                                      : `${totalWins} ${
                                          totalWins === 1 ? "Win" : "Wins"
                                        } / ${attempt.racesPlayed} ${
                                          attempt.racesPlayed === 1
                                            ? "Race"
                                            : "Races"
                                        }`}
                                  </div>
                                </div>

                                {/* UMAS */}
                                <div className="mt-2.5 grid grid-cols-3 overflow-hidden rounded-md border border-white/[0.06] bg-black/10">
                                  {attempt.umaWins.map((result, index) => {
                                    const participant = cm.participants.find(
                                      (item) => item.cmUmaId === result.cmUmaId
                                    )

                                    if (!participant) {
                                      return null
                                    }

                                    const version = versions.find(
                                      (item) => item.id === participant.umaId
                                    )

                                    if (!version) {
                                      return null
                                    }

                                    return (
                                      <div
                                        key={result.cmUmaId}
                                        className={`flex min-w-0 items-center gap-2.5 px-3 py-2 ${
                                          index > 0 ? "border-l border-white/[0.06]" : ""
                                        }`}
                                      >
                                        {/* AVATAR */}
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-black/20">
                                          {version.avatar ? (
                                            <UmaAvatarImage
                                              avatar={version.avatar}
                                              alt={version.displayName}
                                              className="h-full w-full object-contain"
                                            />
                                          ) : (
                                            <span className="font-bold text-blue-100/20">
                                              ?
                                            </span>
                                          )}
                                        </div>

                                        {/* UMA INFO */}
                                        <div className="min-w-0">
                                          <div className="truncate text-sm font-bold text-white/90">
                                            {version.displayName}
                                          </div>

                                          <div className="mt-0.5 text-xs font-medium text-blue-100/40">
                                            {attempt.racesPlayed === 0
                                              ? "—"
                                              : `${result.wins} ${
                                                  result.wins === 1
                                                    ? "Win"
                                                    : "Wins"
                                                }`}
                                          </div>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
            )
            })}

            {/* FINAL */}
<div className="pt-4">
  <div className="mb-4 flex items-end justify-between">
    <div>
      <div className="text-lg font-black text-amber-300">
        Final
      </div>

      {cm.phase !== "eliminated" && finalParticipants.length > 0 && (
        <div className="mt-0.5 text-[11px] font-bold text-amber-200/45">
          {finalQualification}
        </div>
      )}
    </div>

    {cm.phase !== "eliminated" && finalParticipants.length > 0 && (
      <div className="text-right">
        <div className="text-[9px] font-black uppercase tracking-[0.14em] text-blue-100/30">
          Final Result
        </div>

        <div
          className={`mt-0.5 text-sm font-black ${
            cm.finalPlace === "1st"
              ? "text-amber-300"
              : cm.finalPlace === "2nd"
                ? "text-slate-200"
                : cm.finalPlace === "3rd"
                  ? "text-orange-300"
                  : "text-blue-100/50"
          }`}
        >
          {cm.finalPlace !== ""
            ? cm.finalPlace
            : "Pending"}
        </div>
      </div>
    )}
  </div>

  {cm.phase === "eliminated" ? (
    <div className="border-l-2 border-red-400/45 bg-gradient-to-r from-red-500/[0.05] via-red-950/[0.02] to-transparent px-4 py-3">
      <div className="text-[9px] font-black uppercase tracking-[0.16em] text-red-200/45">
        Final Status
      </div>

      <div className="mt-0.5 text-sm font-black text-red-200">
        Eliminated
      </div>

      <div className="mt-0.5 text-xs text-red-100/45">
        Did not qualify for the Final.
      </div>
    </div>
  ) : finalParticipants.length === 0 ? (
    <div className="py-3 text-xs font-medium text-blue-100/30">
      Final not played.
    </div>
  ) : (
    <div className="rounded-lg border border-amber-400/15 bg-amber-400/[0.02] px-3 py-2.5">
      <div className="grid grid-cols-3 overflow-hidden rounded-md border border-white/[0.06] bg-black/10">
        {finalParticipants.map((participant, index) => {
          const version = versions.find(
            (item) => item.id === participant.umaId
          )

          if (!version) {
            return null
          }

          return (
            <div
              key={participant.cmUmaId}
              className={`relative flex min-w-0 items-center gap-2.5 px-3 py-2 ${
                index > 0
                  ? "border-l border-white/[0.06]"
                  : ""
              } ${
                participant.won
                  ? "bg-amber-300/[0.035]"
                  : ""
              }`}
            >
              {/* AVATAR */}
              <div
                className={`relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-black/20 ${
                  participant.won
                    ? "ring-1 ring-amber-300/60"
                    : ""
                }`}
              >
                {version.avatar ? (
                  <UmaAvatarImage
                    avatar={version.avatar}
                    alt={version.displayName}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <span className="font-bold text-blue-100/20">
                    ?
                  </span>
                )}
              </div>

              {/* UMA INFO */}
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-1.5">
                  <div className="truncate text-sm font-bold text-white/90">
                    {version.displayName}
                  </div>

                  {participant.won && (
                    <svg
                      viewBox="0 0 32 24"
                      className="h-3.5 w-4.5 shrink-0 text-yellow-300 drop-shadow-[0_0_4px_rgba(250,204,21,0.55)]"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M4 19h24l2-12-7 5-7-9-7 9-7-5 2 12Zm2 2h20v2H6v-2Z" />
                    </svg>
                  )}
                </div>

                <div
                  className={`mt-0.5 text-xs font-medium ${
                    participant.won
                      ? "text-amber-200/65"
                      : "text-blue-100/35"
                  }`}
                >
                  {participant.won ? "Winner" : "Finalist"}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )}
</div>
      </div>
    )}

    {activeLogTab === "changeLog" && (
  <div className="mt-4">
    {cm.log.length === 0 ? (
      <div className="py-10 text-center text-sm font-medium text-blue-100/30">
        No changes recorded yet.
      </div>
    ) : (
      <div className="cm-scrollbar max-h-[55vh] overflow-y-auto pr-2">
        <div className="relative">

          <div className="space-y-1">
            {cm.log.map((entry) => {
              const logStyle = (() => {
                switch (entry.type) {
                  case "created":
                  case "lineupUpdated":
                    return {
                      accent: "text-cyan-300",
                      dot: "border-cyan-300/40 bg-cyan-400/10",
                      detail: "border-cyan-300/15",
                    }

                  case "trackUpdated":
                  case "umaUpdated":
                    return {
                      accent: "text-blue-300",
                      dot: "border-blue-300/40 bg-blue-400/10",
                      detail: "border-blue-300/15",
                    }

                  case "attemptAdded":
                    return {
                      accent: "text-emerald-300",
                      dot: "border-emerald-300/40 bg-emerald-400/10",
                      detail: "border-emerald-300/15",
                    }

                  case "attemptEdited":
                    return {
                      accent: "text-amber-300",
                      dot: "border-amber-300/40 bg-amber-400/10",
                      detail: "border-amber-300/15",
                    }

                  case "qualificationUpdated":
                    return {
                      accent: "text-violet-300",
                      dot: "border-violet-300/40 bg-violet-400/10",
                      detail: "border-violet-300/15",
                    }

                  case "proceededToFinal":
                  case "finalLineupSet":
                  case "finalPlaceUpdated":
                  case "winnerSelected":
                    return {
                      accent: "text-yellow-300",
                      dot: "border-yellow-300/45 bg-yellow-400/10",
                      detail: "border-yellow-300/15",
                    }

                  case "completed":
                    return {
                      accent: "text-emerald-300",
                      dot: "border-emerald-300/45 bg-emerald-400/10",
                      detail: "border-emerald-300/15",
                    }

                  case "eliminated":
                    return {
                      accent: "text-red-300",
                      dot: "border-red-300/45 bg-red-400/10",
                      detail: "border-red-300/15",
                    }

                  default:
                    return {
                      accent: "text-blue-100/65",
                      dot: "border-white/15 bg-white/[0.04]",
                      detail: "border-white/10",
                    }
                }
              })()

              const logIcon = (() => {
                const iconClass = "h-4 w-4"

                if (entry.type === "attemptAdded") {
                  return (
                    <svg
                      viewBox="0 0 24 24"
                      className={iconClass}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M5 19V5" />
                      <path d="M5 6h11l-2 4 2 4H5" />
                    </svg>
                  )
                }

                if (entry.type === "attemptEdited") {
                  return (
                    <svg
                      viewBox="0 0 24 24"
                      className={iconClass}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />
                    </svg>
                  )
                }

                if (entry.type === "qualificationUpdated") {
                  return (
                    <svg
                      viewBox="0 0 24 24"
                      className={iconClass}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="8" />
                      <circle cx="12" cy="12" r="3" />
                      <path d="M12 2v3M22 12h-3M12 22v-3M2 12h3" />
                    </svg>
                  )
                }

                if (
                  entry.type === "finalLineupSet" ||
                  entry.type === "finalPlaceUpdated" ||
                  entry.type === "winnerSelected" ||
                  entry.type === "proceededToFinal"
                ) {
                  return (
                    <svg
                      viewBox="0 0 32 24"
                      className={iconClass}
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M4 19h24l2-12-7 5-7-9-7 9-7-5 2 12Zm2 2h20v2H6v-2Z" />
                    </svg>
                  )
                }

                if (entry.type === "completed") {
                  return (
                    <svg
                      viewBox="0 0 24 24"
                      className={iconClass}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="9" />
                      <path d="m8 12 2.5 2.5L16 9" />
                    </svg>
                  )
                }

                if (entry.type === "eliminated") {
                  return (
                    <svg
                      viewBox="0 0 24 24"
                      className={iconClass}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="9" />
                      <path d="m8 8 8 8" />
                    </svg>
                  )
                }

                if (
                  entry.type === "lineupUpdated" ||
                  entry.type === "umaUpdated"
                ) {
                  return (
                    <svg
                      viewBox="0 0 24 24"
                      className={iconClass}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <circle cx="9" cy="8" r="3" />
                      <path d="M3.5 18c.8-3.2 2.6-5 5.5-5s4.7 1.8 5.5 5" />
                      <circle cx="17" cy="9" r="2.5" />
                      <path d="M15.5 14c2.8 0 4.5 1.3 5 4" />
                    </svg>
                  )
                }

                if (entry.type === "trackUpdated") {
                return (
                  <svg
                    viewBox="0 0 24 24"
                    className={iconClass}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />
                  </svg>
                )
              }

                return (
                  <svg
                    viewBox="0 0 24 24"
                    className={iconClass}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                )
              })()

              return (
                <div
                  key={entry.id}
                  className="group relative flex gap-3 border-b border-white/[0.045] px-1 py-3 transition last:border-b-0 hover:bg-white/[0.018]"
                >
                  {/* TIMELINE ICON */}
                  <div
                    className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${logStyle.dot} ${logStyle.accent}`}
                  >
                    {logIcon}
                  </div>

                  {/* CONTENT */}
                  <div className="min-w-0 flex-1 pb-1">
                    <div className="flex items-start justify-between gap-4">
                      <div
                        className={`text-sm font-black ${logStyle.accent}`}
                      >
                        {entry.message}
                      </div>

                      <div className="shrink-0 pt-0.5 text-[10px] font-medium text-blue-100/25">
                        {new Date(entry.timestamp).toLocaleString()}
                      </div>
                    </div>

                    {entry.details && entry.details.length > 0 && (
                      <div
                        className={`mt-2 space-y-1 border-l pl-3 text-xs font-medium text-blue-100/45 ${logStyle.detail}`}
                      >
                        {entry.details.map((detail, index) => (
                          <div key={index}>
                            {detail}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )}
  </div>
)}
  </div>
  )
}

export default CMLog