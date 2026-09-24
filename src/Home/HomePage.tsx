import { useEffect, useState } from "react"
import type { CM } from "../types/types"
import { getTrackImage } from "../data/trackData"
import { useUmaDatabase } from "../context/UmaDatabaseContext"
import UmaAvatarImage from "../components/UmaAvatarImage"
import { changelog } from "../data/changelogData"
import { calculateFinalQualificationFromAttempts } from "../CMs/CMCalculations"
import { latestAddedUmaVersions } from "../data/umaData"
import {
  loadFavoriteUmaIdFromStore,
  saveFavoriteUmaIdToStore,
} from "../storage/appStore"

import {
  loadProfileData,
  updateProfileData,
} from "../profiles/profileDataStore"


type HomePageProps = {
  cms: CM[]
  profileId?: string | null
  onOpenChangelog: () => void
}

function HomePage({
  cms,
  profileId = null,
  onOpenChangelog,
}: HomePageProps) {

const { versions } = useUmaDatabase()
const latestChangelog = changelog[0]


const [favoriteUmaId, setFavoriteUmaId] =
  useState("")

const [
  loadedFavoriteProfileId,
  setLoadedFavoriteProfileId,
] = useState<
  string | null | undefined
>(undefined)

useEffect(() => {
  let cancelled = false

  const loadFavoriteUma = async () => {
    setLoadedFavoriteProfileId(undefined)

    if (profileId) {
      const profileData =
        await loadProfileData(profileId)

      if (
        cancelled ||
        !profileData
      ) {
        return
      }

      setFavoriteUmaId(
        profileData.favoriteUmaId
      )

      setLoadedFavoriteProfileId(
        profileId
      )

      return
    }

    const savedFavoriteUmaId =
      await loadFavoriteUmaIdFromStore()

    if (cancelled) {
      return
    }

    setFavoriteUmaId(
      savedFavoriteUmaId
    )

    setLoadedFavoriteProfileId(null)
  }

  void loadFavoriteUma()

  return () => {
    cancelled = true
  }
}, [profileId])

const [isFavoriteEditOpen, setIsFavoriteEditOpen] =
  useState(false)

const favoriteUma =
  versions.find(
    (version) =>
      version.id === favoriteUmaId
  ) ?? null

const handleFavoriteUmaChange = (
  versionId: string
) => {
  if (
    loadedFavoriteProfileId !==
    profileId
  ) {
    return
  }

  setFavoriteUmaId(versionId)

  if (profileId) {
    void updateProfileData(
      profileId,
      (currentData) => ({
        ...currentData,
        favoriteUmaId: versionId,
      })
    )

    return
  }

  void saveFavoriteUmaIdToStore(
    versionId
  )
}
  const finalACount = cms.filter(
  (cm) =>
    calculateFinalQualificationFromAttempts(
      cm.attempts ?? []
    ) === "Final A"
    ).length

  const finalWins = cms.filter(
  (cm) => cm.finalPlace === "1st"
).length

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

const totalWins = cms.reduce(
  (total, cm) =>
    total +
    (cm.attempts ?? []).reduce(
      (attemptTotal, attempt) =>
        attemptTotal +
        (attempt.umaWins ?? []).reduce(
          (wins, uma) => wins + uma.wins,
          0
        ),
      0
    ),
  0
)

const overallWinRate =
  totalRaces > 0
    ? (totalWins / totalRaces) * 100
    : 0

  const latestCm =
    cms.length > 0 ? cms[cms.length - 1] : null
  
  const latestTrackImage = latestCm
    ? getTrackImage(latestCm.track)
    : null  

  const latestDisplayedLineup = latestCm
  ? latestCm.phase === "finalResult" ||
    latestCm.phase === "completed"
    ? latestCm.participants
        .filter(
          (participant) =>
            participant.finalParticipant
        )
        .map(
          (participant) =>
            participant.cmUmaId
        )
    : latestCm.currentLineup
  : []

const latestRaceCount =
  latestCm?.attempts.reduce(
    (total, attempt) =>
      total + attempt.racesPlayed,
    0
  ) ?? 0

const latestWinCount =
  latestCm?.attempts.reduce(
    (total, attempt) =>
      total +
      attempt.umaWins.reduce(
        (wins, uma) => wins + uma.wins,
        0
      ),
    0
  ) ?? 0

const latestWinRate =
  latestRaceCount > 0
    ? (latestWinCount / latestRaceCount) * 100
    : null


  const favoriteAppearances = favoriteUma
  ? cms.filter((cm) =>
      (cm.participants ?? []).some(
        (participant) =>
          participant.umaId === favoriteUma.id
      )
    ).length
  : 0

const favoriteRaceWins = favoriteUma
  ? cms.reduce((total, cm) => {
      const favoriteParticipantIds =
        new Set(
          (cm.participants ?? [])
            .filter(
              (participant) =>
                participant.umaId ===
                favoriteUma.id
            )
            .map(
              (participant) =>
                participant.cmUmaId
            )
        )

      return (
        total +
        (cm.attempts ?? []).reduce(
          (attemptTotal, attempt) =>
            attemptTotal +
            (attempt.umaWins ?? []).reduce(
              (wins, result) =>
                favoriteParticipantIds.has(
                  result.cmUmaId
                )
                  ? wins + result.wins
                  : wins,
              0
            ),
          0
        )
      )
    }, 0)
  : 0

const favoriteRaceCount = favoriteUma
  ? cms.reduce((total, cm) => {
      const favoriteParticipantIds =
        new Set(
          (cm.participants ?? [])
            .filter(
              (participant) =>
                participant.umaId ===
                favoriteUma.id
            )
            .map(
              (participant) =>
                participant.cmUmaId
            )
        )

      return (
        total +
        (cm.attempts ?? []).reduce(
          (attemptTotal, attempt) => {
            const wasUsed =
              (attempt.umaWins ?? []).some(
                (result) =>
                  favoriteParticipantIds.has(
                    result.cmUmaId
                  )
              )

            return wasUsed
              ? attemptTotal +
                  attempt.racesPlayed
              : attemptTotal
          },
          0
        )
      )
    }, 0)
  : 0


const favoriteWinRate =
  favoriteRaceCount > 0
    ? (favoriteRaceWins /
        favoriteRaceCount) *
      100
    : null

const favoriteFinalAppearances = favoriteUma
  ? cms.filter((cm) =>
      (cm.participants ?? []).some(
        (participant) =>
          participant.umaId === favoriteUma.id &&
          participant.finalParticipant
      )
    ).length
  : 0

const favoriteFinalWins = favoriteUma
  ? cms.filter((cm) =>
      (cm.participants ?? []).some(
        (participant) =>
          participant.umaId === favoriteUma.id &&
          participant.won
      )
    ).length
  : 0

  const [favoriteSearchText, setFavoriteSearchText] =
  useState("")

  const [isFavoriteSearchOpen, setIsFavoriteSearchOpen] =
    useState(false)

    const normalizeFavoriteSearch = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")

const getSearchDistance = (
  first: string,
  second: string
) => {
  const matrix = Array.from(
    { length: first.length + 1 },
    () =>
      Array(second.length + 1).fill(0)
  )

  for (let i = 0; i <= first.length; i++) {
    matrix[i][0] = i
  }

  for (let j = 0; j <= second.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= first.length; i++) {
    for (let j = 1; j <= second.length; j++) {
      const cost =
        first[i - 1] === second[j - 1]
          ? 0
          : 1

      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      )
    }
  }

  return matrix[first.length][second.length]
}

