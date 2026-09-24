import { useState } from "react"
import type { CM } from "../types/types"
import type { Dispatch, SetStateAction } from "react"
import CMDayResults from "./CMDayResults"
import { useUmaDatabase } from "../context/UmaDatabaseContext"
import UmaAvatarImage from "../components/UmaAvatarImage"

import {
  getDayAttemptTotals,
  calculateDayWinRateFromAttempts,
  calculateRoundWinRateFromAttempts,
  calculateOverallWinRateFromAttempts,
  calculateRound2GroupFromAttempts,
  calculateFinalQualificationFromAttempts,
} from "./CMCalculations"

type CMResultsProps = {
  cm: CM
  setCms: Dispatch<SetStateAction<CM[]>>
}

function CMResults({ cm, setCms }: CMResultsProps) {
  const { versions } = useUmaDatabase()

  const [isDay1Expanded, setIsDay1Expanded] = useState(false)
  const [isDay2Expanded, setIsDay2Expanded] = useState(false)
  const [isDay3Expanded, setIsDay3Expanded] = useState(false)
  const [isDay4Expanded, setIsDay4Expanded] = useState(false)

  const [confirmationAction, setConfirmationAction] =
    useState<"proceed" | "end" | null>(null)

  const attempts = cm.attempts ?? []

  const round2Group = calculateRound2GroupFromAttempts(attempts)
  const finalQualification =
    calculateFinalQualificationFromAttempts(attempts)

  const displayedFinalQualification =
    cm.phase === "eliminated" ? "Eliminated" : finalQualification

  const qualifiedForFinal =
    finalQualification === "Final A" || finalQualification === "Final B"

  const round2Attempts = attempts.filter(
    (attempt) => attempt.day === 3 || attempt.day === 4
  )

  const remainingRound2Attempts = Math.max(
    0,
    8 - round2Attempts.length
  )

  const allRound2AttemptsUsed = remainingRound2Attempts === 0

  const day1Results = getDayAttemptTotals(attempts, 1)
  const day2Results = getDayAttemptTotals(attempts, 2)
  const day3Results = getDayAttemptTotals(attempts, 3)
  const day4Results = getDayAttemptTotals(attempts, 4)

  const day1WinRate = calculateDayWinRateFromAttempts(attempts, 1)
  const day2WinRate = calculateDayWinRateFromAttempts(attempts, 2)
  const day3WinRate = calculateDayWinRateFromAttempts(attempts, 3)
  const day4WinRate = calculateDayWinRateFromAttempts(attempts, 4)

  const round1WinRate = calculateRoundWinRateFromAttempts(
    attempts,
    [1, 2]
  )

  const round2WinRate = calculateRoundWinRateFromAttempts(
    attempts,
    [3, 4]
  )

  const overallWinRate = calculateOverallWinRateFromAttempts(cm)

  const formatWinRate = (winRate: number | null) => {
    if (winRate === null) {
      return "—"
    }

    return `${winRate.toFixed(2)}%`
  }

  const proceedToFinal = () => {
    setConfirmationAction(null)

    setCms((current) =>
      current.map((item) => {
        if (item.number !== cm.number) {
          return item
        }

        const itemFinalQualification =
          calculateFinalQualificationFromAttempts(item.attempts)

        return {
          ...item,
          phase: "finalLineup",
          log: [
            ...(item.log ?? []),
            {
              id: `cm${item.number}-proceed-final-${Date.now()}`,
              timestamp: new Date().toISOString(),
              type: "proceededToFinal",
              message: `Proceeded to ${itemFinalQualification}.`,
            },
          ],
        }
      })
    )
  }

  const endCM = () => {
    setConfirmationAction(null)

    setCms((current) =>
      current.map((item) => {
        if (item.number !== cm.number) {
          return item
        }

        return {
          ...item,
          phase: "eliminated",
          log: [
            ...(item.log ?? []),
            {
              id: `cm${item.number}-eliminated-${Date.now()}`,
              timestamp: new Date().toISOString(),
              type: "eliminated",
              message: "CM ended — Eliminated.",
            },
          ],
        }
      })
    )
  }

  const handleProceedToFinal = () => {
    if (!qualifiedForFinal) {
      return
    }

    if (!allRound2AttemptsUsed) {
      setConfirmationAction("proceed")
      return
    }

    proceedToFinal()
  }

  const handleEndCM = () => {
    if (finalQualification !== "Not qualified yet") {
      return
    }

    if (!allRound2AttemptsUsed) {
      setConfirmationAction("end")
      return
    }

    endCM()
  }

  const finalParticipants = cm.participants.filter(
    (participant) => participant.finalParticipant
  )

  const selectedWinnerId =
    cm.participants.find((participant) => participant.won)?.cmUmaId ?? ""

  const canCompleteCM =
    cm.phase === "finalResult" &&
    cm.finalPlace !== "" &&
    (cm.finalPlace !== "1st" || selectedWinnerId !== "")

  const currentLineupParticipants = (cm.currentLineup ?? []).flatMap(
    (cmUmaId) => {
      const participant = cm.participants.find(
        (item) => item.cmUmaId === cmUmaId
      )

      return participant ? [participant] : []
    }
  )

  const bannerParticipants =
    finalParticipants.length > 0
      ? finalParticipants
      : currentLineupParticipants

  const hasFinalResult =
    (cm.phase === "finalResult" || cm.phase === "completed") &&
    cm.finalPlace !== ""

  const isChampion = hasFinalResult && cm.finalPlace === "1st"
  const isSecond = hasFinalResult && cm.finalPlace === "2nd"
  const isEliminated = cm.phase === "eliminated"

  const winnerBannerParticipant = bannerParticipants.find(
    (participant) => participant.won
  )

  const nonWinnerBannerParticipants = bannerParticipants.filter(
    (participant) => !participant.won
  )

  const displayedBannerParticipants =
    isChampion && winnerBannerParticipant
      ? [
          nonWinnerBannerParticipants[0],
          winnerBannerParticipant,
          nonWinnerBannerParticipants[1],
        ].flatMap((participant) => (participant ? [participant] : []))
      : bannerParticipants.slice(0, 3)

  const progressStatus =
    cm.phase === "finalLineup"
      ? "Final Lineup"
      : cm.phase === "finalResult"
        ? "Final Round"
        : qualifiedForFinal
          ? `Qualified for ${finalQualification}`
          : "Rounds Ongoing"

  const handleCompleteCM = () => {
    if (!canCompleteCM) {
      return
    }

    setCms((current) =>
      current.map((item) => {
        if (item.number !== cm.number) {
          return item
        }

        return {
          ...item,
          phase: "completed",
          log: [
            ...(item.log ?? []),
            {
              id: `cm${item.number}-completed-${Date.now()}`,
              timestamp: new Date().toISOString(),
              type: "completed",
              message: "CM completed.",
            },
          ],
        }
      })
    )
  }
const avatarFadeMask = {
  WebkitMaskImage:
    "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.45) 3%, black 8%, black 80%, rgba(0,0,0,0.95) 86%, rgba(0,0,0,0.65) 92%, rgba(0,0,0,0.2) 97%, transparent 100%)",
  maskImage:
    "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.45) 3%, black 8%, black 80%, rgba(0,0,0,0.95) 86%, rgba(0,0,0,0.65) 92%, rgba(0,0,0,0.2) 97%, transparent 100%)",
}

const avatarSideFadeMask = {
  WebkitMaskImage:
    "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.45) 4%, black 10%, black 90%, rgba(0,0,0,0.45) 96%, transparent 100%)",
  maskImage:
    "linear-gradient(to right, transparent 0%, rgba(0,0,0,0.45) 4%, black 10%, black 90%, rgba(0,0,0,0.45) 96%, transparent 100%)",
}

  return (
    <div>
      {/* ======================================= */}
      {/* CHAMPIONS MEETING STATUS / FINAL RESULT */}
      {/* ======================================= */}

      <section className="relative min-h-[390px] overflow-visible">

        {/* FINAL BANNER BACKGROUND */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 bottom-[-55px] bg-cover bg-center"
          style={{
            backgroundImage:
              `url("${import.meta.env.BASE_URL}cm-background.jpg")`,

            WebkitMaskImage:
              "linear-gradient(to bottom, black 0%, black 70%, rgba(0,0,0,0.98) 76%, rgba(0,0,0,0.88) 82%, rgba(0,0,0,0.62) 89%, rgba(0,0,0,0.28) 95%, transparent 100%)",

            maskImage:
              "linear-gradient(to bottom, black 0%, black 70%, rgba(0,0,0,0.98) 76%, rgba(0,0,0,0.88) 82%, rgba(0,0,0,0.62) 89%, rgba(0,0,0,0.28) 95%, transparent 100%)",
          }}
        />

        {/* BACKGROUND SHADING */}
        <div
          className={`pointer-events-none absolute inset-0 ${
            isChampion
              ? "bg-gradient-to-b from-amber-950/8 via-transparent to-transparent"
              : isEliminated
                ? "bg-[#020611]/55"
                : "bg-gradient-to-b from-blue-950/10 via-transparent to-transparent"
          }`}
        />

        {/* OVERALL WIN RATE - TOP RIGHT */}
        <div className="absolute right-5 top-4 z-30 text-right">
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200/55">
            Overall Win Rate
          </div>
          <div className="mt-0.5 text-2xl font-black tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.55)]">
            {formatWinRate(overallWinRate)}
          </div>
        </div>

        <div className="relative z-10 flex min-h-[390px] flex-col px-6 pb-3 pt-4">
          {hasFinalResult ? (
            <>
              {/* RESULT TITLE */}
              <div className="text-center">
                <div
                  className={`text-[11px] font-black uppercase tracking-[0.28em] ${
                    isChampion
                      ? "text-amber-200/90"
                      : isSecond
                        ? "text-slate-200/80"
                        : "text-orange-200/80"
                  }`}
                >
                  Final Result
                </div>

                <div className="mt-1 text-sm font-bold text-blue-100/65">
                  {displayedFinalQualification}
                </div>

                <div
                  className={`mt-0.5 text-7xl font-black tracking-tight drop-shadow-[0_4px_15px_rgba(0,0,0,0.65)] ${
                    isChampion
                      ? "text-amber-300"
                      : isSecond
                        ? "text-slate-100"
                        : "text-orange-300"
                  }`}
                >
                  {cm.finalPlace}
                </div>
              </div>

              {/* FINAL LINEUP - FREE STANDING AVATARS */}
              <div className="mx-auto mt-auto flex h-[220px] w-full max-w-[560px] translate-y-8 items-end justify-center gap-0 pt-2">
                {displayedBannerParticipants.map((participant) => {
                  const version = versions.find(
                    (item) => item.id === participant.umaId
                  )

                  const isWinner = isChampion && participant.won

                  return (
                    <div
                      key={participant.cmUmaId}
                      className={`relative flex h-full w-[165px] shrink-0 items-end justify-center transition-transform ${
                        isWinner
                          ? "z-30 -translate-y-5 scale-[1.14]"
                          : "z-20 scale-100"
                      }`}
                    >
                      {isWinner && (
                      <div
                        className="pointer-events-none absolute bottom-[-10px] left-1/2 z-0 h-[225px] w-[215px] -translate-x-1/2 rounded-[50%]"
                        style={{
                          background:
                            "radial-gradient(ellipse at center, rgba(3,10,28,0.68) 0%, rgba(3,10,28,0.46) 42%, rgba(3,10,28,0.18) 62%, transparent 78%)",
                          filter: "blur(10px)",
                        }}
                      />
                    )}
                      {isWinner && (
                      <div className="pointer-events-none absolute left-1/2 top-[-20px] z-40 -translate-x-1/2">
                        <div className="absolute left-1/2 top-1/2 h-7 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#020611]/45 blur-[4px]" />
                        <svg
                          viewBox="0 0 32 24"
                          className="relative h-6 w-8 text-yellow-300 drop-shadow-[0_0_7px_rgba(250,204,21,0.75)]"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path d="M4 19h24l2-12-7 5-7-9-7 9-7-5 2 12Zm2 2h20v2H6v-2Z" />
                        </svg>
                      </div>
                    )}

                      {version?.avatar ? (
                        <div
                        className={`absolute bottom-0 left-1/2 z-10 overflow-hidden -translate-x-1/2 ${
                        isWinner
                          ? "h-[205px] w-[200px]"
                          : "h-[180px] w-[180px]"
                      }`}
                        style={avatarFadeMask}
                      >
                        <div
                          className="absolute inset-0"
                          style={avatarSideFadeMask}
                        >

                        <UmaAvatarImage
                          avatar={version.avatar}
                          alt={version.displayName}
                          className={`absolute left-1/2 top-0 max-w-none -translate-x-1/2 object-contain object-top ${
                            isWinner
                              ? "h-[300px]"
                              : "h-[260px]"
                          }`}
                          style={{
                            filter: isWinner
                              ? "drop-shadow(0 0 1px #fde047) drop-shadow(0 0 3px rgba(250,204,21,0.85)) drop-shadow(0 0 7px rgba(250,204,21,0.45))"
                              : undefined,
                          }}
                        />
                      </div>
                      </div>
                      ) : (
                        <div className="absolute bottom-8 text-6xl text-white/15">
                          ♞
                        </div>
                      )}

                    </div>
                  )
                })}
              </div>
            </>
          ) : isEliminated ? (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full border border-slate-300/15 bg-slate-300/[0.04] text-slate-300/40">
                <svg
                  viewBox="0 0 24 24"
                  className="h-10 w-10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" />
                  <path d="M8 6H5v2a4 4 0 0 0 4 4" />
                  <path d="M16 6h3v2a4 4 0 0 1-4 4" />
                  <path d="M12 13v4" />
                  <path d="M8 21h8" />
                  <path d="M6 3l12 18" />
                </svg>
              </div>

              <div className="mt-4 text-[11px] font-black uppercase tracking-[0.25em] text-slate-300/45">
                Final Result
              </div>

              <div className="mt-2 text-4xl font-black text-slate-200/80">
                Not Qualified
              </div>

              <div className="mt-2 text-sm font-semibold text-blue-100/45">
                Eliminated from this Champions Meeting
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center text-center">


              <div className="mt-2 bg-gradient-to-r from-cyan-200 via-white to-blue-200 bg-clip-text text-5xl font-black tracking-tight text-transparent drop-shadow-[0_4px_15px_rgba(0,0,0,0.65)]">
                CM IN PROGRESS
              </div>

              <div className="mt-3 rounded-lg border border-cyan-300/20 bg-cyan-400/[0.05] px-4 py-2 text-sm font-black text-cyan-200">
                {progressStatus}
              </div>

              {bannerParticipants.length > 0 && (
              <div className="mx-auto mt-auto flex h-[200px] w-full max-w-[560px] translate-y-8 items-end justify-center gap-0">
                {bannerParticipants.slice(0, 3).map((participant) => {
                  const version = versions.find(
                    (item) => item.id === participant.umaId
                  )

                  return (
                    <div
                      key={participant.cmUmaId}
                      className="relative flex h-full w-[165px] shrink-0 items-end justify-center"
                    >
                      {version?.avatar ? (
                        <div
                          className="absolute bottom-0 left-1/2 h-[180px] w-[180px] -translate-x-1/2 overflow-hidden"
                          style={avatarFadeMask}
                        >
                          <div
                          className="absolute inset-0"
                          style={avatarSideFadeMask}
                        >
                          
                          <UmaAvatarImage
                            avatar={version.avatar}
                            alt={version.displayName}
                            className="absolute left-1/2 top-0 h-[260px] max-w-none -translate-x-1/2 object-contain object-top"
                          />
                        </div>
                        </div>
                      ) : (
                        <div className="absolute bottom-8 text-6xl text-white/15">
                          ♞
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
            </div>
          )}
        </div>
      </section>

      {/* ======================================= */}
      {/* ROUND RESULTS */}
      {/* ======================================= */}

     <div className="relative z-20 grid min-w-0 grid-cols-1 items-start gap-3 px-5 pb-1 pt-3 lg:grid-cols-2">

        {/* ======================================= */}
        {/* ROUND 1 */}
        {/* ======================================= */}

        <section className="relative min-w-0 overflow-hidden rounded-2xl border border-sky-500/45 bg-[#061426]/75 shadow-[0_0_18px_rgba(14,165,233,0.10),inset_0_0_18px_rgba(14,165,233,0.025)]">
          {/* HEADER */}
          <div className="flex items-center justify-between border-b border-sky-500/15 px-4 py-3">
            <div className="flex items-center gap-3">

              <div>
                <div className="text-lg font-black text-cyan-300">
                  Round 1
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-blue-200/35">
                Win Rate
              </div>

              <div className="mt-0.5 text-lg font-black text-white">
                {formatWinRate(round1WinRate)}
              </div>
            </div>
          </div>

          {/* DAYS */}
          <div className="space-y-2 p-3">
            {/* DAY 1 */}
            <div className="overflow-hidden rounded-xl border border-blue-400/10 bg-[#071426]/65">
              <div className="flex min-h-[48px] items-center justify-between gap-4 px-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="text-cyan-300/80">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <rect
                        x="3.5"
                        y="5"
                        width="17"
                        height="15"
                        rx="2.5"
                      />
                      <path d="M3.5 9h17" />
                      <path d="M8 3v4" />
                      <path d="M16 3v4" />
                    </svg>
                  </div>

                  <span className="text-sm font-bold text-white/90">
                    Day 1
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-sm font-semibold text-blue-100/80">
                    {day1WinRate === null
                      ? "—"
                      : `${formatWinRate(day1WinRate)} | ${day1Results.join("-")}`}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const next = !isDay1Expanded
                      setIsDay1Expanded(next)

                      if (next) {
                        setIsDay2Expanded(false)
                      }
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-sky-400/20 bg-sky-400/[0.04] text-cyan-300/75 transition hover:border-sky-300/40 hover:bg-sky-400/[0.08] hover:text-cyan-200"
                    title={
                      isDay1Expanded ? "Hide attempts" : "Show attempts"
                    }
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className={`h-4 w-4 transition-transform duration-200 ${
                        isDay1Expanded ? "rotate-90" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="m9 5 7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>

              {isDay1Expanded && (
                <div className="border-t border-sky-400/10 px-3 pb-3">
                  <CMDayResults cm={cm} day={1} setCms={setCms} />
                </div>
              )}
            </div>

            {/* DAY 2 */}
            <div className="overflow-hidden rounded-xl border border-blue-400/10 bg-[#071426]/65">
              <div className="flex min-h-[48px] items-center justify-between gap-4 px-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="text-cyan-300/80">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <rect
                        x="3.5"
                        y="5"
                        width="17"
                        height="15"
                        rx="2.5"
                      />
                      <path d="M3.5 9h17" />
                      <path d="M8 3v4" />
                      <path d="M16 3v4" />
                    </svg>
                  </div>

                  <span className="text-sm font-bold text-white/90">
                    Day 2
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-sm font-semibold text-blue-100/80">
                    {day2WinRate === null
                      ? "—"
                      : `${formatWinRate(day2WinRate)} | ${day2Results.join("-")}`}
                  </div>

                  <button
                    onClick={() => {
                    const next = !isDay2Expanded
                    setIsDay2Expanded(next)

                    if (next) {
                      setIsDay1Expanded(false)
                    }
                  }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-sky-400/20 bg-sky-400/[0.04] text-cyan-300/75 transition hover:border-sky-300/40 hover:bg-sky-400/[0.08] hover:text-cyan-200"
                    title={
                      isDay2Expanded ? "Hide attempts" : "Show attempts"
                    }
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className={`h-4 w-4 transition-transform duration-200 ${
                        isDay2Expanded ? "rotate-90" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="m9 5 7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>

              {isDay2Expanded && (
                <div className="border-t border-sky-400/10 px-3 pb-3">
                  <CMDayResults cm={cm} day={2} setCms={setCms} />
                </div>
              )}
            </div>
          </div>

        </section>

        {/* ======================================= */}
        {/* ROUND 2 */}
        {/* ======================================= */}

        <section className="relative min-w-0 overflow-hidden rounded-2xl border border-violet-500/45 bg-[#080d21]/75 shadow-[0_0_18px_rgba(139,92,246,0.10),inset_0_0_18px_rgba(139,92,246,0.025)]">
          {/* HEADER */}
          <div className="flex items-center justify-between border-b border-violet-400/15 px-4 py-3">
            <div className="flex items-center gap-3">
              <div>
                <div className="text-lg font-black text-violet-300">
                  Round 2
                </div>
              </div>
            </div>

            <div className="ml-auto mr-6 text-center">
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-violet-200/35">
                Group
              </div>

              <div className="mt-0.5 text-base font-black text-violet-200">
                Group {round2Group}
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-violet-200/35">
                Win Rate
              </div>

              <div className="mt-0.5 text-lg font-black text-white">
                {formatWinRate(round2WinRate)}
              </div>
            </div>
          </div>

          {/* DAYS */}
          <div className="space-y-2 p-3">
            {/* DAY 3 */}
            <div className="overflow-hidden rounded-xl border border-violet-400/10 bg-[#0a1028]/65">
              <div className="flex min-h-[48px] items-center justify-between gap-4 px-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="text-violet-300/80">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <rect
                        x="3.5"
                        y="5"
                        width="17"
                        height="15"
                        rx="2.5"
                      />
                      <path d="M3.5 9h17" />
                      <path d="M8 3v4" />
                      <path d="M16 3v4" />
                    </svg>
                  </div>

                  <span className="text-sm font-bold text-white/90">
                    Day 3
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-sm font-semibold text-blue-100/80">
                    {day3WinRate === null
                      ? "—"
                      : `${formatWinRate(day3WinRate)} | ${day3Results.join("-")}`}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const next = !isDay3Expanded
                      setIsDay3Expanded(next)

                      if (next) {
                        setIsDay4Expanded(false)
                      }
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-violet-400/20 bg-violet-400/[0.04] text-violet-300/75 transition hover:border-violet-300/40 hover:bg-violet-400/[0.08] hover:text-violet-200"
                    title={
                      isDay3Expanded ? "Hide attempts" : "Show attempts"
                    }
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className={`h-4 w-4 transition-transform duration-200 ${
                        isDay3Expanded ? "rotate-90" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="m9 5 7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>

              {isDay3Expanded && (
                <div className="border-t border-violet-400/10 px-3 pb-3">
                  <CMDayResults cm={cm} day={3} setCms={setCms} />
                </div>
              )}
            </div>

            {/* DAY 4 */}
            <div className="overflow-hidden rounded-xl border border-violet-400/10 bg-[#0a1028]/65">
              <div className="flex min-h-[48px] items-center justify-between gap-4 px-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="text-violet-300/80">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <rect
                        x="3.5"
                        y="5"
                        width="17"
                        height="15"
                        rx="2.5"
                      />
                      <path d="M3.5 9h17" />
                      <path d="M8 3v4" />
                      <path d="M16 3v4" />
                    </svg>
                  </div>

                  <span className="text-sm font-bold text-white/90">
                    Day 4
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-sm font-semibold text-blue-100/80">
                    {day4WinRate === null
                      ? "—"
                      : `${formatWinRate(day4WinRate)} | ${day4Results.join("-")}`}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                        const next = !isDay4Expanded
                        setIsDay4Expanded(next)

                        if (next) {
                          setIsDay3Expanded(false)
                        }
                      }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-violet-400/20 bg-violet-400/[0.04] text-violet-300/75 transition hover:border-violet-300/40 hover:bg-violet-400/[0.08] hover:text-violet-200"
                    title={
                      isDay4Expanded ? "Hide attempts" : "Show attempts"
                    }
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className={`h-4 w-4 transition-transform duration-200 ${
                        isDay4Expanded ? "rotate-90" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="m9 5 7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>

              {isDay4Expanded && (
                <div className="border-t border-violet-400/10 px-3 pb-3">
                  <CMDayResults cm={cm} day={4} setCms={setCms} />
                </div>
              )}
            </div>
          </div>

        </section>
      </div>

      {/* ======================================= */}
      {/* CURRENT ACTION */}
      {/* ======================================= */}

      {cm.phase === "attempts" && (
  <div className="mx-5 mt-3">
    {confirmationAction === null ? (
      <div className="flex min-h-[64px] items-center justify-between gap-5 border-l-2 border-cyan-400/45 bg-gradient-to-r from-cyan-400/[0.045] via-blue-400/[0.018] to-transparent px-4 py-2.5">
        <div className="min-w-0">
          <div className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-200/40">
            Current Status
          </div>

          <div className="mt-0.5 text-sm font-black text-white">
            {qualifiedForFinal
              ? `Qualified for ${finalQualification}`
              : "Champions Meeting in Progress"}
          </div>

          <div className="mt-0.5 text-[11px] font-medium text-blue-200/40">
            {round2Attempts.length === 0
              ? "Continue recording your race attempts"
              : remainingRound2Attempts > 0
                ? `${remainingRound2Attempts} Round 2 attempts remaining`
                : "All Round 2 attempts used"}
          </div>
        </div>

        {qualifiedForFinal ? (
          <button
            type="button"
            onClick={handleProceedToFinal}
            className="h-9 min-w-[170px] shrink-0 rounded-lg border border-cyan-300/35 bg-gradient-to-r from-sky-600/90 via-blue-600/90 to-violet-600/90 px-5 text-xs font-black text-white shadow-[0_0_12px_rgba(14,165,233,0.12)] transition hover:border-cyan-200/60 hover:brightness-110"
          >
            Proceed to Final
          </button>
        ) : (
          <button
            type="button"
            onClick={handleEndCM}
            className="h-9 min-w-[135px] shrink-0 rounded-lg border border-red-500/30 bg-red-950/45 px-5 text-xs font-black text-red-200 transition hover:border-red-400/55 hover:bg-red-900/60 hover:text-white"
          >
            End CM
          </button>
        )}
      </div>
    ) : (
      <div
        className={`flex min-h-[64px] items-center justify-between gap-5 border-l-2 px-4 py-2.5 ${
          confirmationAction === "proceed"
            ? "border-cyan-400/45 bg-gradient-to-r from-cyan-400/[0.045] via-blue-400/[0.018] to-transparent"
            : "border-red-400/45 bg-gradient-to-r from-red-500/[0.045] via-red-950/[0.02] to-transparent"
        }`}
      >
        <div className="min-w-0 flex-1">
          <div
            className={`text-[9px] font-black uppercase tracking-[0.18em] ${
              confirmationAction === "proceed"
                ? "text-cyan-200/40"
                : "text-red-200/45"
            }`}
          >
            Confirm Action
          </div>

          <div className="mt-0.5 text-xs font-medium leading-relaxed text-blue-100/65">
            {confirmationAction === "proceed" ? (
              round2Group === "A" &&
              finalQualification === "Final B" ? (
                <>
                  You are currently qualified for{" "}
                  <span className="font-black text-white">Final B</span>, but you
                  can still qualify for{" "}
                  <span className="font-black text-white">Final A</span>.
                  Proceeding will lock all remaining attempts.
                </>
              ) : (
                <>
                  You still have{" "}
                  <span className="font-black text-white">
                    {remainingRound2Attempts}
                  </span>{" "}
                  attempts remaining. Proceeding will lock all remaining
                  attempts.
                </>
              )
            ) : (
              <>
                You still have{" "}
                <span className="font-black text-white">
                  {remainingRound2Attempts}
                </span>{" "}
                attempts remaining. Ending the CM will eliminate you and lock
                all remaining attempts.
              </>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setConfirmationAction(null)}
            className="h-9 rounded-lg border border-white/10 bg-white/[0.025] px-4 text-xs font-bold text-blue-100/50 transition hover:border-white/20 hover:text-white"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={
              confirmationAction === "proceed"
                ? proceedToFinal
                : endCM
            }
            className={
              confirmationAction === "proceed"
                ? "h-9 rounded-lg border border-cyan-300/35 bg-gradient-to-r from-sky-600/90 via-blue-600/90 to-violet-600/90 px-5 text-xs font-black text-white transition hover:brightness-110"
                : "h-9 rounded-lg border border-red-500/35 bg-red-900/65 px-5 text-xs font-black text-red-100 transition hover:bg-red-800/80"
            }
          >
            {confirmationAction === "proceed"
              ? "Proceed to Final"
              : "End CM"}
          </button>
        </div>
      </div>
    )}
  </div>
)}
      {/* ======================================= */}
      {/* FINAL RESULT CONTROLS */}
      {/* ======================================= */}

      {cm.phase === "finalResult" && (
        <section className="mx-5 mt-3 border-l-2 border-violet-400/45 bg-gradient-to-r from-violet-400/[0.045] via-blue-400/[0.018] to-transparent px-4 py-3">
          <div className="mb-2 text-[9px] font-black uppercase tracking-[0.18em] text-violet-200/40">
          Final Result Setup
        </div>
          <div className="flex items-end gap-3">
            {/* FINAL PLACE */}
            <div>
              <div className="mb-1.5 text-xs font-bold text-violet-200/45">
                Final Place
              </div>

              <select
                value={cm.finalPlace}
                onChange={(event) => {
                  const finalPlace = event.target.value

                  setCms((current) =>
                    current.map((item) => {
                      if (item.number !== cm.number) {
                        return item
                      }

                      if (item.finalPlace === finalPlace) {
                        return item
                      }

                      const previousFinalPlace =
                        item.finalPlace || "Not set"

                      const newFinalPlace = finalPlace || "Not set"

                      return {
                        ...item,
                        finalPlace,
                        participants:
                          finalPlace === "1st"
                            ? item.participants
                            : item.participants.map((participant) => ({
                                ...participant,
                                won: false,
                              })),
                        log: [
                          ...(item.log ?? []),
                          {
                            id: `cm${item.number}-final-place-${Date.now()}`,
                            timestamp: new Date().toISOString(),
                            type: "finalPlaceUpdated",
                            message:
                              item.finalPlace === ""
                                ? "Final result set."
                                : "Final result updated.",
                            details: [
                              `Place: ${previousFinalPlace} → ${newFinalPlace}`,
                            ],
                          },
                        ],
                      }
                    })
                  )
                }}
                className="h-10 w-full rounded-lg border border-violet-400/25 bg-[#071426]/90 px-3 text-sm font-black text-white outline-none transition hover:border-violet-300/45 focus:border-violet-300/65"
              >
                <option value="">Select place</option>
                <option value="1st">1st</option>
                <option value="2nd">2nd</option>
                <option value="3rd">3rd</option>
              </select>
            </div>

            {/* CM WINNER */}
            {cm.finalPlace === "1st" ? (
              <div>
                <div className="mb-1.5 text-xs font-bold text-amber-200/55">
                  CM Winner
                </div>

                <select
                  value={selectedWinnerId}
                  onChange={(event) => {
                    const winnerId = event.target.value

                    setCms((current) =>
                      current.map((item) => {
                        if (item.number !== cm.number) {
                          return item
                        }

                        const previousWinner = item.participants.find(
                          (participant) => participant.won
                        )

                        const previousWinnerId =
                          previousWinner?.cmUmaId ?? ""

                        if (previousWinnerId === winnerId) {
                          return item
                        }

                        const newWinner = item.participants.find(
                          (participant) =>
                            participant.cmUmaId === winnerId
                        )

                        const previousWinnerVersion = versions.find(
                          (version) =>
                            version.id === previousWinner?.umaId
                        )

                        const newWinnerVersion = versions.find(
                          (version) => version.id === newWinner?.umaId
                        )

                        const previousWinnerName =
                          previousWinnerVersion?.displayName ?? "None"

                        const newWinnerName =
                          newWinnerVersion?.displayName ?? "None"

                        return {
                          ...item,
                          participants: item.participants.map(
                            (participant) => ({
                              ...participant,
                              won:
                                participant.cmUmaId === winnerId &&
                                participant.finalParticipant,
                            })
                          ),
                          log: [
                            ...(item.log ?? []),
                            {
                              id: `cm${item.number}-winner-${Date.now()}`,
                              timestamp: new Date().toISOString(),
                              type: "winnerSelected",
                              message:
                                previousWinnerId === ""
                                  ? "CM Winner selected."
                                  : winnerId === ""
                                    ? "CM Winner cleared."
                                    : "CM Winner updated.",
                              details: [
                                `Winner: ${previousWinnerName} → ${newWinnerName}`,
                              ],
                            },
                          ],
                        }
                      })
                    )
                  }}
                  className="h-10 w-full rounded-lg border border-amber-400/30 bg-[#071426]/90 px-3 text-sm font-black text-white outline-none transition hover:border-amber-300/50 focus:border-amber-300/65"
                >
                  <option value="">Select Winner</option>

                  {finalParticipants.map((participant) => {
                    const version = versions.find(
                      (item) => item.id === participant.umaId
                    )

                    return (
                      <option
                        key={participant.cmUmaId}
                        value={participant.cmUmaId}
                      >
                        {version?.displayName ?? "Unknown Uma"}
                      </option>
                    )
                  })}
                </select>
              </div>
            ) : (
              <div className="flex h-10 min-w-0 flex-1 items-center rounded-lg border border-blue-400/10 bg-blue-950/15 px-3 text-xs font-semibold text-blue-100/35">
                  CM Winner is only selected for 1st place.
                </div>
            )}
          

          <div className="mt-4 flex items-center justify-end gap-4">
            {cm.finalPlace === "1st" && selectedWinnerId === "" && (
              <div className="text-xs font-semibold text-amber-300/75">
                Select the CM Winner before completing the CM.
              </div>
            )}

            <button
              type="button"
              onClick={handleCompleteCM}
              disabled={!canCompleteCM}
               className="h-10 min-w-[150px] shrink-0 rounded-lg border border-emerald-400/35 bg-emerald-700/80 px-5 text-sm font-black text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.04] disabled:text-white/25"
            >
              Complete CM
            </button>
          </div>
          </div>
        </section>
      )}
    </div>
  )
}

export default CMResults
