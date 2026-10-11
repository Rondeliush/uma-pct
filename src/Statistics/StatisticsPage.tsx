import { useState } from "react"

import type {
  Dispatch,
  SetStateAction,
} from "react"

import type { CM } from "../types/types"

import CMStatisticsDashboard from "./CMStatisticsDashboard"
import LoHStatisticsDashboard from "./LoHStatisticsDashboard"
import StatisticsLanding from "./StatisticsLanding"
import StatisticsShowcase from "./StatisticsShowcase"
import UmaStatisticsPage from "./UmaStatisticsPage"
import TrackStatisticsPage from "./TrackStatisticsPage"
import type useStatisticsNavigation from "./useStatisticsNavigation"
import { trackImages } from "../data/trackData"

type StatisticsPageProps = {
  cms: CM[]
  navigation: ReturnType<typeof useStatisticsNavigation>
  onOpenCm: (cmNumber: CM["number"]) => void
  comparisonSlots: (string | null)[]
  setComparisonSlots: Dispatch<SetStateAction<(string | null)[]>>
}

type StatisticsMode =
  | "cm"
  | "loh"

function StatisticsPage({
  cms,
  navigation,
  onOpenCm,
  comparisonSlots,
  setComparisonSlots,
}: StatisticsPageProps) {
  const [dashboardMode, setDashboardMode] =
    useState<StatisticsMode>("cm")
  const { route, navigateSection, navigateTrack, navigateUma } = navigation
  const section = route?.section ?? "landing"
  const trackId = route?.trackId ?? null
  const trackDetailsOpen = section === "tracks" && trackId !== null
  const trackName = trackImages.find((track) => track.id === trackId)?.name ?? "Track Details"

  if (section === "landing") {
    return <StatisticsLanding onSelect={navigateSection} />
  }

  const sectionNavigation = (
    <nav aria-label="Statistics navigation" className={`flex items-center gap-3 text-sm${trackDetailsOpen ? " flex-wrap" : ""}`}>
      <button
        type="button"
        onClick={() => navigateSection("landing")}
        className="flex min-h-11 items-center gap-2 rounded-lg px-2 font-bold text-sky-200 transition hover:bg-sky-400/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m14 6-6 6 6 6M8 12h12" />
        </svg>
        Statistics
      </button>
      <span aria-hidden="true" className="text-blue-100/30">/</span>
      {trackDetailsOpen ? <>
        <button type="button" onClick={() => navigateSection("tracks")} className="min-h-11 rounded-lg px-2 font-semibold text-blue-100/70 transition hover:bg-sky-400/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300">Tracks</button>
        <span aria-hidden="true" className="text-blue-100/30">/</span>
        <span aria-current="page" className="font-semibold text-blue-100/70">{trackName}</span>
      </> : <span aria-current="page" className="font-semibold text-blue-100/70">
        {section === "events" ? "Events" : section === "uma" ? "Uma" : "Tracks"}
      </span>}
    </nav>
  )

  if (section === "tracks") {
    return <TrackStatisticsPage cms={cms} navigation={sectionNavigation} trackId={trackId} onOpenTrack={navigateTrack} onBack={() => navigateSection("tracks")} onOpenCm={onOpenCm} />
  }

  if (section === "uma") {
    return <UmaStatisticsPage cms={cms} navigation={sectionNavigation} umaVersionId={route?.umaVersionId ?? null} onOpenUma={navigateUma} onBack={() => navigateSection("uma")} onOpenCm={onOpenCm} comparisonSlots={comparisonSlots} setComparisonSlots={setComparisonSlots} />
  }

  return (
    <main className="space-y-6">

      <div className="uma-statistics">
        {sectionNavigation}
        <header className="uma-statistics-header">
          <div>
            <h1>Event Statistics</h1>
            <p>Explore the competitive performance of your events.</p>
          </div>
        </header>
      </div>
      <StatisticsShowcase cms={cms} />

      {/* STATISTICS MODE */}
      <div className="text-center">
      <div className="mb-2 text-[9px] font-black uppercase tracking-[0.18em] text-sky-300/40">
        Event Statistics
      </div>
      </div>

      <div className="flex justify-center">
        <div className="inline-flex items-center gap-1 rounded-xl border border-white/[0.08] bg-[#07111f]/85 p-1 shadow-lg backdrop-blur-md">

          {/* CM */}
          <button
            type="button"
            onClick={() =>
              setDashboardMode("cm")
            }
            className={`relative min-w-[120px] rounded-lg px-5 py-2.5 text-sm font-black transition ${
              dashboardMode === "cm"
                ? "bg-sky-400/[0.12] text-sky-200 shadow-[0_0_14px_rgba(56,189,248,0.10)]"
                : "text-blue-100/35 hover:bg-white/[0.03] hover:text-white/70"
            }`}
          >
            Champions Meeting

            {dashboardMode === "cm" && (
              <span className="absolute inset-x-4 -bottom-1 h-[2px] rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.7)]" />
            )}
          </button>

          {/* LOH */}
          <button
            type="button"
            onClick={() =>
              setDashboardMode("loh")
            }
            className={`relative min-w-[120px] rounded-lg px-5 py-2.5 text-sm font-black transition ${
              dashboardMode === "loh"
                ? "bg-rose-400/[0.12] text-rose-200 shadow-[0_0_14px_rgba(244,63,94,0.10)]"
                : "text-blue-100/35 hover:bg-white/[0.03] hover:text-white/70"
            }`}
          >
            League of Heroes

            {dashboardMode === "loh" && (
              <span className="absolute inset-x-4 -bottom-1 h-[2px] rounded-full bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.7)]" />
            )}
          </button>

        </div>
      </div>

      {/* DASHBOARD */}
      {dashboardMode === "cm" ? (
        <CMStatisticsDashboard
          cms={cms}
          onOpenCm={onOpenCm}
        />
      ) : (
        <LoHStatisticsDashboard />
      )}

    </main>
  )
}

export default StatisticsPage
