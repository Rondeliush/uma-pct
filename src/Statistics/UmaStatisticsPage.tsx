import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import type { Dispatch, ReactNode, SetStateAction } from "react"
import { useUmaDatabase } from "../context/UmaDatabaseContext"
import UnavailablePage from "../components/UnavailablePage"
import type { CM } from "../types/types"
import type { LoH } from "../LoH/types"
import UmaStatisticsDetailPage from "./UmaStatisticsDetailPage"
import { getUmaStatisticsCatalogue } from "./umaStatistics"
import UmaOverview from "./UmaOverview"
import UmaComparisonPanel from "./UmaComparisonPanel"
import { getUmaOverviewStatistics } from "./umaOverviewStatistics"
import type { UmaOverviewScope } from "./umaOverviewTypes"
import "./UmaStatisticsPage.css"

type Props = {
  cms: CM[]
  lohs: LoH[]
  navigation: ReactNode
  umaVersionId: string | null
  comparing: boolean
  onOpenComparison: () => void
  onOpenUma: (versionId: string) => void
  onBack: () => void
  onOpenCm: (cmNumber: CM["number"]) => void
  onOpenLoH: (number: number) => void
  comparisonSlots: (string | null)[]
  setComparisonSlots: Dispatch<SetStateAction<(string | null)[]>>
}

type UmaStatisticsView = "overview" | "detail" | "compare"

export default function UmaStatisticsPage({ cms, lohs, navigation, umaVersionId, comparing, onOpenComparison, onOpenUma, onBack, onOpenCm, onOpenLoH, comparisonSlots, setComparisonSlots }: Props) {
  const { characters, versions } = useUmaDatabase()
  const scopes = useMemo(() => getUmaOverviewStatistics(cms, lohs, characters, versions), [cms, lohs, characters, versions])
  const [scope, setScope] = useState<UmaOverviewScope>(umaVersionId ? "cm" : "overall")
  const comparisonTrigger = useRef<HTMLButtonElement | null>(null)
  const statistics = scopes.cm
  const overview = scopes[scope]
  const allUmas = useMemo(() => getUmaStatisticsCatalogue(versions, scopes.overall.umas), [versions, scopes.overall.umas])
  // Retain the exiting detail during the transition back to the overview.
  const [lastSelectedVersionId, setLastSelectedVersionId] = useState<string | null>(umaVersionId)
  const selectedVersionId = umaVersionId ?? lastSelectedVersionId
  const detailsOpen = umaVersionId !== null
  const view: UmaStatisticsView = comparing ? "compare" : detailsOpen ? "detail" : "overview"
  const [transition, setTransition] = useState<{ view: UmaStatisticsView; from: UmaStatisticsView | null }>({ view, from: null })
  // Track route changes so browser Back/Forward use the same transition as buttons.
  if (transition.view !== view) setTransition({ view, from: transition.view })
  const transitioning = transition.from !== null && !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  const visible = (target: UmaStatisticsView) => view === target || (transitioning && transition.from === target)
  const pageRef = useRef<HTMLElement>(null)
  const detailTrigger = useRef<HTMLElement | null>(null)
  const overviewScrollPosition = useRef<number | null>(null)
  const lastSecondaryView = useRef<UmaStatisticsView | null>(null)

  useEffect(() => {
    if (transition.from === null) return
    const timer = window.setTimeout(() => setTransition(current => ({ ...current, from: null })), 300)
    return () => window.clearTimeout(timer)
  }, [transition.view, transition.from])

  useLayoutEffect(() => {
    let frame = 0
    const rememberScroll = () => { overviewScrollPosition.current = window.scrollY }
    if (view === "overview") {
      window.addEventListener("scroll", rememberScroll, { passive: true })
      const position = overviewScrollPosition.current
      const trigger = lastSecondaryView.current === "compare" ? comparisonTrigger.current : detailTrigger.current
      if (position !== null) frame = requestAnimationFrame(() => {
        window.scrollTo({ top: position, left: 0, behavior: "instant" })
        if (trigger && pageRef.current?.contains(trigger)) trigger.focus({ preventScroll: true })
      })
    } else {
      lastSecondaryView.current = view
      frame = requestAnimationFrame(() => {
        pageRef.current?.querySelector<HTMLElement>(view === "compare" ? "#uma-statistics-compare-title" : "#uma-statistics-detail-title")?.focus({ preventScroll: true })
      })
    }
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("scroll", rememberScroll)
    }
  }, [view])

  const selectedPerformance = statistics.umas.find((uma) => uma.versionId === selectedVersionId)
  const selectedUma = allUmas.find((uma) => uma.versionId === selectedVersionId) ?? selectedPerformance


  const selectUma = (versionId: string, trigger: HTMLButtonElement) => {
    detailTrigger.current = trigger
    overviewScrollPosition.current = window.scrollY
    setLastSelectedVersionId(versionId)
    onOpenUma(versionId)
  }
  const backToOverview = () => {
    setLastSelectedVersionId(umaVersionId)
    onBack()
  }
  if (detailsOpen && !selectedUma) return <UnavailablePage />

  return (
    <main ref={pageRef} className="uma-statistics" aria-labelledby={comparing ? "uma-statistics-compare-title" : detailsOpen ? "uma-statistics-detail-title" : "uma-statistics-browser-title"}>
      <div className="uma-statistics-view-stack" data-view={view} data-returning={view === "overview"} data-transitioning={transitioning}>
        <div className="uma-statistics-view uma-statistics-overview-view" data-active={view === "overview"} hidden={!visible("overview")} aria-hidden={view !== "overview"} inert={view !== "overview"}>
      {navigation}
      <div id="uma-statistics-overview">
        <UmaOverview cms={cms} lohs={lohs} scopes={scopes} versions={versions} active={view === "overview"} statistics={overview} runningStyles={overview.runningStyles} scope={scope} onScope={setScope}
          catalogue={allUmas} onSelect={selectUma} onCompare={trigger => {
            comparisonTrigger.current = trigger
            overviewScrollPosition.current = window.scrollY
            onOpenComparison()
          }} />

      </div>

        </div>
        {visible("compare") && <div className="uma-statistics-view uma-statistics-comparison-view" data-active={view === "compare"} aria-hidden={view !== "compare"} inert={view !== "compare"}>
          {navigation}
          <div className="uma-overview-redesign">
            <UmaComparisonPanel cms={cms} lohs={lohs} catalogue={allUmas} savedSlots={comparisonSlots} setSlots={setComparisonSlots} onClose={onBack} />
          </div>
        </div>}
        {(detailsOpen || selectedUma) && (
          <div className="uma-statistics-view uma-statistics-detail-view" data-active={view === "detail"} hidden={!visible("detail")} aria-hidden={view !== "detail"} inert={view !== "detail"}>
            <UmaStatisticsDetailPage key={selectedVersionId} uma={selectedUma} cms={cms} lohs={lohs} onBack={backToOverview} onOpenCm={onOpenCm} onOpenLoH={onOpenLoH} />
          </div>
        )}
      </div>
    </main>
  )
}
