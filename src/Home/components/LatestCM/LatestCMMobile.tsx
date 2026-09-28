import UmaAvatarImage from "../../../components/UmaAvatarImage"
import { useUmaDatabase } from "../../../context/UmaDatabaseContext"

import type { LatestCMProps } from "./LatestCM"

function LatestCMMobile({
  latestCm,
  latestTrackImage,
  latestDisplayedLineup,
  latestWinRate,
  latestWinCount,
  latestRaceCount,
  onOpenCm,
}: LatestCMProps) {
  const { versions } = useUmaDatabase()

  return (
    <section
      data-guide="home-latest-cm"
      className="relative overflow-hidden rounded-2xl border border-sky-400/20 bg-gray-950/80 shadow-xl"
    >
      {latestCm &&
        latestTrackImage && (
          <img
            src={latestTrackImage}
            alt={latestCm.track}
            className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-60 brightness-110"
          />
        )}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-gray-950/65 via-gray-950/50 to-gray-950/70" />

      <div className="relative z-10">

        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">

          <div className="min-w-0">
            <div className="text-[9px] font-black uppercase tracking-[0.18em] text-sky-300/60">
              Current Event
            </div>

            <div className="mt-0.5 text-base font-black text-white">
              Latest Champions Meeting
            </div>
          </div>

          {latestCm && (
            <div className="ml-3 shrink-0 text-right">

              <div className="text-[8px] font-black uppercase tracking-[0.14em] text-blue-100/30">
                CM
              </div>

              <div className="text-lg font-black text-sky-300">
                #{latestCm.number}
              </div>

            </div>
          )}

        </div>

        {latestCm ? (
          <div className="px-4 py-4">

            {/* EVENT */}
            <div className="text-xl font-black tracking-tight text-white">
              {latestCm.name ||
                "Unnamed CM"}
            </div>

            {/* TRACK */}
            <div className="mt-3 flex flex-wrap gap-2">

              <div className="rounded-lg border border-white/[0.08] bg-black/30 px-3 py-1.5 text-xs font-bold text-white">
                {latestCm.track || "—"}
              </div>

              <div
                className={`rounded-lg px-3 py-1.5 text-xs font-black ${
                  latestCm.surface ===
                  "Turf"
                    ? "bg-emerald-900/80 text-emerald-200"
                    : "bg-amber-900/80 text-amber-200"
                }`}
              >
                {latestCm.surface}
              </div>

              <div className="rounded-lg border border-white/[0.08] bg-black/30 px-3 py-1.5 text-xs font-bold text-white">
                {latestCm.distance}m
              </div>

              <div className="rounded-lg border border-white/[0.08] bg-black/30 px-3 py-1.5 text-xs font-bold text-white">
                {latestCm.length}
              </div>

            </div>

            {/* LINEUP + STATUS */}
            <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">

              <div className="min-w-0">

                <div className="mb-2 text-[9px] font-black uppercase tracking-[0.16em] text-blue-100/30">
                  Team Lineup
                </div>

                <div className="flex items-center gap-2">

                  {latestDisplayedLineup.length >
                  0 ? (
                    latestDisplayedLineup.map(
                      (cmUmaId) => {
                        const participant =
                          latestCm.participants.find(
                            (item) =>
                              item.cmUmaId ===
                              cmUmaId
                          )

                        if (!participant) {
                          return null
                        }

                        const version =
                          versions.find(
                            (item) =>
                              item.id ===
                              participant.umaId
                          )

                        if (!version) {
                          return null
                        }

                        return (
                          <div
                            key={
                              participant.cmUmaId
                            }
                            title={
                              version.displayName
                            }
                            className={`relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-black/30 ${
                              participant.won
                                ? "border-yellow-300/70 ring-1 ring-yellow-300/45"
                                : "border-white/[0.10]"
                            }`}
                          >
                            {version.avatar ? (
                              <UmaAvatarImage
                                avatar={
                                  version.avatar
                                }
                                alt={
                                  version.displayName
                                }
                                className="h-full w-full object-contain"
                              />
                            ) : (
                              <span className="font-black text-blue-100/30">
                                ?
                              </span>
                            )}

                            {participant.ace && (
                              <span className="absolute bottom-0.5 left-1 text-[8px] text-yellow-300">
                                ★
                              </span>
                            )}
                          </div>
                        )
                      }
                    )
                  ) : (
                    <div className="text-xs font-semibold text-blue-100/25">
                      No lineup
                    </div>
                  )}

                </div>
              </div>

              <div className="min-w-[112px] rounded-xl border border-white/[0.08] bg-black/30 px-3 py-3 text-right backdrop-blur-sm">

                <div className="text-[8px] font-black uppercase tracking-[0.14em] text-blue-100/35">
                  Status
                </div>

                <div className="mt-1 text-sm font-black leading-tight text-sky-200">
                  {latestCm.phase
                    .replace(
                      /([A-Z])/g,
                      " $1"
                    )
                    .replace(
                      /^./,
                      (letter) =>
                        letter.toUpperCase()
                    )}
                </div>

                <div className="mt-2 border-t border-white/[0.07] pt-2">

                  <div className="text-[8px] font-black uppercase tracking-[0.14em] text-blue-100/30">
                    Final Place
                  </div>

                  <div
                    className={`mt-1 text-sm font-black ${
                      latestCm.finalPlace ===
                      "1st"
                        ? "text-yellow-300"
                        : latestCm.finalPlace ===
                            "2nd"
                          ? "text-gray-200"
                          : latestCm.finalPlace ===
                              "3rd"
                            ? "text-orange-300"
                            : "text-blue-100/45"
                    }`}
                  >
                    {latestCm.finalPlace ||
                      "—"}
                  </div>

                </div>
              </div>

            </div>

            {/* WIN RATE */}
            <div className="mt-4 flex items-center justify-between rounded-xl border border-white/[0.08] bg-black/45 px-4 py-3 backdrop-blur-sm">

              <div>
                <div className="text-[9px] font-black uppercase tracking-[0.16em] text-blue-100/30">
                  Win Rate
                </div>

                <div className="mt-0.5 text-xl font-black tabular-nums text-sky-200">
                  {latestWinRate !== null
                    ? `${latestWinRate.toFixed(
                        2
                      )}%`
                    : "—"}
                </div>
              </div>

              <div className="text-right">
                <div className="text-[9px] font-black uppercase tracking-[0.16em] text-blue-100/30">
                  Wins / Races
                </div>

                <div className="mt-0.5 text-sm font-black tabular-nums text-white">
                  {latestWinCount} /{" "}
                  {latestRaceCount}
                </div>
              </div>

            </div>

            {/* CONDITIONS */}
            <div className="mt-4 border-t border-white/[0.07] pt-3">

              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold text-blue-100/55">

                <span>
                  {latestCm.direction ||
                    "—"}
                </span>

                <span className="text-sky-400/30">
                  ·
                </span>

                <span>
                  {latestCm.weather ||
                    "—"}
                </span>

                <span className="text-sky-400/30">
                  ·
                </span>

                <span>
                  {latestCm.season ||
                    "—"}
                </span>

                <span className="text-sky-400/30">
                  ·
                </span>

                <span>
                  {latestCm.condition ||
                    "—"}
                </span>

              </div>
            </div>
            {latestCm && (
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      onOpenCm(latestCm.number)
                    }
                    className="text-xs font-black text-sky-300/70 transition hover:text-sky-200"
                  >
                    Go to CM Card →
                  </button>
                </div>
              )}

          </div>
        ) : (
          <div className="relative px-4 py-10 text-center">

            <div className="font-bold text-gray-300">
              No Champions Meetings yet.
            </div>

            <div className="mt-2 text-sm text-gray-600">
              Your latest CM will appear
              here.
            </div>

          </div>
        )}

      </div>
    </section>
  )
}

export default LatestCMMobile