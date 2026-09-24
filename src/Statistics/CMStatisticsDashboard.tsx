import { useState } from "react"

import type {
  Dispatch,
  SetStateAction,
} from "react"

import type { CM } from "../types/types"

import { calculateFinalQualificationFromAttempts } from "../CMs/CMCalculations"
import { useUmaDatabase } from "../context/UmaDatabaseContext"
import { getTrackImage } from "../data/trackData"
import CMModal from "../CMs/CMModal"
import UmaAvatarImage from "../components/UmaAvatarImage"

type CMStatisticsDashboardProps = {
  cms: CM[]
  setCms: Dispatch<SetStateAction<CM[]>>
}

function CMStatisticsDashboard({
  cms,
  setCms,
}: CMStatisticsDashboardProps) {

const { versions } = useUmaDatabase()

  const [
  selectedRecentCmNumber,
  setSelectedRecentCmNumber,
] = useState<number | null>(null)

const selectedRecentCm =
  selectedRecentCmNumber !== null
    ? cms.find(
        (cm) =>
          cm.number === selectedRecentCmNumber
      ) ?? null
    : null

  const totalRaces = cms.reduce(
    (total, cm) =>
      total +
      (cm.attempts ?? []).reduce(
        (attemptTotal, attempt) =>
          attemptTotal + attempt.racesPlayed,
        0
      ),
    0
  )


  const totalRaceWins = cms.reduce(
    (total, cm) =>
      total +
      (cm.attempts ?? []).reduce(
        (attemptTotal, attempt) =>
          attemptTotal +
          (attempt.umaWins ?? []).reduce(
            (wins, uma) =>
              wins + uma.wins,
            0
          ),
        0
      ),
    0
  )

  const overallWinRate =
    totalRaces > 0
      ? (totalRaceWins / totalRaces) * 100
      : null

  const finalACount = cms.filter(
    (cm) =>
      calculateFinalQualificationFromAttempts(
        cm.attempts ?? []
      ) === "Final A"
  ).length

  const finalWins = cms.filter(
    (cm) => cm.finalPlace === "1st"
  ).length

  const secondPlaces = cms.filter(
  (cm) => cm.finalPlace === "2nd"
).length

const thirdPlaces = cms.filter(
  (cm) => cm.finalPlace === "3rd"
).length

const eliminatedCount = cms.filter(
  (cm) => cm.phase === "eliminated"
).length

  const umaPerformanceMap = new Map<
    string,
    {
      umaId: string
      events: number
      finals: number
      races: number
      wins: number
    }
  >()

  const getUmaPerformance = (umaId: string) => {
    const existing =
      umaPerformanceMap.get(umaId)

    if (existing) {
      return existing
    }

    const created = {
      umaId,
      events: 0,
      finals: 0,
      races: 0,
      wins: 0,
    }

    umaPerformanceMap.set(
      umaId,
      created
    )

    return created
  }

  cms.forEach((cm) => {
    const appearedUmaIds =
      new Set<string>()

    const finalUmaIds =
      new Set<string>()

    ;(cm.participants ?? []).forEach(
      (participant) => {
        const performance =
          getUmaPerformance(
            participant.umaId
          )

        let appeared = false

        ;(cm.attempts ?? []).forEach(
          (attempt) => {
            const result =
              attempt.umaWins.find(
                (item) =>
                  item.cmUmaId ===
                  participant.cmUmaId
              )

            if (!result) {
              return
            }

            performance.races +=
              attempt.racesPlayed

            performance.wins +=
              result.wins

            appeared = true
          }
        )

        if (
          participant.finalParticipant
        ) {
          finalUmaIds.add(
            participant.umaId
          )

          appeared = true
        }

        if (appeared) {
          appearedUmaIds.add(
            participant.umaId
          )
        }
      }
    )

    appearedUmaIds.forEach(
      (umaId) => {
        getUmaPerformance(
          umaId
        ).events += 1
      }
    )

    finalUmaIds.forEach(
      (umaId) => {
        getUmaPerformance(
          umaId
        ).finals += 1
      }
    )
  })

  const umaPerformance =
    Array.from(
      umaPerformanceMap.values()
    )
      .map((item) => {
        const version =
          versions.find(
            (version) =>
              version.id === item.umaId
          )

        const winRate =
          item.races > 0
            ? (item.wins /
                item.races) *
              100
            : 0

        return {
          ...item,
          name:
            version?.displayName ??
            "Unknown Uma",
          avatar:
            version?.avatar ?? "",
          winRate,
        }
      })
      .filter(
        (item) =>
          item.races > 0 ||
          item.finals > 0
      )
      .sort((a, b) => {
        if (b.wins !== a.wins) {
          return b.wins - a.wins
        }

        if (
          b.winRate !== a.winRate
        ) {
          return (
            b.winRate -
            a.winRate
          )
        }

        return b.races - a.races
      })
      .slice(0, 5)

      const umaPerformanceRows =
  Array.from(
    { length: 5 },
    (_, index) =>
      umaPerformance[index] ?? null
  )

  const stats = [
    {
      label: "CM Events",
      value: cms.length,
      accent: "text-white",
    },
    {
      label: "A Finals",
      value: finalACount,
      accent: "text-violet-200",
    },
    {
      label: "Final Wins",
      value: finalWins,
      accent: "text-amber-300",
    },
    {
      label: "Races",
      value: totalRaces,
      accent: "text-white",
    },
    {
      label: "Race Wins",
      value: totalRaceWins,
      accent: "text-violet-200",
    },
    {
      label: "Win Rate",
      value:
        overallWinRate !== null
          ? `${overallWinRate.toFixed(2)}%`
          : "—",
      accent: "text-sky-200",
    },
  ]
  const bestEvent =
    cms
      .map((cm) => {
        const races = (cm.attempts ?? []).reduce(
          (total, attempt) =>
            total + attempt.racesPlayed,
          0
        )

        const wins = (cm.attempts ?? []).reduce(
          (total, attempt) =>
            total +
            (attempt.umaWins ?? []).reduce(
              (winsTotal, uma) =>
                winsTotal + uma.wins,
              0
            ),
          0
        )

        const winRate =
          races > 0
            ? (wins / races) * 100
            : 0

        const finalQualification =
          calculateFinalQualificationFromAttempts(
            cm.attempts ?? []
          )

        const finalScore =
          cm.finalPlace === "1st"
            ? 3
            : cm.finalPlace === "2nd"
              ? 2
              : cm.finalPlace === "3rd"
                ? 1
                : 0

        const qualificationScore =
          finalQualification === "Final A"
            ? 2
            : finalQualification === "Final B"
              ? 1
              : 0

        return {
          cm,
          races,
          wins,
          winRate,
          finalQualification,
          finalScore,
          qualificationScore,
          trackImage: getTrackImage(cm.track),
        }
      })
      .sort((a, b) => {
        if (
          b.qualificationScore !==
          a.qualificationScore
        ) {
          return (
            b.qualificationScore -
            a.qualificationScore
          )
        }

        if (b.finalScore !== a.finalScore) {
          return b.finalScore - a.finalScore
        }

        if (b.winRate !== a.winRate) {
          return b.winRate - a.winRate
        }

        return b.races - a.races
      })[0] ?? null

  const distanceCategories = [
    "Sprint",
    "Mile",
    "Medium",
    "Long",
  ] as const

  type DistanceCategory =
    (typeof distanceCategories)[number]

  type SurfacePerformance = {
    events: number
    races: number
    wins: number
  }

  const createSurfacePerformance = () =>
    Object.fromEntries(
      distanceCategories.map((category) => [
        category,
        {
          events: 0,
          races: 0,
          wins: 0,
        },
      ])
    ) as Record<
      DistanceCategory,
      SurfacePerformance
    >

  const surfacePerformance = {
    Turf: createSurfacePerformance(),
    Dirt: createSurfacePerformance(),
  }

  const normalizeDistanceCategory = (
    length: string
  ): DistanceCategory | null => {
    if (
      length === "Sprint" ||
      length === "Short"
    ) {
      return "Sprint"
    }

    if (
      length === "Mile" ||
      length === "Miles"
    ) {
      return "Mile"
    }

    if (length === "Medium") {
      return "Medium"
    }

    if (length === "Long") {
      return "Long"
    }

    return null
  }

  cms.forEach((cm) => {
    if (
      cm.surface !== "Turf" &&
      cm.surface !== "Dirt"
    ) {
      return
    }

    const category =
      normalizeDistanceCategory(cm.length)

    if (!category) {
      return
    }

    const races = (cm.attempts ?? []).reduce(
      (total, attempt) =>
        total + attempt.racesPlayed,
      0
    )

    const wins = (cm.attempts ?? []).reduce(
      (total, attempt) =>
        total +
        (attempt.umaWins ?? []).reduce(
          (winsTotal, uma) =>
            winsTotal + uma.wins,
          0
        ),
      0
    )

    const performance =
      surfacePerformance[cm.surface][category]

    performance.events += 1
    performance.races += races
    performance.wins += wins
  })
  
const distanceColorClasses: Record<
  DistanceCategory,
  string
> = {
  Sprint:
    "text-pink-300 drop-shadow-[0_0_5px_rgba(244,114,182,0.28)]",
  Mile:
    "text-emerald-300 drop-shadow-[0_0_5px_rgba(52,211,153,0.28)]",
  Medium:
    "text-amber-300 drop-shadow-[0_0_5px_rgba(251,191,36,0.28)]",
  Long:
    "text-blue-300 drop-shadow-[0_0_5px_rgba(96,165,250,0.28)]",
}

const recentProgress =
  [...cms]
    .sort((a, b) => a.number - b.number)
    .slice(-3)
    .map((cm) => {
      const races = (cm.attempts ?? []).reduce(
        (total, attempt) =>
          total + attempt.racesPlayed,
        0
      )

      const wins = (cm.attempts ?? []).reduce(
        (total, attempt) =>
          total +
          (attempt.umaWins ?? []).reduce(
            (winsTotal, uma) =>
              winsTotal + uma.wins,
            0
          ),
        0
      )

      const winRate =
        races > 0
          ? (wins / races) * 100
          : null

      const qualification =
        calculateFinalQualificationFromAttempts(
          cm.attempts ?? []
        )

      return {
        cm,
        races,
        wins,
        winRate,
        qualification,
      }
    })

  return (
    <div className="space-y-6">

      {/* CAREER OVERVIEW */}
      <section
        data-guide="statistics-career-overview"
        className="relative overflow-hidden rounded-2xl border border-sky-400/45 bg-[#07111f]/82 shadow-[0_0_24px_rgba(56,189,248,0.08)] backdrop-blur-md"
      >

        <div className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-blue-500/[0.07] blur-3xl" />
        <div className="pointer-events-none absolute -right-16 top-0 h-48 w-48 rounded-full bg-violet-500/[0.06] blur-3xl" />

        {/* HEADER */}
        <div className="relative flex items-center justify-between border-b border-sky-300/[0.12] px-5 py-3.5">

          <div className="flex items-center gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center text-violet-300 drop-shadow-[0_0_5px_rgba(167,139,250,0.4)]">
          <svg
            viewBox="0 0 24 24"
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          >
            <path d="M4 19V9" />
            <path d="M10 19V5" />
            <path d="M16 19v-7" />
            <path d="M22 19V3" />
          </svg>
        </div>

          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.18em] text-sky-300/50">
              Competitive Record
            </div>

            <h2 className="mt-0.5 text-base font-black text-white">
              Career Overview
            </h2>
          </div>
        </div>

        </div>

        {/* STATS */}
        <div className="relative grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6">

          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className={`px-5 py-4 ${
                index > 0
                  ? "border-l border-white/[0.06]"
                  : ""
              }`}
            >
              <div className="text-[9px] font-black uppercase tracking-[0.14em] text-blue-100/30">
                {stat.label}
              </div>

              <div
                className={`mt-1 text-2xl font-black tabular-nums ${stat.accent}`}
              >
                {stat.value}
              </div>
            </div>
          ))}

        </div>

      </section>
{/* FINAL RESULTS */}
<section className="relative overflow-hidden rounded-2xl border border-sky-400/35 bg-[#07111f]/80 shadow-[0_0_22px_rgba(56,189,248,0.06)] backdrop-blur-md">

  <div className="pointer-events-none absolute -left-16 -top-20 h-48 w-48 rounded-full bg-sky-500/[0.05] blur-3xl" />
  <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-amber-500/[0.04] blur-3xl" />

  {/* HEADER */}
  <div className="relative flex items-center gap-3 border-b border-sky-300/[0.12] px-5 py-3.5">

    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center text-violet-300 drop-shadow-[0_0_5px_rgba(167,139,250,0.4)]">
      <svg
        viewBox="0 0 64 64"
        className="h-9 w-9"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M20 8h24v8h10v7c0 9-6 16-15 18-1 5-3 8-5 10h10v5H20v-5h10c-2-2-4-5-5-10-9-2-15-9-15-18v-7h10V8Zm0 13h-5v2c0 6 3 10 9 12-2-4-3-9-4-14Zm24 0c-1 5-2 10-4 14 6-2 9-6 9-12v-2h-5Z" />
      </svg>
    </div>

    <div>
      <div className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-300/55">
        Champions Meeting
      </div>

      <h2 className="mt-0.5 text-base font-black text-white">
        Final Results
      </h2>
    </div>

  </div>

  {/* RESULTS */}
  <div className="relative grid grid-cols-2 md:grid-cols-4">

    {/* 1ST */}
    <div className="px-5 py-4 text-center">
      <div className="text-[9px] font-black uppercase tracking-[0.14em] text-blue-100/30">
        1st Place
      </div>

      <div className="mt-1.5 text-3xl font-black tabular-nums text-yellow-300">
        {finalWins}
      </div>
    </div>

    {/* 2ND */}
    <div className="border-l border-white/[0.06] px-5 py-4 text-center">
      <div className="text-[9px] font-black uppercase tracking-[0.14em] text-blue-100/30">
        2nd Place
      </div>

      <div className="mt-1.5 text-3xl font-black tabular-nums text-slate-200">
        {secondPlaces}
      </div>
    </div>

    {/* 3RD */}
    <div className="border-l border-white/[0.06] px-5 py-4 text-center">
      <div className="text-[9px] font-black uppercase tracking-[0.14em] text-blue-100/30">
        3rd Place
      </div>

      <div className="mt-1.5 text-3xl font-black tabular-nums text-orange-300">
        {thirdPlaces}
      </div>
    </div>

    {/* ELIMINATED */}
    <div className="border-l border-white/[0.06] px-5 py-4 text-center">
      <div className="text-[9px] font-black uppercase tracking-[0.14em] text-blue-100/30">
        Eliminated
      </div>

      <div className="mt-1.5 text-3xl font-black tabular-nums text-rose-300">
        {eliminatedCount}
      </div>
    </div>

  </div>

