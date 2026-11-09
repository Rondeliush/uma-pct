import { formatTrackLength } from "../formatting"
import { TrackConditionIcon } from "../components/EventIcons"
import { useEffect, useState } from "react"
import type {
  Dispatch,
  SetStateAction,
} from "react"

import type { CM } from "../types/types"
import CMResults from "./CMResults"
import CMUmas from "./CMUmas"
import CMLog from "./CMLog"
import ModalPortal from "../components/ModalPortal"
import { getTrackImage } from "../data/trackData"

type CMModalProps = {
  cm: CM
  setCms: Dispatch<SetStateAction<CM[]>>
  onClose: () => void
}

function CMModal({
  cm,
  setCms,
  onClose,
}: CMModalProps) {
  const [activeTab, setActiveTab] =
    useState<"results" | "umas" | "log">(
      "results"
    )

  useEffect(() => {
    if (cm.phase === "finalLineup") {
      setActiveTab("umas")
      return
    }

    if (cm.phase === "finalResult") {
      setActiveTab("results")
    }
  }, [cm.phase])

  const trackImage = getTrackImage(cm.track)

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm">
        <div
          className="
            cm-scrollbar
            relative
            max-h-[95vh]
            w-full
            max-w-[900px]
            overflow-y-auto
            overflow-x-hidden
            rounded-[22px]
            border border-sky-500/45
            bg-[#06101f]
            shadow-[0_0_30px_rgba(14,165,233,0.16),0_30px_90px_rgba(0,0,0,0.70)]
          "
        >
          {/* HERO */}
          <div className="relative h-[190px] overflow-hidden">
            {trackImage ? (
              <img
                src={trackImage}
                alt={cm.track}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-[linear-gradient(135deg,#071426_0%,#0b2343_55%,#101a3d_100%)]" />
            )}

            <div className="absolute inset-0 bg-gradient-to-r from-[#020817]/95 via-[#031126]/65 to-[#020817]/20" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#06101f]/90 via-transparent to-black/15" />

            {/* LEFT */}
            <div className="absolute left-7 top-6">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-amber-200/90">
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
                  <path d="m3 7 4 4 5-7 5 7 4-4-2 11H5L3 7Z" />
                  <path d="M5 21h14" />
                </svg>

                Champions Meeting
              </div>

              <div className="mt-3 text-5xl font-black tracking-tight text-white">
                CM{cm.number}
              </div>

              <div className="mt-1 text-2xl font-bold text-white/95">
                {cm.name}
              </div>
            </div>

            {/* RIGHT */}
            <div className="absolute bottom-6 right-7 text-right">
              <div className="text-3xl font-semibold italic tracking-tight text-white/95">
                {cm.track || "Racecourse"}
              </div>

              <div className="mt-1 text-lg font-medium text-blue-100/85">
                {cm.surface} {cm.distance}m
              </div>
            </div>

            {/* CLOSE */}
            <button
              type="button"
              onClick={onClose}
              className="
                absolute right-4 top-4
                flex h-10 w-10 items-center justify-center
                rounded-xl border border-white/10
                bg-[#031126]/55
                text-2xl text-blue-100/65
                backdrop-blur-md
                transition
                hover:border-white/20
                hover:bg-[#071426]/80
                hover:text-white
              "
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <div className="relative bg-[linear-gradient(135deg,rgba(3,15,34,0.98),rgba(5,20,43,0.96),rgba(11,14,42,0.95))]"></div>
          {/* ======================================= */}
          {/* TRACK INFORMATION */}
          {/* ======================================= */}

          <div className="relative px-3 py-3 md:px-5">
          <div className="relative grid grid-cols-2 gap-2 md:grid-cols-4">

              {/* RACECOURSE */}
              <div className="flex min-h-[56px] min-w-0 items-center gap-2 rounded-[10px] border border-white/[0.07] bg-white/[0.018] px-2.5 transition hover:border-cyan-300/15 hover:bg-cyan-300/[0.025] md:gap-2.5 md:px-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center text-cyan-300 drop-shadow-[0_0_5px_rgba(34,211,238,0.4)]">
                  <TrackConditionIcon kind="racecourse" />
                </div>

                <div className="min-w-0">
                  <div className="text-[11px] font-medium text-blue-200/45">
                    Racecourse
                  </div>

                  <div className="truncate text-base font-bold text-white">
                    {cm.track || "—"}
                  </div>
                </div>
              </div>

              {/* SURFACE */}
              <div className="flex min-h-[56px] min-w-0 items-center gap-2 rounded-[10px] border border-white/[0.07] bg-white/[0.018] px-2.5 transition hover:border-cyan-300/15 hover:bg-cyan-300/[0.025] md:gap-2.5 md:px-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center text-cyan-300 drop-shadow-[0_0_5px_rgba(34,211,238,0.4)]">
                  <TrackConditionIcon kind="surface" />
                </div>

                <div className="min-w-0">
                  <div className="text-[11px] font-medium text-blue-200/45">
                    Surface
                  </div>

                  <div className="truncate text-sm font-bold text-white md:text-base">
                    {cm.surface}
                  </div>
                </div>
              </div>

              {/* DISTANCE */}
              <div className="flex min-h-[56px] min-w-0 items-center gap-2 rounded-[10px] border border-white/[0.07] bg-white/[0.018] px-2.5 transition hover:border-cyan-300/15 hover:bg-cyan-300/[0.025] md:gap-2.5 md:px-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center text-cyan-300 drop-shadow-[0_0_5px_rgba(34,211,238,0.4)]">
                  <TrackConditionIcon kind="distance" />
                </div>

                <div className="min-w-0">
                  <div className="text-[11px] font-medium text-blue-200/45">
                    Distance
                  </div>

                  <div className="truncate text-sm font-bold text-white md:text-base">
                    {cm.distance}m
                  </div>
                </div>
              </div>

              {/* LENGTH */}
              <div className="flex min-h-[56px] min-w-0 items-center gap-2 rounded-[10px] border border-white/[0.07] bg-white/[0.018] px-2.5 transition hover:border-cyan-300/15 hover:bg-cyan-300/[0.025] md:gap-2.5 md:px-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center text-cyan-300 drop-shadow-[0_0_5px_rgba(34,211,238,0.4)]">
                  <TrackConditionIcon kind="length" />
                </div>

                <div className="min-w-0">
                  <div className="text-[11px] font-medium text-blue-200/45">
                    Length
                  </div>

                  <div className="truncate text-sm font-bold text-white md:text-base">
                    {formatTrackLength(cm.length)}
                  </div>
                </div>
              </div>

              {/* DIRECTION */}
              <div className="flex min-h-[56px] min-w-0 items-center gap-2 rounded-[10px] border border-white/[0.07] bg-white/[0.018] px-2.5 transition hover:border-cyan-300/15 hover:bg-cyan-300/[0.025] md:gap-2.5 md:px-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center text-cyan-300 drop-shadow-[0_0_5px_rgba(34,211,238,0.4)]">
                  <TrackConditionIcon kind="direction" />
                </div>

                <div>
                  <div className="text-[11px] font-medium text-blue-200/45">
                    Direction
                  </div>

                  <div className="truncate text-sm font-bold text-white md:text-base">
                    {cm.direction}
                  </div>
                </div>
              </div>

              {/* WEATHER */}
              <div className="flex min-h-[56px] min-w-0 items-center gap-2 rounded-[10px] border border-white/[0.07] bg-white/[0.018] px-2.5 transition hover:border-cyan-300/15 hover:bg-cyan-300/[0.025] md:gap-2.5 md:px-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center text-cyan-300 drop-shadow-[0_0_5px_rgba(34,211,238,0.4)]">
                  <TrackConditionIcon kind="weather" />
                </div>

                <div className="min-w-0">
                  <div className="text-[11px] font-medium text-blue-200/45">
                    Weather
                  </div>

                  <div className="truncate text-sm font-bold text-white md:text-base">
                    {cm.weather}
                  </div>
                </div>
              </div>

              {/* SEASON */}
              <div className="flex min-h-[56px] min-w-0 items-center gap-2 rounded-[10px] border border-white/[0.07] bg-white/[0.018] px-2.5 transition hover:border-cyan-300/15 hover:bg-cyan-300/[0.025] md:gap-2.5 md:px-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center text-cyan-300 drop-shadow-[0_0_5px_rgba(34,211,238,0.4)]">
                  <TrackConditionIcon kind="season" />
                </div>

                <div className="min-w-0">
                  <div className="text-[11px] font-medium text-blue-200/45">
                    Season
                  </div>

                  <div className="truncate text-sm font-bold text-white md:text-base">
                    {cm.season}
                  </div>
                </div>
              </div>

              {/* CONDITION */}
              <div className="flex min-h-[56px] min-w-0 items-center gap-2 rounded-[10px] border border-white/[0.07] bg-white/[0.018] px-2.5 transition hover:border-cyan-300/15 hover:bg-cyan-300/[0.025] md:gap-2.5 md:px-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center text-cyan-300 drop-shadow-[0_0_5px_rgba(34,211,238,0.4)]">
                  <TrackConditionIcon kind="condition" />
                </div>

                <div className="min-w-0">
                  <div className="text-[11px] font-medium text-blue-200/45">
                    Condition
                  </div>

                  <div className="truncate text-sm font-bold text-white md:text-base">
                    {cm.condition}
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* TABS */}
          <div className="relative grid grid-cols-3 border-b border-white/[0.06] px-3">
            <button
              type="button"
              onClick={() =>
                setActiveTab("results")
              }
              className={`
                relative flex h-[50px] items-center justify-center gap-2
                text-sm font-bold transition
                ${
                  activeTab === "results"
                    ? "text-cyan-300"
                    : "text-blue-100/55 hover:text-white"
                }
              `}
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M5 20V10" />
                <path d="M12 20V4" />
                <path d="M19 20v-7" />
              </svg>

              Results

              {activeTab === "results" && (
                <div className="absolute bottom-0 left-1/2 h-[2px] w-20 -translate-x-1/2 bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.45)]" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("umas")}
              className={`
                relative flex h-[50px] items-center justify-center gap-2
                text-sm font-bold transition
                ${
                  activeTab === "umas"
                    ? "text-cyan-300"
                    : "text-blue-100/55 hover:text-white"
                }
              `}
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="9" cy="8" r="3" />
                <circle cx="17" cy="9" r="2.5" />
                <path d="M3.5 19c.5-4 2.5-6 5.5-6s5 2 5.5 6" />
                <path d="M14 14c3 0 5 1.5 5.5 5" />
              </svg>

              Umas

              {activeTab === "umas" && (
                <div className="absolute bottom-0 left-1/2 h-[2px] w-20 -translate-x-1/2 bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.45)]" />
                  )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("log")}
              className={`
                relative flex h-[50px] items-center justify-center gap-2
                text-sm font-bold transition
                ${
                  activeTab === "log"
                    ? "text-cyan-300"
                    : "text-blue-100/55 hover:text-white"
                }
              `}
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M6 3h9l3 3v15H6Z" />
                <path d="M15 3v4h4" />
                <path d="M9 11h6" />
                <path d="M9 15h6" />
              </svg>

              Log

              {activeTab === "log" && (
                <div className="absolute bottom-0 left-1/2 h-[2px] w-20 -translate-x-1/2 bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.45)]" />
                )}
            </button>
          </div>

          {/* CONTENT */}
          <div className="relative bg-[linear-gradient(135deg,#06101f_0%,#071426_50%,#080d21_100%)] pb-6">
            {activeTab === "results" && (
              <CMResults
                cm={cm}
                setCms={setCms}
              />
            )}

            {activeTab === "umas" && (
              <CMUmas
                cm={cm}
                setCms={setCms}
              />
            )}

            {activeTab === "log" && (
              <CMLog cm={cm} />
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}

export default CMModal