const favoriteSearchQuery =
  normalizeFavoriteSearch(
    favoriteSearchText
  )

const favoriteUmaSuggestions =
  favoriteSearchQuery === ""
    ? []
    : versions
        .filter((version) => !version.archived)
        .map((version) => {
          const normalizedName =
            normalizeFavoriteSearch(
              version.displayName
            )

          let score = 1000

          if (
            normalizedName ===
            favoriteSearchQuery
          ) {
            score = 0
          } else if (
            normalizedName.startsWith(
              favoriteSearchQuery
            )
          ) {
            score = 1
          } else if (
            normalizedName.includes(
              favoriteSearchQuery
            )
          ) {
            score = 2
          } else {
            score =
              10 +
              getSearchDistance(
                favoriteSearchQuery,
                normalizedName.slice(
                  0,
                  favoriteSearchQuery.length
                )
              )
          }

          return {
            version,
            score,
          }
        })
        .sort((a, b) => {
          if (a.score !== b.score) {
            return a.score - b.score
          }

          return a.version.displayName.localeCompare(
            b.version.displayName
          )
        })
        .slice(0, 6)
        
        

  return (
    <div className="space-y-8">

      {/* PAGE HEADER */}
      <section>
        <h1 className="text-3xl font-black text-white">
          Home
        </h1>

        <p className="mt-2 text-gray-400">
          Overview of your Umamusume competitive career.
        </p>
      </section>
      {/* WHAT'S NEW */}
      {latestChangelog && (
        <section
        data-guide="home-whats-new"
        className="relative overflow-hidden rounded-2xl border border-sky-400/20 bg-gray-950/75 shadow-xl"
      >
          <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-sky-500/[0.08] blur-3xl" />

          <div className="relative flex items-center justify-between gap-6 px-5 py-4">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-300/60">
                What's New
              </div>

              <div className="mt-1 text-lg font-black text-white">
                Umamusume Personal Competitive Tracker v{latestChangelog.version}
              </div>

              <div className="mt-1 text-sm text-blue-100/40">
                View the latest changes and improvements to Umamusume Personal Competitive Tracker.
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenChangelog}
              className="shrink-0 rounded-lg border border-sky-300/20 bg-sky-400/[0.08] px-4 py-2 text-xs font-black text-sky-200 transition hover:border-sky-300/35 hover:bg-sky-400/[0.14]"
            >
              View Changelog →
            </button>
          </div>
        </section>
      )}
      {/* MAIN CARDS */}
      <section className="grid gap-5 md:grid-cols-2">

        {/* CHAMPIONS MEETING */}
        <div
          data-guide="home-competitive-record"
          className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-sky-400/20 bg-gray-950/75 shadow-xl">

          <div className="pointer-events-none absolute -left-10 top-0 h-36 w-36 rounded-full bg-blue-500/[0.08] blur-3xl" />
          <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-full bg-violet-500/[0.06] blur-3xl" />

          <div className="relative border-b border-white/[0.07] px-5 py-4">
            <div className="flex items-center justify-between">

              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-300/60">
                  Competitive Record
                </div>

                <div className="mt-0.5 text-sm font-black uppercase tracking-wider text-white">
                  Champions Meeting
                </div>
              </div>

              <svg
                viewBox="0 0 32 24"
                className="h-6 w-8 text-sky-300/35"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M4 19h24l2-12-7 5-7-9-7 9-7-5 2 12Zm2 2h20v2H6v-2Z" />
              </svg>

            </div>
          </div>

         <div className="relative grid flex-1 grid-cols-2">

            {/* EVENTS */}
            <div className="border-b border-r border-white/[0.06] px-5 py-4">
              <div className="text-[9px] font-black uppercase tracking-[0.15em] text-blue-100/30">
                Events
              </div>

              <div className="mt-1 text-2xl font-black tabular-nums text-white">
                {cms.length}
              </div>
            </div>

            {/* A FINALS */}
          <div className="border-b border-white/[0.06] px-5 py-4">
            <div className="text-[9px] font-black uppercase tracking-[0.15em] text-blue-100/30">
              A Finals
            </div>

            <div className="mt-1 text-2xl font-black tabular-nums text-white">
              {finalACount}
            </div>
          </div>

            {/* FINAL WINS */}
            <div className="border-r border-white/[0.06] px-5 py-4">
              <div className="text-[9px] font-black uppercase tracking-[0.15em] text-violet-200/40">
                Final Wins
              </div>

              <div className="mt-1 text-2xl font-black tabular-nums text-violet-200">
                {finalWins}
              </div>
            </div>

            {/* WIN RATE */}
            <div className="px-5 py-4">
              <div className="text-[9px] font-black uppercase tracking-[0.15em] text-sky-200/40">
                Win Rate
              </div>

              <div className="mt-1 text-2xl font-black tabular-nums text-sky-200">
                {overallWinRate.toFixed(2)}%
              </div>
            </div>

          </div>

        </div>
        {/* LATEST ADDED UMAS */}