</section>
{/* UMA PERFORMANCE */}
<div className="grid items-stretch gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(360px,0.85fr)]">
<section
  data-guide="statistics-uma-performance"
  className="relative overflow-hidden rounded-2xl border border-sky-400/35 bg-[#07111f]/80 shadow-[0_0_22px_rgba(56,189,248,0.06)] backdrop-blur-md"
>

  <div className="pointer-events-none absolute -left-20 -top-20 h-52 w-52 rounded-full bg-cyan-500/[0.06] blur-3xl" />
  <div className="pointer-events-none absolute -right-20 top-0 h-52 w-52 rounded-full bg-violet-500/[0.05] blur-3xl" />

  {/* HEADER */}
  <div className="relative flex items-center justify-between border-b border-sky-300/[0.12] px-5 py-3.5">

    <div className="flex items-center gap-3">

      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center text-[44px] leading-none text-violet-300 drop-shadow-[0_0_5px_rgba(167,139,250,0.4)]">
          ♞
        </div>
      <div>
        <div className="text-[9px] font-black uppercase tracking-[0.18em] text-sky-300/50">
          Champions Meeting
        </div>

        <h2 className="mt-0.5 text-base font-black text-white">
          Uma Performance
        </h2>
      </div>

    </div>

    <div className="text-[9px] font-black uppercase tracking-[0.15em] text-blue-100/25">
      Top 5
    </div>

  </div>

  {/* TABLE HEADER */}
  <div className="relative grid grid-cols-[52px_minmax(220px,1fr)_90px_90px_100px_100px_110px] items-center border-b border-white/[0.06] px-4 py-2.5 text-[8px] font-black uppercase tracking-[0.16em] text-blue-100/30">

    <div className="text-center">
      #
    </div>

    <div>
      Uma
    </div>

    <div className="text-center">
      Events
    </div>

    <div className="text-center">
      Finals
    </div>

    <div className="text-center">
      Races
    </div>

    <div className="text-center">
      Wins
    </div>

    <div className="text-right">
      Win Rate
    </div>

  </div>

  {/* ROWS */}
    <div className="relative divide-y divide-white/[0.05]">

      {umaPerformanceRows.map(
        (uma, index) => (
          <div
            key={
              uma?.umaId ??
              `empty-${index}`
            }
            className="grid grid-cols-[52px_minmax(220px,1fr)_90px_90px_100px_100px_110px] items-center px-4 py-2.5 transition hover:bg-white/[0.025]"
          >

            {/* RANK */}
            <div className="flex justify-center">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-md text-xs font-black ${
                  index === 0
                    ? "border border-yellow-300/25 bg-yellow-400/[0.08] text-yellow-300"
                    : index === 1
                      ? "border border-slate-300/20 bg-slate-300/[0.06] text-slate-200"
                      : index === 2
                        ? "border border-orange-300/20 bg-orange-400/[0.06] text-orange-300"
                        : "text-blue-100/35"
                }`}
              >
                {index + 1}
              </div>
            </div>

            {uma ? (
              <>
                {/* UMA */}
                <div className="flex min-w-0 items-center gap-3">

                  {uma.avatar ? (
                  <UmaAvatarImage
                    avatar={uma.avatar}
                    alt={uma.name}
                    className="h-10 w-10 shrink-0 rounded-lg border border-white/[0.08] object-cover object-top"
                  />
                ) : (
                    <div className="h-10 w-10 shrink-0 rounded-lg border border-white/[0.08] bg-white/[0.03]" />
                  )}

                  <div className="truncate text-sm font-black text-white/90">
                    {uma.name}
                  </div>

                </div>

                <div className="text-center text-sm font-bold tabular-nums text-blue-100/65">
                  {uma.events}
                </div>

                <div className="text-center text-sm font-bold tabular-nums text-violet-200/80">
                  {uma.finals}
                </div>

                <div className="text-center text-sm font-bold tabular-nums text-white/80">
                  {uma.races}
                </div>

                <div className="text-center text-sm font-black tabular-nums text-sky-200">
                  {uma.wins}
                </div>

                <div className="text-right text-sm font-black tabular-nums text-cyan-200">
                  {uma.winRate.toFixed(2)}%
                </div>
              </>
            ) : (
              <>
                {/* EMPTY UMA */}
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg border border-dashed border-white/[0.08] bg-white/[0.015]" />

                  <div className="text-sm font-bold text-blue-100/20">
                    —
                  </div>
                </div>

                <div className="text-center text-sm text-blue-100/15">
                  —
                </div>

                <div className="text-center text-sm text-blue-100/15">
                  —
                </div>

                <div className="text-center text-sm text-blue-100/15">
                  —
                </div>

                <div className="text-center text-sm text-blue-100/15">
                  —
                </div>

                <div className="text-right text-sm text-blue-100/15">
                  —
                </div>
              </>
            )}

          </div>
        )
      )}

    </div>

</section>
{/* BEST EVENT */}
<section
  role={bestEvent ? "button" : undefined}
  tabIndex={bestEvent ? 0 : undefined}
  onClick={() => {
    if (bestEvent) {
      setSelectedRecentCmNumber(
        bestEvent.cm.number
      )
    }
  }}
  onKeyDown={(event) => {
    if (!bestEvent) {
      return
    }

    if (
      event.key === "Enter" ||
      event.key === " "
    ) {
      event.preventDefault()

      setSelectedRecentCmNumber(
        bestEvent.cm.number
      )
    }
  }}
  className={`relative min-w-0 overflow-hidden rounded-2xl border border-violet-400/35 bg-[#07111f]/80 shadow-[0_0_22px_rgba(139,92,246,0.07)] backdrop-blur-md ${
    bestEvent
      ? "cursor-pointer transition duration-200 hover:border-violet-300/55 hover:shadow-[0_0_28px_rgba(139,92,246,0.12)]"
      : ""
  }`}
>

  <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-violet-500/[0.08] blur-3xl" />

  {/* HEADER */}
  <div className="relative flex items-center gap-3 border-b border-violet-300/[0.12] px-5 py-3.5">

    <div className="flex h-9 w-9 shrink-0 items-center justify-center text-violet-300 drop-shadow-[0_0_6px_rgba(167,139,250,0.45)]">
      <svg
        viewBox="0 0 24 24"
        className="h-7 w-7"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="m12 2.8 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z" />
      </svg>
    </div>

    <div>
      <div className="text-[9px] font-black uppercase tracking-[0.18em] text-violet-300/50">
        Champions Meeting
      </div>

      <h2 className="mt-0.5 text-base font-black text-white">
        Best Event
      </h2>
    </div>

  </div>

  {bestEvent ? (
    <div className="relative flex h-[calc(100%-64px)] flex-col">

      {/* EVENT HERO */}
      <div className="relative min-h-[145px] overflow-hidden border-b border-white/[0.06]">

        {bestEvent.trackImage && (
          <img
            src={bestEvent.trackImage}
            alt={bestEvent.cm.track}
            className="absolute inset-0 h-full w-full object-cover opacity-100"
          />
        )}

        <div className="absolute inset-0 bg-gradient-to-r from-[#07111f] via-[#07111f]/80 to-[#07111f]/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#07111f] via-transparent to-[#07111f]/30" />

        <div className="relative flex h-full min-h-[145px] flex-col justify-end p-5">

          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-violet-200/50">
            CM #{bestEvent.cm.number}
          </div>

          <div className="mt-1 truncate text-xl font-black text-white">
            {bestEvent.cm.name || "Unnamed CM"}
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">

            <div className="rounded-md border border-white/[0.09] bg-black/30 px-2.5 py-1 text-[10px] font-bold text-white/80 backdrop-blur-sm">
              {bestEvent.cm.track || "—"}
            </div>

            <div
              className={`rounded-md px-2.5 py-1 text-[10px] font-black ${
                bestEvent.cm.surface === "Turf"
                  ? "bg-emerald-500/15 text-emerald-200"
                  : "bg-amber-500/15 text-amber-200"
              }`}
            >
              {bestEvent.cm.surface}
            </div>

            <div className="rounded-md border border-white/[0.09] bg-black/30 px-2.5 py-1 text-[10px] font-bold text-white/80 backdrop-blur-sm">
              {bestEvent.cm.distance}m
            </div>

            <div className="rounded-md border border-white/[0.09] bg-black/30 px-2.5 py-1 text-[10px] font-bold text-white/80 backdrop-blur-sm">
              {bestEvent.cm.length}
            </div>

          </div>

        </div>

      </div>

      {/* EVENT STATS */}
        <div className="grid flex-1 grid-cols-2 grid-rows-2">

          {/* WIN RATE */}
          <div className="flex flex-col items-center justify-center border-b border-r border-white/[0.06] px-4 py-4 text-center">
            <div className="text-[9px] font-black uppercase tracking-[0.15em] text-blue-100/30">
              Win Rate
            </div>

            <div className="mt-1 text-2xl font-black tabular-nums text-cyan-200">
              {bestEvent.winRate.toFixed(2)}%
            </div>
          </div>

          {/* FINAL RESULT */}
          <div className="flex flex-col items-center justify-center border-b border-white/[0.06] px-4 py-4 text-center">
            <div className="text-[9px] font-black uppercase tracking-[0.15em] text-blue-100/30">
              Final Result
            </div>

            <div
              className={`mt-1 text-2xl font-black ${
                bestEvent.cm.finalPlace === "1st"
                  ? "text-yellow-300"
                  : bestEvent.cm.finalPlace === "2nd"
                    ? "text-slate-200"
                    : bestEvent.cm.finalPlace === "3rd"
                      ? "text-orange-300"
                      : "text-blue-100/35"
              }`}
            >
              {bestEvent.cm.finalPlace || "—"}
            </div>

            <div className="mt-1 text-[10px] font-bold text-violet-200/45">
              {bestEvent.finalQualification ?? "No Final"}
            </div>
          </div>

          {/* RACE WINS */}
          <div className="flex flex-col items-center justify-center border-r border-white/[0.06] px-4 py-4 text-center">
            <div className="text-[9px] font-black uppercase tracking-[0.15em] text-blue-100/30">
              Race Wins
            </div>

            <div className="mt-1 text-2xl font-black tabular-nums text-violet-200">
              {bestEvent.wins}
            </div>
          </div>

          {/* RACES */}
          <div className="flex flex-col items-center justify-center px-4 py-4 text-center">
            <div className="text-[9px] font-black uppercase tracking-[0.15em] text-blue-100/30">
              Races
            </div>

            <div className="mt-1 text-2xl font-black tabular-nums text-white">
              {bestEvent.races}
            </div>
          </div>

        </div>

    </div>
  ) : (
    <div className="flex min-h-[280px] items-center justify-center px-5 text-sm font-medium text-blue-100/30">
      No event data yet.
    </div>
  )}

</section>

</div>
<div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(560px,1fr)]">

{/* SURFACE & DISTANCE PERFORMANCE */}
<section className="relative overflow-hidden rounded-2xl border border-sky-400/35 bg-[#07111f]/80 shadow-[0_0_22px_rgba(56,189,248,0.06)] backdrop-blur-md">

  <div className="pointer-events-none absolute -left-20 -top-20 h-52 w-52 rounded-full bg-emerald-500/[0.05] blur-3xl" />
  <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-amber-500/[0.04] blur-3xl" />

  {/* HEADER */}
  <div className="relative flex items-center gap-3 border-b border-sky-300/[0.12] px-5 py-3.5">

   <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center text-[44px] leading-none text-violet-300 drop-shadow-[0_0_5px_rgba(167,139,250,0.4)]">
  <span className="text-[30px] leading-none">
    👟
  </span>
</div>

    <div>
      <div className="text-[9px] font-black uppercase tracking-[0.18em] text-sky-300/50">
        Champions Meeting
      </div>

      <h2 className="mt-0.5 text-base font-black text-white">
        Surface & Distance Performance
      </h2>
    </div>

  </div>

  {/* PERFORMANCE TABLE */}
<div className="relative">

  {/* TABLE HEADER */}
    <div className="grid grid-cols-[90px_80px_minmax(0,1fr)_80px_90px] items-center gap-3 border-b border-white/[0.06] px-5 py-2.5">

    <div className="text-[8px] font-black uppercase tracking-[0.14em] text-blue-100/25">
      Surface
    </div>

    <div className="pl-2 text-[8px] font-black uppercase tracking-[0.14em] text-blue-100/25">
      Distance
    </div>

    <div className="text-[8px] font-black uppercase tracking-[0.14em] text-blue-100/25">
    </div>

    <div className="text-right text-[8px] font-black uppercase tracking-[0.14em] text-blue-100/30">
      Win Rate
    </div>

    <div className="text-right text-[8px] font-black uppercase tracking-[0.14em] text-blue-100/30">
      Wins / Races
    </div>

  </div>

  {/* SURFACES */}
  {(["Turf", "Dirt"] as const).map((surface, surfaceIndex) => {
    const categories =
      surface === "Turf"
        ? distanceCategories
        : distanceCategories.filter(
            (category) => category !== "Long"
          )

    const isTurf = surface === "Turf"

    return (
      <div
        key={surface}
        className={`grid gap-4 px-5 py-4 xl:grid-cols-[90px_minmax(0,850px)] ${
          surfaceIndex === 1
          ? "border-t-2 border-sky-400/20"
          : ""
        }`}
      >

        {/* SURFACE */}
        <div className="flex items-center gap-2 px-5 py-3">
          <div
            className={`h-2.5 w-2.5 shrink-0 rounded-full ${
              isTurf
                ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.45)]"
                : "bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.45)]"
            }`}
          />

          <div
            className={`text-xs font-black uppercase tracking-[0.16em] ${
              isTurf
                ? "text-emerald-200"
                : "text-red-300"
            }`}
          >
            {surface}
          </div>
        </div>

        {/* DISTANCE ROWS */}
        <div className="divide-y divide-white/[0.035]">

          {categories.map((category) => {
            const performance =
              surfacePerformance[surface][category]

            const winRate =
              performance.races > 0
                ? (performance.wins /
                    performance.races) *
                  100
                : null

            return (
              <div
                key={category}
                className="grid grid-cols-[80px_minmax(0,1fr)_80px_90px] items-center gap-3 py-2 pr-5"
              >

                {/* DISTANCE */}
                <div
                className={`pl-2 text-[9px] font-black uppercase tracking-[0.13em] ${
                  distanceColorClasses[category]
                }`}
              >
                {category}
              </div>

                {/* WIN RATE BAR */}
                <div className="h-2 overflow-hidden rounded-full bg-white/[0.07]">
                  <div
                    className={`h-full rounded-full ${
                      category === "Sprint"
                        ? "bg-pink-400"
                        : category === "Mile"
                          ? "bg-emerald-400"
                          : category === "Medium"
                            ? "bg-amber-400"
                            : "bg-blue-400"
                    }`}
                    style={{
                      width:
                        winRate !== null
                          ? `${Math.min(winRate, 100)}%`
                          : "0%",
                    }}
                  />
                </div>

                {/* EXACT WIN RATE */}
                <div
                  className={`text-right text-xs font-black tabular-nums ${
                    winRate !== null
                      ? "text-white"
                      : "text-blue-100/20"
                  }`}
                >
                  {winRate !== null
                    ? `${winRate.toFixed(2)}%`
                    : "—"}
                </div>

                {/* WINS / RACES */}
                <div
                className={`text-right text-[10px] font-bold tabular-nums ${
                  performance.races > 0 ? "text-white" : "text-white/20"
                }`}
              >
                  {performance.races > 0
                    ? `${performance.wins} / ${performance.races}`
                    : "—"}
                </div>

              </div>
            )
          })}

        </div>

      </div>
    )
  })}

</div>

</section>
{/* RECENT PROGRESS */}
<section className="relative overflow-hidden rounded-2xl border border-sky-400/35 bg-[#07111f]/80 shadow-[0_0_22px_rgba(56,189,248,0.06)] backdrop-blur-md">

  {/* HEADER */}
  <div className="relative flex items-center justify-between border-b border-sky-300/[0.12] px-5 py-3.5">

    <div className="flex items-center gap-3">

      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center text-[30px] leading-none text-violet-300 drop-shadow-[0_0_5px_rgba(167,139,250,0.4)]">
        ↗
      </div>

      <div>
        <div className="text-[9px] font-black uppercase tracking-[0.18em] text-sky-300/50">
          Champions Meeting
        </div>

        <h2 className="mt-0.5 text-base font-black text-white">
          Recent CMs
        </h2>
      </div>

    </div>

  </div>

  {/* TIMELINE */}
  <div className="relative px-6 py-6">

    {recentProgress.length > 0 ? (
      <div className="relative">


        <div className="relative grid grid-cols-3 gap-3 pb-1">

          {recentProgress.map((event, index) => {
            const isFirst =
              event.cm.finalPlace === "1st"

            const isSecond =
              event.cm.finalPlace === "2nd"

            const isThird =
              event.cm.finalPlace === "3rd"

            const isEliminated =
              event.cm.phase === "eliminated"

            return (
              <button
                key={event.cm.number}
                type="button"
                onClick={() =>
                setSelectedRecentCmNumber(
                  event.cm.number
                )
              }
                className="group relative min-w-0 pt-4 text-left"
              >
                {/* CONNECTOR TO NEXT EVENT */}
                {index < recentProgress.length - 1 && (
                  <div className="pointer-events-none absolute left-[26px] right-[-19px] top-[15px] h-px bg-gradient-to-r from-violet-300/40 to-violet-300/20" />
                )}

                {/* TIMELINE POINT */}
                <div
                  className={`absolute left-5 top-[10px] z-10 h-3 w-3 rounded-full border-2 border-[#07111f] ${
                    isFirst
                      ? "bg-yellow-300 shadow-[0_0_9px_rgba(253,224,71,0.7)]"
                      : isEliminated
                        ? "bg-rose-400 shadow-[0_0_9px_rgba(251,113,133,0.55)]"
                        : "bg-violet-300 shadow-[0_0_9px_rgba(167,139,250,0.55)]"
                  }`}
                />

                {/* CARD */}
                <div className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-[#081426]/90 px-4 py-3 shadow-lg transition duration-200 group-hover:-translate-y-1 group-hover:border-violet-300/35 group-hover:bg-[#0a1830] group-hover:shadow-[0_0_18px_rgba(139,92,246,0.12)]">

                  <div className="flex items-center gap-3">

                  {/* RESULT ICON */}
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center text-lg font-black ${
                      isFirst
                        ? "text-yellow-300"
                        : isSecond
                          ? "text-slate-200"
                          : isThird
                            ? "text-orange-300"
                            : isEliminated
                              ? "text-rose-400"
                              : "text-violet-300"
                    }`}
                  >
                    {isFirst
                      ? "🏆"
                      : isEliminated
                        ? "×"
                        : event.cm.finalPlace || "•"}
                  </div>

                  <div className="min-w-0 flex-1">

                    <div className="text-[8px] font-black uppercase tracking-[0.12em] text-blue-100/25">
                      CM #{event.cm.number}
                    </div>

                    <div className="mt-0.5 truncate text-xs font-black text-white">
                      {event.cm.name || "Unnamed"}
                    </div>

                    <div
                      className={`mt-0.5 whitespace-nowrap text-[8px] font-black uppercase tracking-[0.08em] ${
                        isFirst
                          ? "text-yellow-300"
                          : isSecond
                            ? "text-slate-300"
                            : isThird
                              ? "text-orange-300"
                              : isEliminated
                                ? "text-rose-400"
                                : "text-violet-300/60"
                      }`}
                    >
                      {isEliminated
                        ? "Eliminated"
                        : event.cm.finalPlace
                          ? `${event.cm.finalPlace} Place`
                          : event.qualification}
                    </div>

                  </div>

                </div>

                </div>

              </button>
            )
          })}

        </div>

      </div>
    ) : (
      <div className="py-5 text-center text-sm font-medium text-blue-100/30">
        No Champions Meeting history yet.
      </div>
    )}

  </div>
      {selectedRecentCm && (
      <CMModal
        cm={selectedRecentCm}
        setCms={setCms}
        onClose={() =>
          setSelectedRecentCmNumber(null)
        }
      />
    )}

</section>
</div>
    </div>
  )
}

export default CMStatisticsDashboard