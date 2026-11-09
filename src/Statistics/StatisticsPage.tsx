import type {
  Dispatch,
  SetStateAction,
} from "react"
import type { LoH } from "../LoH/types"

import type { CM } from "../types/types"

import EventStatisticsDashboard from "./EventStatisticsDashboard"
import StatisticsLanding from "./StatisticsLanding"
import UmaStatisticsPage from "./UmaStatisticsPage"
import TrackStatisticsPage from "./TrackStatisticsPage"
import type useStatisticsNavigation from "./useStatisticsNavigation"
import { trackImages } from "../data/trackData"

type StatisticsPageProps = {
  cms: CM[]
  lohs: LoH[]
  navigation: ReturnType<typeof useStatisticsNavigation>
  onOpenCm: (cmNumber: CM["number"]) => void
  onOpenLoH: (number: number) => void
  comparisonSlots: (string | null)[]
  setComparisonSlots: Dispatch<SetStateAction<(string | null)[]>>
}

function StatisticsPage({
  cms,
  lohs,
  navigation,
  onOpenCm,
  onOpenLoH,
  comparisonSlots,
  setComparisonSlots,
}: StatisticsPageProps) {
  const { route, navigateSection, navigateTrack, navigateUma } = navigation
  const section = route?.section ?? "landing"
  const trackId = route?.trackId ?? null
  const trackDetailsOpen = section === "tracks" && trackId !== null
  const comparisonOpen = section === "compare"
  const trackName = trackImages.find((track) => track.id === trackId)?.name ?? "Track Details"

  if (section === "landing") {
    return <StatisticsLanding onSelect={navigateSection} />
  }

  const sectionNavigation = (
    <nav aria-label="Statistics navigation" className={`flex items-center gap-3 text-sm${trackDetailsOpen || comparisonOpen ? " flex-wrap" : ""}`}>
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
      </> : comparisonOpen ? <>
        <button type="button" onClick={() => navigateSection("uma")} className="min-h-11 rounded-lg px-2 font-semibold text-blue-100/70 transition hover:bg-sky-400/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300">Uma</button>
        <span aria-hidden="true" className="text-blue-100/30">/</span>
        <span aria-current="page" className="font-semibold text-blue-100/70">Compare</span>
      </> : <span aria-current="page" className="font-semibold text-blue-100/70">
        {section === "events" ? "Events" : section === "uma" ? "Uma" : "Tracks"}
      </span>}
    </nav>
  )

  if (section === "tracks") {
    return <TrackStatisticsPage cms={cms} lohs={lohs} navigation={sectionNavigation} trackId={trackId} onOpenTrack={navigateTrack} onBack={() => navigateSection("tracks")} onOpenCm={onOpenCm} onOpenLoH={onOpenLoH} />
  }

  if (section === "uma" || comparisonOpen) {
    return <UmaStatisticsPage cms={cms} lohs={lohs} navigation={sectionNavigation} umaVersionId={route?.umaVersionId ?? null} comparing={comparisonOpen} onOpenComparison={() => navigateSection("compare")} onOpenUma={navigateUma} onBack={() => navigateSection("uma")} onOpenCm={onOpenCm} onOpenLoH={onOpenLoH} comparisonSlots={comparisonSlots} setComparisonSlots={setComparisonSlots} />
  }

  return (
    <main className="space-y-6">
      <EventStatisticsDashboard cms={cms} lohs={lohs} navigation={sectionNavigation} onOpenCm={onOpenCm} onOpenLoH={navigation.navigateLoH} />
    </main>
  )
}

export default StatisticsPage