<div className="relative overflow-hidden rounded-2xl border border-violet-400/20 bg-gray-950/75 shadow-xl">

  <div className="pointer-events-none absolute -right-10 top-0 h-36 w-36 rounded-full bg-violet-500/[0.08] blur-3xl" />

  <div className="relative border-b border-white/[0.07] px-5 py-4">
    <div className="flex items-center justify-between">

      <div>
        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-300/60">
          Latest Added
        </div>

        <div className="mt-0.5 text-sm font-black uppercase tracking-wider text-white">
          Latest Added Umas
        </div>
      </div>

      <svg
          viewBox="0 0 24 24"
          className="h-6 w-6 text-violet-300/35"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 3l1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3Z" />
          <path d="M19 14l.7 2.3L22 17l-2.3.7L19 20l-.7-2.3L16 17l2.3-.7L19 14Z" />
          <path d="M5 13l.6 1.9L7.5 15l-1.9.6L5 17.5l-.6-1.9L2.5 15l1.9-.6L5 13Z" />
        </svg>

    </div>
  </div>

  <div className="relative px-5 py-4">
    {latestAddedUmaVersions.length > 0 ? (
      <div className="grid grid-cols-2 gap-3">
        {latestAddedUmaVersions.map(
          (version) => (
            <div
              key={version.id}
              className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-black/15 px-3 py-3"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-violet-300/15 bg-black/20">
                {version.avatar ? (
                  <UmaAvatarImage
                    avatar={version.avatar}
                    alt={version.displayName}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <span className="font-black text-blue-100/25">
                    ?
                  </span>
                )}
              </div>

              <div className="min-w-0">
                <div className="mt-1 text-sm font-black leading-tight text-white">
                  {version.displayName}
                </div>
              </div>
            </div>
          )
        )}
      </div>
    ) : (
      <div className="flex min-h-[116px] items-center justify-center text-sm font-semibold text-blue-100/30">
        No recently added Umas.
      </div>
    )}
  </div>

