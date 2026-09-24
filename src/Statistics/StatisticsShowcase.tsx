import { useEffect, useState } from "react"
import { useUmaDatabase } from "../context/UmaDatabaseContext"
import UmaAvatarImage from "../components/UmaAvatarImage"
import type { CM } from "../types/types"

type UmaStatistics = {
  umaId: string

  cm: {
    wins: number
    races: number
    appearances: number
    finalAppearances: number
  }

  loh: {
    wins: number
    races: number
    appearances: number
  }
}

type StatisticsShowcaseProps = {
  cms: CM[]
}

type WinnerBorderShimmerProps = {
  id: string
  width: number
  height: number
  radius?: number
}

function WinnerBorderShimmer({
  id,
  width,
  height,
  radius = 23,
}: WinnerBorderShimmerProps) {
  const gradientId = `winnerBorderShimmer-${id}`
  const filterId = `winnerShimmerGlow-${id}`

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 z-30 h-full w-full"
    >
      <defs>
        <linearGradient
          id={gradientId}
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1="0"
          x2={width}
          y2={height}
        >
          <stop
            offset="0%"
            stopColor="#facc15"
            stopOpacity="0.15"
          />

          <stop
            offset="35%"
            stopColor="#facc15"
            stopOpacity="0.4"
          />

          <stop
            offset="50%"
            stopColor="#fffbea"
            stopOpacity="1"
          />

          <stop
            offset="65%"
            stopColor="#facc15"
            stopOpacity="0.4"
          />

          <stop
            offset="100%"
            stopColor="#facc15"
            stopOpacity="0.15"
          />

          <animateTransform
            attributeName="gradientTransform"
            type="rotate"
            from={`0 ${width / 2} ${height / 2}`}
            to={`360 ${width / 2} ${height / 2}`}
            dur="4s"
            repeatCount="indefinite"
          />
        </linearGradient>

        <filter
          id={filterId}
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
        >
          <feGaussianBlur
            in="SourceGraphic"
            stdDeviation="1.2"
            result="blur"
          />

          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* STATIC GOLD BASE */}
      <rect
        x="1.5"
        y="1.5"
        width={width - 3}
        height={height - 3}
        rx={radius}
        ry={radius}
        fill="none"
        stroke="#facc15"
        strokeOpacity="0.85"
        strokeWidth="2.5"
      />

      {/* MOVING SHIMMER */}
      <rect
        x="1.5"
        y="1.5"
        width={width - 3}
        height={height - 3}
        rx={radius}
        ry={radius}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth="3"
        filter={`url(#${filterId})`}
      />
    </svg>
  )
}

