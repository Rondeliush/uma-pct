import UmaAvatarImage from "../../../components/UmaAvatarImage"
import { useUmaDatabase } from "../../../context/UmaDatabaseContext"

import type { LatestCMProps } from "./LatestCM"

function LatestCMDesktop({
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
      className="relative overflow-hidden rounded-2xl border border-sky-400/40 bg-gray-950/80 shadow-[0_0_0_1px_rgba(14,165,233,0.10),0_12px_35px_rgba(0,0,0,0.55)]"
    >
      {latestCm &&
        latestTrackImage && (
          <img
            src={latestTrackImage}
            alt={latestCm.track}
            className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center opacity-55 brightness-110"
          />
        )}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-gray-950/60 via-gray-950/45 to-gray-950/55" />

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
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() =>
                onOpenCm(latestCm.number)
              }
              className="text-xs font-black text-sky-300/65 transition hover:text-sky-200"
            >
              Go to CM Card →
            </button>

            <div className="text-right">
              <div className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-100/30">
                CM
              </div>

              <div className="text-lg font-black text-sky-300">
                #{latestCm.number}
              </div>
            </div>
          </div>
        )}

        </div>

        {latestCm ? (
          <div className="px-5 py-5">

            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center lg:gap-5">

              <div className="col-span-2 min-w-0 lg:col-span-1">

                <div className="text-2xl font-black tracking-tight text-white">
                  {latestCm.name ||
                    "Unnamed CM"}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">

                  <div className="rounded-lg border border-white/[0.08] bg-black/25 px-3 py-1.5 text-sm font-bold text-white">
                    {latestCm.track ||
                      "—"}
                  </div>

                  <div
                    className={`rounded-lg px-3 py-1.5 text-sm font-black ${
                      latestCm.surface ===
                      "Turf"
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

              <div className="flex items-center gap-5 rounded-xl border border-white/[0.08] bg-black/40 px-4 py-3 backdrop-blur-sm">

                {/* TEAM LINEUP */}
                <div>
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
                              className={`relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-black/25 ${
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
                                <span className="absolute bottom-0.5 left-1 text-[9px] text-yellow-300">
                                  ★
                                </span>
                              )}
                            </div>
                          )
                        }
                      )
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
                      ? `${latestWinRate.toFixed(
                          2
                        )}%`
                      : "—"}
                  </div>

                  <div className="mt-0.5 text-[10px] font-medium text-blue-100/30">
                    {latestWinCount} /{" "}
                    {latestRaceCount}
                  </div>

                </div>
              </div>

              <div className="shrink-0 rounded-xl border border-white/[0.08] bg-black/25 px-4 py-3 text-right backdrop-blur-sm">

                <div className="text-[9px] font-black uppercase tracking-[0.16em] text-blue-100/35">
                  Status
                </div>

                <div className="mt-1 font-black text-sky-200">
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

                <div className="mt-3 border-t border-white/[0.07] pt-2">

                  <div className="text-[9px] font-black uppercase tracking-[0.16em] text-blue-100/30">
                    Final Place
                  </div>

                  <div
                    className={`mt-1 font-black ${
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

            <div className="mt-5 border-t border-white/[0.07] pt-4">

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold text-blue-100/55">

                <span>
                  {latestCm.direction ||
                    "—"}
                </span>

                <span className="text-sky-400/30">
                  |
                </span>

                <span>
                  {latestCm.weather ||
                    "—"}
                </span>

                <span className="text-sky-400/30">
                  |
                </span>

                <span>
                  {latestCm.season ||
                    "—"}
                </span>

                <span className="text-sky-400/30">
                  |
                </span>

                <span>
                  {latestCm.condition ||
                    "—"}
                </span>

              </div>
              
            </div>

          </div>
        ) : (
          <div className="relative py-14 text-center">

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

export default LatestCMDesktop