</div>
      </section>


{/* CURRENT EVENT + FAVORITE UMA */}
<section className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.75fr)_minmax(320px,0.75fr)]">

      {/* LATEST CM */}
<section
  data-guide="home-latest-cm"
  className="relative overflow-hidden rounded-2xl border border-sky-400/20 bg-gray-950/80 shadow-xl"
>

  {latestCm && latestTrackImage && (
    <img
      src={latestTrackImage}
      alt={latestCm.track}
      className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-35"
    />
  )}

  <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-gray-950 via-gray-950/90 to-gray-950/55" />
  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-gray-950/80 via-transparent to-gray-950/45" />

  <div className="relative z-10">

    <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
      <div>
        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-300/60">
          Current Event
        </div>

        <div className="mt-0.5 text-lg font-black text-white">
          Latest Champions Meeting
        </div>
      </div>

      {latestCm && (
        <div className="text-right">
          <div className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-100/30">
            CM
          </div>

          <div className="text-lg font-black text-sky-300">
            #{latestCm.number}
          </div>
        </div>
      )}
    </div>

    {latestCm ? (
      <div className="px-5 py-5">

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center">

          <div className="min-w-0">
            <div className="text-2xl font-black tracking-tight text-white">
              {latestCm.name || "Unnamed CM"}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">

              <div className="rounded-lg border border-white/[0.08] bg-black/25 px-3 py-1.5 text-sm font-bold text-white">
                {latestCm.track || "—"}
              </div>

              <div
                className={`rounded-lg px-3 py-1.5 text-sm font-black ${
                  latestCm.surface === "Turf"
                    ? "bg-emerald-900/80 text-emerald-200"
                    : "bg-amber-900/80 text-amber-200"
                }`}
              >
                {latestCm.surface}
              </div>

              <div className="rounded-lg border border-white/[0.08] bg-black/25 px-3 py-1.5 text-sm font-bold text-white">
                {latestCm.distance}m
              </div>

              <div className="rounded-lg border border-white/[0.08] bg-black/25 px-3 py-1.5 text-sm font-bold text-white">
                {latestCm.length}
              </div>

            </div>
          </div>
           <div className="flex items-center gap-5">

          {/* TEAM LINEUP */}
          <div>
            <div className="mb-2 text-[9px] font-black uppercase tracking-[0.16em] text-blue-100/30">
              Team Lineup
            </div>

            <div className="flex items-center gap-2">
              {latestDisplayedLineup.length > 0 ? (
                latestDisplayedLineup.map((cmUmaId) => {
                  const participant =
                    latestCm.participants.find(
                      (item) =>
                        item.cmUmaId === cmUmaId
                    )

                  if (!participant) return null

                  const version = versions.find(
                    (item) =>
                      item.id === participant.umaId
                  )

                  if (!version) return null

                  return (
                    <div
                      key={participant.cmUmaId}
                      title={version.displayName}
                      className={`relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-black/25 ${
                        participant.won
                          ? "border-yellow-300/70 ring-1 ring-yellow-300/45"
                          : "border-white/[0.10]"
                      }`}
                    >
                      {version.avatar ? (
                        <UmaAvatarImage
                          avatar={version.avatar}
                          alt={version.displayName}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <span className="font-black text-blue-100/30">
                          ?
                        </span>
                      )}

                      {participant.ace && (
                        <span className="absolute bottom-0.5 left-1 text-[9px] text-yellow-300">
                          ★
                        </span>
                      )}
                    </div>
                  )
                })
              ) : (
                <div className="text-sm font-semibold text-blue-100/25">
                  No lineup
                </div>
              )}
            </div>
          </div>

          {/* WIN RATE */}
          <div className="border-l border-white/[0.07] pl-5 text-right">
            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-blue-100/30">
              Win Rate
            </div>

            <div className="mt-1 text-xl font-black tabular-nums text-white">
              {latestWinRate !== null
                ? `${latestWinRate.toFixed(2)}%`
                : "—"}
            </div>

            <div className="mt-0.5 text-[10px] font-medium text-blue-100/30">
              {latestWinCount} / {latestRaceCount}
            </div>
          </div>

        </div>       

          <div className="shrink-0 rounded-xl border border-white/[0.08] bg-black/25 px-4 py-3 text-right backdrop-blur-sm">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-blue-100/35">
            Status
          </div>

          <div className="mt-1 font-black text-sky-200">
            {latestCm.phase
              .replace(/([A-Z])/g, " $1")
              .replace(/^./, (letter) =>
                letter.toUpperCase()
              )}
          </div>

          <div className="mt-3 border-t border-white/[0.07] pt-2">
            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-blue-100/30">
              Final Place
            </div>

            <div
              className={`mt-1 font-black ${
                latestCm.finalPlace === "1st"
                  ? "text-yellow-300"
                  : latestCm.finalPlace === "2nd"
                    ? "text-gray-200"
                    : latestCm.finalPlace === "3rd"
                      ? "text-orange-300"
                      : "text-blue-100/45"
              }`}
            >
              {latestCm.finalPlace || "—"}
            </div>
          </div>
        </div>

        </div>

        <div className="mt-5 border-t border-white/[0.07] pt-4">

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold text-blue-100/55">

            <span>{latestCm.direction || "—"}</span>

            <span className="text-sky-400/30">|</span>

            <span>{latestCm.weather || "—"}</span>

            <span className="text-sky-400/30">|</span>

            <span>{latestCm.season || "—"}</span>

            <span className="text-sky-400/30">|</span>

            <span>{latestCm.condition || "—"}</span>

          </div>

        </div>

      </div>
    ) : (
      <div className="relative py-14 text-center">
        <div className="font-bold text-gray-300">
          No Champions Meetings yet.
        </div>

        <div className="mt-2 text-sm text-gray-600">
          Your latest CM will appear here.
        </div>
      </div>
    )}

  </div>