function StatisticsShowcase({
  cms,
}: StatisticsShowcaseProps) {
  const { versions } = useUmaDatabase()

  const [statisticsMode, setStatisticsMode] =
    useState<"cm" | "loh" | "all">("cm")

  const statisticsByUma =
    new Map<string, UmaStatistics>()

  const getOrCreateStats = (umaId: string) => {
    const existing =
      statisticsByUma.get(umaId)

    if (existing) {
      return existing
    }

    const newStats: UmaStatistics = {
      umaId,

      cm: {
        wins: 0,
        races: 0,
        appearances: 0,
        finalAppearances: 0,
      },

      loh: {
        wins: 0,
        races: 0,
        appearances: 0,
      },
    }

    statisticsByUma.set(umaId, newStats)

    return newStats
  }

  cms.forEach((cm) => {
    const appearedUmaIds = new Set<string>()
    const finalUmaIds = new Set<string>()

    cm.participants.forEach((participant) => {
      const stats = getOrCreateStats(
        participant.umaId
      )

      let appearedInCm = false

      cm.attempts.forEach((attempt) => {
        const result = attempt.umaWins.find(
          (item) =>
            item.cmUmaId === participant.cmUmaId
        )

        if (!result) {
          return
        }

        stats.cm.wins += result.wins
        stats.cm.races += attempt.racesPlayed

        appearedInCm = true
      })

      const appearedInFinal =
        cm.finalPlace !== "" &&
        participant.finalParticipant

      if (appearedInFinal) {
        stats.cm.races += 1
        appearedInCm = true

        finalUmaIds.add(participant.umaId)

        if (
          cm.finalPlace === "1st" &&
          participant.won
        ) {
          stats.cm.wins += 1
        }
      }

      if (appearedInCm) {
        appearedUmaIds.add(participant.umaId)
      }
    })

    appearedUmaIds.forEach((umaId) => {
      getOrCreateStats(umaId).cm.appearances += 1
    })

    finalUmaIds.forEach((umaId) => {
      getOrCreateStats(umaId).cm.finalAppearances += 1
    })
  })

  const umaStatistics = Array.from(
    statisticsByUma.values()
  )

  const sortedMostWins = [...umaStatistics]
    .filter((stats) => stats.cm.races > 0)
    .sort(
      (a, b) =>
        b.cm.wins - a.cm.wins
    )

  const mostWinsRanking = sortedMostWins
    .map((stats) => {
      const place =
        sortedMostWins.findIndex(
          (item) =>
            item.cm.wins === stats.cm.wins
        ) + 1

      return {
        umaId: stats.umaId,
        name:
          versions.find(
            (version) =>
              version.id === stats.umaId
          )?.displayName ?? stats.umaId,
        wins: stats.cm.wins,
        races: stats.cm.races,
        place,
      }
    })
    .slice(0, 3)

  const sortedMostRaces = [...umaStatistics]
    .filter((stats) => stats.cm.races > 0)
    .sort(
      (a, b) =>
        b.cm.races - a.cm.races
    )

  const mostRacesRanking = sortedMostRaces
    .map((stats) => {
      const place =
        sortedMostRaces.findIndex(
          (item) =>
            item.cm.races === stats.cm.races
        ) + 1

      return {
        umaId: stats.umaId,
        races: stats.cm.races,
        place,
      }
    })
    .slice(0, 3)

  const sortedMostAppearances = [...umaStatistics]
    .filter((stats) => stats.cm.appearances > 0)
    .sort(
      (a, b) =>
        b.cm.appearances - a.cm.appearances
    )

  const mostAppearancesRanking =
    sortedMostAppearances
      .map((stats) => {
        const place =
          sortedMostAppearances.findIndex(
            (item) =>
              item.cm.appearances ===
              stats.cm.appearances
          ) + 1

        return {
          umaId: stats.umaId,
          appearances: stats.cm.appearances,
          place,
        }
      })
      .slice(0, 3)

  const sortedMostFinalAppearances = [
    ...umaStatistics,
  ]
    .filter(
      (stats) =>
        stats.cm.finalAppearances > 0
    )
    .sort(
      (a, b) =>
        b.cm.finalAppearances -
        a.cm.finalAppearances
    )

  const mostFinalAppearancesRanking =
    sortedMostFinalAppearances
      .map((stats) => {
        const place =
          sortedMostFinalAppearances.findIndex(
            (item) =>
              item.cm.finalAppearances ===
              stats.cm.finalAppearances
          ) + 1

        return {
          umaId: stats.umaId,
          finalAppearances:
            stats.cm.finalAppearances,
          place,
        }
      })
      .slice(0, 3)

  console.table(mostWinsRanking)

  const cmSlides = [
    {
      title: "Most CM Race Wins",
      values: ["18", "15", "12"],
      umaIndexes: [3, 4, 5],
    },
    {
      title: "Most CM Races",
      values: ["42", "39", "31"],
      umaIndexes: [0, 1, 2],
    },
    {
      title: "Most CM Appearances",
      values: ["6", "5", "4"],
      umaIndexes: [0, 1, 2],
    },
    {
      title: "Most Final Appearances",
      values: ["4", "3", "2"],
      umaIndexes: [0, 1, 2],
    },
  ]

  const lohSlides = [
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

  const overallSlides = [
    {
      title: "Most Wins",
      values: ["—", "—", "—"],
      umaIndexes: [0, 1, 2],
    },
    {
      title: "Most Races",
      values: ["—", "—", "—"],
      umaIndexes: [0, 1, 2],
    },
    {
      title: "Most Event Appearances",
      values: ["—", "—", "—"],
      umaIndexes: [0, 1, 2],
    },
  ]

  const slides =
    statisticsMode === "cm"
      ? cmSlides
      : statisticsMode === "loh"
        ? lohSlides
        : overallSlides

  const [currentSlide, setCurrentSlide] =
    useState(0)

  const [slideDirection, setSlideDirection] =
    useState<"left" | "right">("right")

  const [isModeTransition, setIsModeTransition] =
    useState(false)

  const getNextStatisticsMode = (
    mode: "cm" | "loh" | "all"
  ) => {
    if (mode === "cm") return "loh"
    if (mode === "loh") return "all"

    return "cm"
  }

  const getPreviousStatisticsMode = (
    mode: "cm" | "loh" | "all"
  ) => {
    if (mode === "cm") return "all"
    if (mode === "loh") return "cm"

    return "loh"
  }

  const getSlidesForMode = (
    mode: "cm" | "loh" | "all"
  ) => {
    if (mode === "cm") return cmSlides
    if (mode === "loh") return lohSlides

    return overallSlides
  }

  const showPreviousSlide = () => {
    if (currentSlide === 0) {
      const previousMode =
        getPreviousStatisticsMode(statisticsMode)

      const previousSlides =
        getSlidesForMode(previousMode)

      setIsModeTransition(true)
      setStatisticsMode(previousMode)
      setCurrentSlide(previousSlides.length - 1)

      return
    }

    setIsModeTransition(false)
    setSlideDirection("left")
    setCurrentSlide((current) => current - 1)
  }

  const currentSlideData =
    slides[currentSlide]

  const currentUmas =
    statisticsMode === "cm" &&
    currentSlide === 0
      ? [
          versions.find(
            (version) =>
              version.id ===
              mostWinsRanking[0]?.umaId
          ),
          versions.find(
            (version) =>
              version.id ===
              mostWinsRanking[1]?.umaId
          ),
          versions.find(
            (version) =>
              version.id ===
              mostWinsRanking[2]?.umaId
          ),
        ]
      : statisticsMode === "cm" &&
          currentSlide === 1
        ? [
            versions.find(
              (version) =>
                version.id ===
                mostRacesRanking[0]?.umaId
            ),
            versions.find(
              (version) =>
                version.id ===
                mostRacesRanking[1]?.umaId
            ),
            versions.find(
              (version) =>
                version.id ===
                mostRacesRanking[2]?.umaId
            ),
          ]
        : statisticsMode === "cm" &&
            currentSlide === 2
          ? [
              versions.find(
                (version) =>
                  version.id ===
                  mostAppearancesRanking[0]?.umaId
              ),
              versions.find(
                (version) =>
                  version.id ===
                  mostAppearancesRanking[1]?.umaId
              ),
              versions.find(
                (version) =>
                  version.id ===
                  mostAppearancesRanking[2]?.umaId
              ),
            ]
          : statisticsMode === "cm" &&
              currentSlide === 3
            ? [
                versions.find(
                  (version) =>
                    version.id ===
                    mostFinalAppearancesRanking[0]?.umaId
                ),
                versions.find(
                  (version) =>
                    version.id ===
                    mostFinalAppearancesRanking[1]?.umaId
                ),
                versions.find(
                  (version) =>
                    version.id ===
                    mostFinalAppearancesRanking[2]?.umaId
                ),
              ]
            : [
                undefined,
                undefined,
                undefined,
              ]

  const currentValues =
    statisticsMode === "cm" &&
    currentSlide === 0
      ? [
          mostWinsRanking[0]?.wins ?? "—",
          mostWinsRanking[1]?.wins ?? "—",
          mostWinsRanking[2]?.wins ?? "—",
        ]
      : statisticsMode === "cm" &&
          currentSlide === 1
        ? [
            mostRacesRanking[0]?.races ?? "—",
            mostRacesRanking[1]?.races ?? "—",
            mostRacesRanking[2]?.races ?? "—",
          ]
        : statisticsMode === "cm" &&
            currentSlide === 2
          ? [
              mostAppearancesRanking[0]
                ?.appearances ?? "—",
              mostAppearancesRanking[1]
                ?.appearances ?? "—",
              mostAppearancesRanking[2]
                ?.appearances ?? "—",
            ]
          : statisticsMode === "cm" &&
              currentSlide === 3
            ? [
                mostFinalAppearancesRanking[0]
                  ?.finalAppearances ?? "—",
                mostFinalAppearancesRanking[1]
                  ?.finalAppearances ?? "—",
                mostFinalAppearancesRanking[2]
                  ?.finalAppearances ?? "—",
              ]
            : currentSlideData.values

  const showNextSlide = () => {
    const isLastSlide =
      currentSlide === slides.length - 1

    if (isLastSlide) {
      const nextMode =
        getNextStatisticsMode(statisticsMode)

      setIsModeTransition(true)
      setStatisticsMode(nextMode)
      setCurrentSlide(0)

      return
    }

    setIsModeTransition(false)
    setSlideDirection("right")
    setCurrentSlide((current) => current + 1)
  }

  const AUTO_SLIDE_DURATION = 8000

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const isLastSlide =
        currentSlide === slides.length - 1

      if (isLastSlide) {
        setIsModeTransition(true)

        setStatisticsMode((currentMode) =>
          getNextStatisticsMode(currentMode)
        )

        setCurrentSlide(0)

        return
      }

      setIsModeTransition(false)
      setSlideDirection("right")
      setCurrentSlide((current) => current + 1)
    }, AUTO_SLIDE_DURATION)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [currentSlide, statisticsMode, slides.length])

  const currentPlaces =
    statisticsMode === "cm" &&
    currentSlide === 0
      ? [
          mostWinsRanking[0]?.place ?? 1,
          mostWinsRanking[1]?.place ?? 2,
          mostWinsRanking[2]?.place ?? 3,
        ]
      : statisticsMode === "cm" &&
          currentSlide === 1
        ? [
            mostRacesRanking[0]?.place ?? 1,
            mostRacesRanking[1]?.place ?? 2,
            mostRacesRanking[2]?.place ?? 3,
          ]
        : statisticsMode === "cm" &&
            currentSlide === 2
          ? [
              mostAppearancesRanking[0]?.place ?? 1,
              mostAppearancesRanking[1]?.place ?? 2,
              mostAppearancesRanking[2]?.place ?? 3,
            ]
          : statisticsMode === "cm" &&
              currentSlide === 3
            ? [
                mostFinalAppearancesRanking[0]?.place ?? 1,
                mostFinalAppearancesRanking[1]?.place ?? 2,
                mostFinalAppearancesRanking[2]?.place ?? 3,
              ]
            : [1, 2, 3]

  const formatPlace = (place: number) => {
    const isTied =
      currentPlaces.filter(
        (currentPlace) => currentPlace === place
      ).length > 1

    const suffix =
      place === 1
        ? "ST"
        : place === 2
          ? "ND"
          : place === 3
            ? "RD"
            : "TH"

    return isTied
      ? `TIED ${place}${suffix}`
      : `${place}${suffix}`
  }

  const firstPlaceCount =
    currentPlaces.filter(
      (place) => place === 1
    ).length

  const isTripleFirstTie =
    firstPlaceCount === 3

  const showSlide = (index: number) => {
    if (index === currentSlide) return

    setIsModeTransition(false)

    setSlideDirection(
      index > currentSlide ? "right" : "left"
    )

    setCurrentSlide(index)
  }

  return (
    <section
      data-guide="statistics-showcase"
      className="relative px-20 pb-5 pt-6"
    >

      {/* STATISTICS MODE */}
      <div
        data-guide="statistics-modes"
        className="relative z-30 mb-2 flex justify-center gap-16"
      >
        <button
          type="button"
          onClick={() => {
            setIsModeTransition(true)
            setStatisticsMode("cm")
            setCurrentSlide(0)
          }}
          className={`relative pb-2 transition-all duration-300 ${
            statisticsMode === "cm"
              ? "scale-110 text-xl font-black text-white"
              : "text-lg font-semibold text-gray-500 hover:text-gray-300"
          }`}
        >
          CM

          {statisticsMode === "cm" && (
            <span className="absolute inset-x-0 -bottom-0.5 h-1 rounded-full bg-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.75)]" />
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            setIsModeTransition(true)
            setStatisticsMode("loh")
            setCurrentSlide(0)
          }}
          className={`relative pb-2 transition-all duration-300 ${
            statisticsMode === "loh"
              ? "scale-110 text-xl font-black text-white"
              : "text-lg font-semibold text-gray-500 hover:text-gray-300"
          }`}
        >
          LoH

          {statisticsMode === "loh" && (
            <span className="absolute inset-x-0 -bottom-0.5 h-1 rounded-full bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.75)]" />
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            setIsModeTransition(true)
            setStatisticsMode("all")
            setCurrentSlide(0)
          }}
          className={`relative pb-2 transition-all duration-300 ${
            statisticsMode === "all"
              ? "scale-110 text-xl font-black text-white"
              : "text-lg font-semibold text-gray-500 hover:text-gray-300"
          }`}
        >
          Overall

          {statisticsMode === "all" && (
            <span className="absolute inset-x-0 -bottom-0.5 h-1 rounded-full bg-violet-500 shadow-[0_0_12px_rgba(139,92,246,0.75)]" />
          )}
        </button>
      </div>

      {/* SHOWCASE BACKGROUND */}
      <div
        className={`pointer-events-none absolute inset-x-32 top-24 bottom-28 rounded-[4rem] bg-[linear-gradient(to_right,transparent_0%,rgba(10,28,72,0.78)_12%,rgba(14,48,118,0.90)_30%,rgba(14,48,118,0.90)_70%,rgba(10,28,72,0.78)_88%,transparent_100%)] blur-xl transition-opacity duration-700 ease-in-out ${
          statisticsMode === "cm"
            ? "opacity-100"
            : "opacity-0"
        }`}
      />

      <div
        className={`pointer-events-none absolute inset-x-32 top-24 bottom-28 rounded-[4rem] bg-[linear-gradient(to_right,transparent_0%,rgba(72,10,24,0.78)_12%,rgba(125,18,42,0.90)_30%,rgba(125,18,42,0.90)_70%,rgba(72,10,24,0.78)_88%,transparent_100%)] blur-xl transition-opacity duration-700 ease-in-out ${
          statisticsMode === "loh"
            ? "opacity-100"
            : "opacity-0"
        }`}
      />

      <div
        className={`pointer-events-none absolute inset-x-32 top-24 bottom-28 rounded-[4rem] bg-[linear-gradient(to_right,transparent_0%,rgba(52,18,86,0.78)_12%,rgba(91,33,150,0.90)_30%,rgba(91,33,150,0.90)_70%,rgba(52,18,86,0.78)_88%,transparent_100%)] blur-xl transition-opacity duration-700 ease-in-out ${
          statisticsMode === "all"
            ? "opacity-100"
            : "opacity-0"
        }`}
      />

      {/* CENTER GLOW - CM */}
      <div
        className={`pointer-events-none absolute left-1/2 top-[44%] h-[420px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/25 blur-[70px] transition-opacity duration-700 ease-in-out ${
          statisticsMode === "cm"
            ? "opacity-100"
            : "opacity-0"
        }`}
      />

      {/* CENTER GLOW - LOH */}
      <div
        className={`pointer-events-none absolute left-1/2 top-[44%] h-[420px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-rose-700/25 blur-[70px] transition-opacity duration-700 ease-in-out ${
          statisticsMode === "loh"
            ? "opacity-100"
            : "opacity-0"
        }`}
      />

      {/* CENTER GLOW - OVERALL */}
      <div
        className={`pointer-events-none absolute left-1/2 top-[44%] h-[420px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-700/25 blur-[70px] transition-opacity duration-700 ease-in-out ${
          statisticsMode === "all"
            ? "opacity-100"
            : "opacity-0"
        }`}
      />

      {/* ARROWS */}
      <button
        type="button"
        onClick={showPreviousSlide}
        className="absolute left-2 top-1/2 z-20 flex h-16 w-16 -translate-y-1/2 items-center justify-center rounded-full border border-white/50 bg-gray-950/55 text-white shadow-xl backdrop-blur transition hover:scale-110 hover:border-white hover:bg-white/10"
      >
        <svg
          viewBox="0 0 32 32"
          className="h-8 w-8"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19 7 10 16l9 9" />
          <path d="M10 16h13" />
        </svg>
      </button>

      <button
        type="button"
        onClick={showNextSlide}
        className="absolute right-2 top-1/2 z-20 flex h-16 w-16 -translate-y-1/2 items-center justify-center rounded-full border border-white/50 bg-gray-950/55 text-white shadow-xl backdrop-blur transition hover:scale-110 hover:border-white hover:bg-white/10"
      >
        <svg
          viewBox="0 0 32 32"
          className="h-8 w-8"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m13 7 9 9-9 9" />
          <path d="M22 16H9" />
        </svg>
      </button>

      <div
        key={currentSlide}
        className={
          isModeTransition
            ? ""
            : slideDirection === "right"
              ? "showcase-slide-right"
              : "showcase-slide-left"
        }
      >
        {/* PODIUM */}
        <div className="relative z-10 flex min-h-[360px] items-end justify-center gap-6 px-14 pt-12">

          {/* 2ND */}
          <div className="group flex w-[245px] shrink-0 flex-col items-center transition duration-300 ease-out hover:-translate-y-1">

            <div
              className={`relative h-[290px] w-[245px] overflow-hidden rounded-3xl bg-gray-900 shadow-xl transition duration-300 ease-out group-hover:shadow-2xl ${
                isTripleFirstTie &&
                currentPlaces[1] === 1
                  ? "triple-tie-shimmer shadow-[0_0_20px_rgba(236,72,153,0.22)] group-hover:shadow-[0_0_30px_rgba(236,72,153,0.38)]"
                  : currentPlaces[1] === 1
                    ? "animate-[winnerGlow_3s_ease-in-out_infinite] shadow-[0_0_20px_rgba(250,204,21,0.18)] group-hover:shadow-[0_0_30px_rgba(250,204,21,0.38)]"
                    : "border-2 border-gray-400/70 group-hover:border-gray-300"
              }`}
            >
              {currentUmas[1]?.avatar && (
                  <UmaAvatarImage
                    avatar={currentUmas[1].avatar}
                    alt=""
                    className="absolute inset-0 z-0 h-full w-full object-cover object-top"
                  />
                )}

              <div className="absolute inset-x-0 bottom-0 z-10 h-24 bg-gradient-to-t from-black/95 via-black/65 to-transparent" />

              <div className="absolute inset-x-0 bottom-0 z-20 px-4 pb-4 text-center">
                <div className="truncate text-sm font-bold text-white drop-shadow-lg">
                  {currentUmas[1]?.displayName ?? "—"}
                </div>

                <div className="mt-1 text-3xl font-black text-white drop-shadow-lg">
                  {currentValues[1]}
                </div>
              </div>

              {!isTripleFirstTie &&
                currentPlaces[1] === 1 && (
                  <WinnerBorderShimmer
                    id={`left-${statisticsMode}-${currentSlide}`}
                    width={245}
                    height={290}
                  />
                )}
            </div>

            <div
              className={`mt-3 text-4xl font-black ${
                isTripleFirstTie &&
                currentPlaces[1] === 1
                  ? "text-pink-400"
                  : currentPlaces[1] === 1
                    ? "text-yellow-400"
                    : "text-gray-300"
              }`}
            >
              {formatPlace(currentPlaces[1])}
            </div>

          </div>

          {/* 1ST */}
          <div className="group flex -translate-y-6 flex-col items-center transition duration-300 ease-out hover:-translate-y-7">

            <div
              className={`relative h-[330px] w-[280px] rounded-3xl ${
                !isTripleFirstTie &&
                currentPlaces[0] === 1
                  ? "animate-[winnerGlow_3s_ease-in-out_infinite]"
                  : ""
              }`}
            >

              {/* CARD */}
              <div
                className={`absolute inset-0 overflow-hidden rounded-3xl bg-gray-900 transition duration-300 ease-out ${
                  isTripleFirstTie &&
                  currentPlaces[0] === 1
                    ? "triple-tie-shimmer shadow-[0_0_22px_rgba(236,72,153,0.22)] group-hover:shadow-[0_0_32px_rgba(236,72,153,0.38)]"
                    : currentPlaces[0] === 1
                      ? "shadow-[0_0_20px_rgba(250,204,21,0.18)] group-hover:shadow-[0_0_32px_rgba(250,204,21,0.38)]"
                      : ""
                }`}
              >
                {currentUmas[0]?.avatar && (
                  <UmaAvatarImage
                    avatar={currentUmas[0].avatar}
                    alt=""
                    className="absolute inset-0 z-0 h-full w-full object-cover object-top"
                  />
                )}

                {/* BOTTOM GRADIENT */}
                <div className="absolute inset-x-0 bottom-0 z-10 h-24 bg-gradient-to-t from-black/95 via-black/65 to-transparent" />

                {/* NAME + WIN RATE */}
                <div className="absolute inset-x-0 bottom-0 z-20 px-4 pb-4 text-center">

                  <div className="truncate text-sm font-bold text-white drop-shadow-lg">
                    {currentUmas[0]?.displayName ?? "—"}
                  </div>

                  <div className="mt-1 text-4xl font-black text-white drop-shadow-lg">
                    {currentValues[0]}
                  </div>

                </div>
              </div>

              {!isTripleFirstTie &&
                currentPlaces[0] === 1 && (
                  <WinnerBorderShimmer
                    id={`center-${statisticsMode}-${currentSlide}`}
                    width={280}
                    height={330}
                  />
                )}
            </div>

            {/* PODIUM PLACE */}
            <div
              className={`mt-3 text-4xl font-black ${
                isTripleFirstTie
                  ? "text-pink-400"
                  : "text-yellow-400"
              }`}
            >
              {formatPlace(currentPlaces[0])}
            </div>

          </div>

          {/* 3RD */}
          <div className="group flex w-[245px] shrink-0 flex-col items-center transition duration-300 ease-out hover:-translate-y-1">

            <div
              className={`relative h-[255px] w-[215px] overflow-hidden rounded-3xl bg-gray-900 shadow-lg transition duration-300 ease-out group-hover:shadow-2xl ${
                isTripleFirstTie &&
                currentPlaces[2] === 1
                  ? "triple-tie-shimmer shadow-[0_0_20px_rgba(236,72,153,0.22)] group-hover:shadow-[0_0_30px_rgba(236,72,153,0.38)]"
                  : "border-2 border-orange-500/70 group-hover:border-orange-300"
              }`}
            >
              {currentUmas[2]?.avatar && (
                <UmaAvatarImage
                  avatar={currentUmas[2].avatar}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover object-top"
                />
              )}

              <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/95 via-black/65 to-transparent" />

              <div className="absolute inset-x-0 bottom-0 px-4 pb-4 text-center">
                <div className="truncate text-sm font-bold text-white drop-shadow-lg">
                  {currentUmas[2]?.displayName ?? "—"}
                </div>

                <div className="mt-1 text-3xl font-black text-white drop-shadow-lg">
                  {currentValues[2]}
                </div>
              </div>
            </div>

            <div
              className={`mt-3 text-4xl font-black ${
                isTripleFirstTie &&
                currentPlaces[2] === 1
                  ? "text-pink-400"
                  : "text-orange-400"
              }`}
            >
              {formatPlace(currentPlaces[2])}
            </div>

          </div>

        </div>

        {/* SLIDE TITLE */}
        <div className="relative z-10 mt-5 text-center">
          <div className="text-3xl font-black uppercase tracking-wide text-white">
            {currentSlideData.title}
          </div>
        </div>

      </div>

      {/* STATIC SLIDER NAVIGATION */}
      <div className="relative z-10 text-center">
        <div className="mx-auto mt-3 h-1 w-3/4 overflow-hidden rounded-full bg-white/10">
          <div
            key={`${statisticsMode}-${currentSlide}`}
            className={`statistics-progress h-full rounded-full ${
              statisticsMode === "cm"
                ? "bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.7)]"
                : statisticsMode === "loh"
                  ? "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.7)]"
                  : "bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.7)]"
            }`}
            style={{
              animationDuration: `${AUTO_SLIDE_DURATION}ms`,
            }}
          />
        </div>

        <div className="mt-4 flex justify-center gap-2">
          {slides.map((slide, index) => (
            <button
              key={slide.title}
              type="button"
              onClick={() => showSlide(index)}
              className={`h-2.5 w-2.5 rounded-full transition ${
                currentSlide === index
                  ? statisticsMode === "cm"
                    ? "bg-sky-400"
                    : statisticsMode === "loh"
                      ? "bg-rose-500"
                      : "bg-violet-500"
                  : "bg-gray-600 hover:bg-gray-400"
              }`}
              aria-label={`Show ${slide.title}`}
            />
          ))}
        </div>
      </div>

    </section>
  )
}

export default StatisticsShowcase