</section>
{/* FAVORITE UMA */}
<section
  data-guide="home-favorite-uma"
  className="relative overflow-hidden rounded-2xl border border-violet-400/20 bg-gray-950/80 shadow-xl"
>

  <div className="pointer-events-none absolute -right-12 -top-10 h-44 w-44 rounded-full bg-violet-500/[0.10] blur-3xl" />
  <div className="pointer-events-none absolute -bottom-12 -left-8 h-36 w-36 rounded-full bg-sky-500/[0.06] blur-3xl" />

  <div className="relative z-10">

    {/* HEADER */}
    <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">

      <div>
        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-300/55">
          Personal Pick
        </div>

        <div className="mt-0.5 text-lg font-black text-white">
          Favorite Uma
        </div>
      </div>

      <div className="flex items-center gap-1.5">

        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5 text-violet-300/45"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="m12 2.8 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z" />
        </svg>

        <button
          type="button"
          onClick={() => {
            const nextState =
              !isFavoriteEditOpen

            setIsFavoriteEditOpen(nextState)

            if (nextState) {
              setFavoriteSearchText("")
              setIsFavoriteSearchOpen(true)
            } else {
              setIsFavoriteSearchOpen(false)
            }
          }}
          title="Change Favorite Uma"
          className={`flex h-7 w-7 items-center justify-center rounded-md border transition ${
            isFavoriteEditOpen
              ? "border-violet-300/30 bg-violet-400/[0.10] text-violet-200"
              : "border-white/[0.07] bg-black/10 text-blue-100/30 hover:border-violet-300/20 hover:text-violet-200"
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5"
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
        </button>

      </div>
      

    </div>

    {favoriteUma ? (
      <div className="relative px-5 py-4">

       {/* UMA */}
      <div className="flex flex-col items-center text-center">

        <div className="mt-3 flex h-36 w-36 items-center justify-center overflow-hidden rounded-2xl border border-violet-300/20 bg-black/20 shadow-[0_0_30px_rgba(139,92,246,0.12)]">
          {favoriteUma.avatar ? (
            <UmaAvatarImage
              avatar={favoriteUma.avatar}
              alt={favoriteUma.displayName}
              className="h-full w-full object-contain"
            />
          ) : (
            <span className="text-3xl font-black text-blue-100/20">
              ?
            </span>
          )}
        </div>

        <div className="mt-3 max-w-[280px] text-xl font-black leading-tight text-white [text-wrap:balance]">
          {favoriteUma.displayName}
        </div>

      </div>

        {/* STATS */}
          <div className="mt-4 grid grid-cols-3 overflow-hidden rounded-lg border border-white/[0.06] bg-black/15">

            {/* CM EVENTS */}
            <div className="border-b border-white/[0.06] px-3 py-3">
              <div className="text-[8px] font-black uppercase tracking-[0.14em] text-blue-100/30">
                CM Events
              </div>

              <div className="mt-1 text-lg font-black tabular-nums text-white">
                {favoriteAppearances}
              </div>
            </div>

            {/* FINALS */}
            <div className="border-b border-l border-white/[0.06] px-3 py-3">
              <div className="text-[8px] font-black uppercase tracking-[0.14em] text-blue-100/30">
                Finals
              </div>

              <div className="mt-1 text-lg font-black tabular-nums text-violet-200">
                {favoriteFinalAppearances}
              </div>
            </div>

            {/* CM WINS */}
            <div className="border-b border-l border-white/[0.06] px-3 py-3">
              <div className="text-[8px] font-black uppercase tracking-[0.14em] text-amber-200/35">
                CM Wins
              </div>

              <div className="mt-1 text-lg font-black tabular-nums text-amber-300">
                {favoriteFinalWins}
              </div>
            </div>

            {/* RACES */}
            <div className="px-3 py-3">
              <div className="text-[8px] font-black uppercase tracking-[0.14em] text-blue-100/30">
                Races
              </div>

              <div className="mt-1 text-lg font-black tabular-nums text-white">
                {favoriteRaceCount}
              </div>
            </div>

            {/* RACE WINS */}
            <div className="border-l border-white/[0.06] px-3 py-3">
              <div className="text-[8px] font-black uppercase tracking-[0.14em] text-blue-100/30">
                Race Wins
              </div>

              <div className="mt-1 text-lg font-black tabular-nums text-violet-200">
                {favoriteRaceWins}
              </div>
            </div>

            {/* WIN RATE */}
            <div className="border-l border-white/[0.06] px-3 py-3">
              <div className="text-[8px] font-black uppercase tracking-[0.14em] text-blue-100/30">
                Win Rate
              </div>

              <div className="mt-1 text-lg font-black tabular-nums text-sky-200">
                {favoriteWinRate !== null
                  ? `${favoriteWinRate.toFixed(2)}%`
                  : "—"}
              </div>
            </div>

           </div>

          </div>
        ) : (
          <div className="relative flex min-h-[220px] flex-col items-center justify-center px-5 py-6 text-center">

        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-violet-300/20 bg-violet-400/[0.06] text-violet-200/60">
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="m12 2.8 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z" />
          </svg>
        </div>

        <div className="mt-3 text-sm font-black text-white">
          Choose your Favorite Uma
        </div>

        <div className="mt-1 text-xs text-blue-100/35">
          Your favorite will appear here on Home.
        </div>
      </div>
    )}
    {/* CHANGE FAVORITE */}
        {isFavoriteEditOpen && (
          <div className="mt-4 border-t border-white/[0.06] pt-3">

            <div className="mb-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-violet-200/40">
              Change Favorite
            </div>
            <div>
  <div className="relative">
    <svg
      viewBox="0 0 24 24"
      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-100/25"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </svg>

    <input
      type="text"
      value={favoriteSearchText}
      onChange={(e) => {
        setFavoriteSearchText(e.target.value)
        setIsFavoriteSearchOpen(true)
      }}
      onFocus={() =>
        setIsFavoriteSearchOpen(true)
      }
      placeholder="Search Uma..."
      className="h-10 w-full rounded-lg border border-violet-300/15 bg-[#091522] pl-9 pr-3 text-xs font-semibold text-white outline-none placeholder:text-blue-100/25 focus:border-violet-300/35"
    />
  </div>

  {isFavoriteSearchOpen && (
    <div className={`${
  favoriteSearchQuery === ""
    ? "pt-2"
    : "mt-2 max-h-48 overflow-y-auto rounded-lg border border-white/[0.08] bg-[#07111f] p-1.5"
}`}>

      {favoriteSearchQuery === "" ? (
      <div className="px-1 pt-2 text-center text-[10px] font-medium text-blue-100/25">
        Start typing to search for an Uma.
      </div>
    ) : favoriteUmaSuggestions.length > 0 ? (
        favoriteUmaSuggestions.map(
          ({ version }) => (
            <button
              key={version.id}
              type="button"
              onClick={() => {
                handleFavoriteUmaChange(
                  version.id
                )

                setFavoriteSearchText(
                  version.displayName
                )

                setIsFavoriteSearchOpen(false)
                setIsFavoriteEditOpen(false)
              }}
              className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition ${
                version.id === favoriteUmaId
                  ? "bg-violet-400/[0.10]"
                  : "hover:bg-white/[0.04]"
              }`}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-black/25">
                {version.avatar ? (
                  <UmaAvatarImage
                    avatar={version.avatar}
                    alt={version.displayName}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <span className="font-black text-blue-100/20">
                    ?
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1 text-xs font-bold text-white/90">
                {version.displayName}
              </div>

              {version.id === favoriteUmaId && (
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4 shrink-0 text-violet-300"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="m12 2.8 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z" />
                </svg>
              )}
            </button>
          )
        )
      ) : (
        <div className="px-3 py-4 text-center text-xs text-blue-100/30">
          No matching Uma found.
        </div>
      )}

    </div>
  )}
</div>

 </div>
  )}

  </div>
</section>

</section>

    </div>
  )
}

export default HomePage