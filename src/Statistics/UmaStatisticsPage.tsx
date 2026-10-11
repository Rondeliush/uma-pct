import { useEffect, useMemo, useRef, useState } from "react"
import type { Dispatch, ReactNode, SetStateAction } from "react"
import { useUmaDatabase } from "../context/UmaDatabaseContext"
import UnavailablePage from "../components/UnavailablePage"
import type { CM } from "../types/types"
import UmaDatabaseIcon from "../Umas/UmaDatabaseIcon"
import AllUmasSelector from "./AllUmasSelector"
import UmaStatisticsSelector from "./UmaStatisticsSelector"
import UmaStatisticsDetailPage from "./UmaStatisticsDetailPage"
import UmaPerformanceCards from "./UmaPerformanceCards"
import UmaPerformanceList from "./UmaPerformanceList"
import UmaGlobalDistancePerformance from "./UmaGlobalDistancePerformance"
import UmaComparisonTable from "./UmaComparisonTable"
import { MAX_COMPARISON_UMAS, normalizeUmaComparisonSlots } from "./umaComparisonSelection"
import { calculateUmaRunningStyleStatistics } from "./umaRunningStyleStatistics"
import { calculateUmaRoleStatistics } from "./umaRoleStatistics"
import {
  calculateUmaStatistics,
  formatUmaWinRate,
  getUmaStatisticsCatalogue,
  getUmaPerformanceList,
  MIN_RACES_FOR_WIN_RATE,
} from "./umaStatistics"
import type { UmaStatisticsSort } from "./umaStatistics"
import "./UmaStatisticsPage.css"

type Props = {
  cms: CM[]
  navigation: ReactNode
  umaVersionId: string | null
  onOpenUma: (versionId: string) => void
  onBack: () => void
  onOpenCm: (cmNumber: CM["number"]) => void
  comparisonSlots: (string | null)[]
  setComparisonSlots: Dispatch<SetStateAction<(string | null)[]>>
}
type UmaStatisticsTab = "overview" | "compare"

export default function UmaStatisticsPage({ cms, navigation, umaVersionId, onOpenUma, onBack, onOpenCm, comparisonSlots: savedComparisonSlots, setComparisonSlots }: Props) {
  const { characters, versions } = useUmaDatabase()
  const statistics = useMemo(() => calculateUmaStatistics(cms, characters, versions), [cms, characters, versions])
  const runningStyles = useMemo(() => calculateUmaRunningStyleStatistics(cms), [cms])
  const roles = useMemo(() => calculateUmaRoleStatistics(cms), [cms])
  const allUmas = useMemo(() => getUmaStatisticsCatalogue(versions, statistics.umas), [versions, statistics.umas])
  const comparisonValidIds = useMemo(() => new Set(allUmas.map((uma) => uma.versionId)), [allUmas])
  const comparisonSlots = useMemo(() => normalizeUmaComparisonSlots(savedComparisonSlots, comparisonValidIds), [savedComparisonSlots, comparisonValidIds])
  const [activeTab, setActiveTab] = useState<UmaStatisticsTab>("overview")
  const [compareHeaderPinned, setCompareHeaderPinned] = useState(true)
  const [sort, setSort] = useState<UmaStatisticsSort>("win-rate")
  const [performanceView, setPerformanceView] = useState<"cards" | "list">("cards")
  // Retain the overview selection highlight and exiting preview; the URL selects the details page.
  const [lastSelectedVersionId, setLastSelectedVersionId] = useState<string | null>(umaVersionId)
  const selectedVersionId = umaVersionId ?? lastSelectedVersionId
  const detailsOpen = umaVersionId !== null
  const [transitioning, setTransitioning] = useState(false)
  const [comparisonSlotToFill, setComparisonSlotToFill] = useState<number | null>(null)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const comparisonSlotButtons = useRef<(HTMLButtonElement | null)[]>([])
  const pageRef = useRef<HTMLElement>(null)
  const detailTrigger = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!transitioning) return
    const timer = window.setTimeout(() => setTransitioning(false), 300)
    return () => window.clearTimeout(timer)
  }, [transitioning, detailsOpen])

  const selectedPerformance = statistics.umas.find((uma) => uma.versionId === selectedVersionId)
  const selectedUma = allUmas.find((uma) => uma.versionId === selectedVersionId) ?? selectedPerformance
  const comparisonIds = comparisonSlots.filter((id): id is string => id !== null)
  const comparisonUmas = useMemo(() => comparisonSlots.map((id) => allUmas.find((uma) => uma.versionId === id) ?? null), [comparisonSlots, allUmas])
  const performanceList = useMemo(() => getUmaPerformanceList(allUmas, statistics.umas, sort), [allUmas, statistics.umas, sort])
  const topPerformanceUmas = useMemo(() => performanceList.filter((uma) => uma.hasRecordedData).slice(0, 10), [performanceList])
  const performanceDescription = sort === "win-rate" ? `Win rate prioritizes Umas with ${MIN_RACES_FOR_WIN_RATE}+ races.`
    : sort === "wins" ? "Ranked by total race wins."
    : sort === "races" ? "Ranked by total recorded races."
    : "Your competitive record, tracked by Uma version."

  const selectUma = (versionId: string, trigger: HTMLButtonElement) => {
    detailTrigger.current = trigger
    setLastSelectedVersionId(versionId)
    onOpenUma(versionId)
    setTransitioning(!window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    requestAnimationFrame(() => {
      pageRef.current?.querySelector<HTMLElement>("#uma-statistics-detail-title")?.focus({ preventScroll: true })
    })
  }
  const backToOverview = () => {
    setLastSelectedVersionId(umaVersionId)
    setActiveTab("overview")
    onBack()
    setTransitioning(!window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    requestAnimationFrame(() => {
      if (detailTrigger.current && pageRef.current?.contains(detailTrigger.current)) {
        detailTrigger.current.focus({ preventScroll: true })
      }
    })
  }
  const closeComparisonSelector = () => {
    const slotIndex = comparisonSlotToFill
    setComparisonSlotToFill(null)
    requestAnimationFrame(() => {
      (slotIndex !== null ? comparisonSlotButtons.current[slotIndex] : tabRefs.current[1])?.focus()
    })
  }
  const addComparisonUma = (versionId: string) => {
    if (comparisonSlotToFill === null || !comparisonValidIds.has(versionId)) return
    setComparisonSlots((saved) => {
      const current = normalizeUmaComparisonSlots(saved, comparisonValidIds)
      return current.includes(versionId) || current[comparisonSlotToFill] !== null
        ? current : current.map((id, index) => index === comparisonSlotToFill ? versionId : id)
    })
    closeComparisonSelector()
  }
  const removeComparisonUma = (slotIndex: number) => {
    setComparisonSlots((saved) => normalizeUmaComparisonSlots(saved, comparisonValidIds).map((id, index) => index === slotIndex ? null : id))
    requestAnimationFrame(() => comparisonSlotButtons.current[slotIndex]?.focus())
  }

  if (detailsOpen && !selectedUma) return <UnavailablePage />

  return (
    <main ref={pageRef} className="uma-statistics" aria-labelledby={detailsOpen ? "uma-statistics-detail-title" : "uma-statistics-title"}>
      <div className="uma-statistics-view-stack" data-view={detailsOpen ? "detail" : "overview"} data-transitioning={transitioning}>
        <div className="uma-statistics-view uma-statistics-overview-view" hidden={detailsOpen && !transitioning} aria-hidden={detailsOpen} inert={detailsOpen}>
      {navigation}
      <header className="uma-statistics-header">
        <div>
          <h1 id="uma-statistics-title">Uma Statistics</h1>
          <p>Explore the competitive performance of your Umas.</p>
        </div>
        <div className="uma-statistics-tabs" role="tablist" aria-label="Uma statistics pages">
          {(["overview", "compare"] as const).map((tab, index) => (
            <button
              key={tab}
              ref={(element) => { tabRefs.current[index] = element }}
              type="button"
              role="tab"
              id={`uma-statistics-tab-${tab}`}
              aria-controls={`uma-statistics-${tab}`}
              aria-selected={activeTab === tab}
              tabIndex={activeTab === tab ? 0 : -1}
              onClick={() => {
                if (tab === "compare" && activeTab !== "compare") setCompareHeaderPinned(true)
                setActiveTab(tab)
              }}
              onKeyDown={(event) => {
                if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return
                event.preventDefault()
                const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? 1 : 1 - index
                if (nextIndex === 1 && activeTab !== "compare") setCompareHeaderPinned(true)
                setActiveTab(nextIndex === 0 ? "overview" : "compare")
                tabRefs.current[nextIndex]?.focus()
              }}
            >
              {tab === "overview" ? "Overview" : "Compare"}
            </button>
          ))}
        </div>
      </header>

      <div id="uma-statistics-overview" role="tabpanel" aria-labelledby="uma-statistics-tab-overview" hidden={activeTab !== "overview"} tabIndex={0}>
        <AllUmasSelector umas={allUmas} onSelect={selectUma} />

        <section className="uma-statistics-performance" aria-labelledby="uma-statistics-performance-title">
          <div className="uma-statistics-section-heading">
            <div>
              <h2 id="uma-statistics-performance-title">Uma Performance{performanceView === "cards" && <span className="uma-performance-top-label">TOP 10</span>}</h2>
              <p>{performanceDescription}</p>
            </div>
            <div className="uma-performance-controls">
              <label className="uma-statistics-sort">
                <span>Sort by</span>
                <select value={sort} onChange={(event) => setSort(event.target.value as UmaStatisticsSort)}>
                  <option value="win-rate">Win Rate</option>
                  <option value="wins">Wins</option>
                  <option value="races">Races</option>
                  <option value="name-az">Name A-Z</option>
                  <option value="name-za">Name Z-A</option>
                </select>
              </label>
              <div className="uma-performance-view-switch" role="group" aria-label="Uma Performance presentation">
                {(["cards", "list"] as const).map((view) => (
                  <button key={view} type="button" aria-pressed={performanceView === view} aria-controls="uma-performance-content" onClick={() => setPerformanceView(view)}>
                    <UmaDatabaseIcon name={view === "cards" ? "grid" : "list"} />
                    {view === "cards" ? "Cards" : "List"}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div id="uma-performance-content">
            {performanceView === "list" ? (
              <UmaPerformanceList umas={performanceList} sort={sort} onSelect={selectUma} />
            ) : (
              <UmaPerformanceCards key={sort} umas={topPerformanceUmas} sort={sort} selectedVersionId={selectedVersionId} onSelect={selectUma} />
            )}
          </div>
        </section>

        <div className="uma-statistics-summary-grid uma-overview-top-grid">
          <div className="uma-overview-summary-stack">
            {statistics.umas.length > 0 && (
              <section className="uma-statistics-panel" aria-labelledby="uma-statistics-overall-title">
                <div className="uma-statistics-section-heading"><h2 id="uma-statistics-overall-title">Overall Statistics</h2></div>
                <dl className="uma-statistics-overall-values">
                  <div><dt>Umas Used</dt><dd>{statistics.overall.umasUsed.toLocaleString("en")}</dd></div>
                  <div><dt>Recorded Races</dt><dd>{statistics.overall.races.toLocaleString("en")}</dd></div>
                  <div><dt>Race Wins</dt><dd>{statistics.overall.wins.toLocaleString("en")}</dd></div>
                  <div><dt>Race Win Rate</dt><dd className="uma-statistics-rate">{formatUmaWinRate(statistics.overall.winRate)}</dd></div>
                </dl>
              </section>
            )}
            <section className="uma-statistics-panel" aria-labelledby="uma-statistics-surface-title">
              <div className="uma-statistics-section-heading"><h2 id="uma-statistics-surface-title">Surface Performance</h2></div>
              <table className="uma-statistics-distance-table">
                <thead><tr><th scope="col">Surface</th><th scope="col">Races</th><th scope="col">Wins</th><th scope="col">Win Rate</th></tr></thead>
                <tbody>{statistics.surfaces.map((surface) => (
                  <tr key={surface.surface}><th scope="row">{surface.surface}</th><td>{surface.races.toLocaleString("en")}</td><td>{surface.wins.toLocaleString("en")}</td><td className="uma-statistics-rate">{formatUmaWinRate(surface.winRate)}</td></tr>
                ))}</tbody>
              </table>
            </section>
          </div>
          {statistics.umas.length > 0 && <UmaGlobalDistancePerformance cms={cms} />}
        </div>
        <div className="uma-statistics-summary-grid uma-overview-strategy-grid">
          <section className="uma-statistics-panel" aria-labelledby="uma-statistics-running-style-title">
            <div className="uma-statistics-section-heading"><h2 id="uma-statistics-running-style-title">Running Style Performance</h2></div>
            <table className="uma-statistics-distance-table uma-overview-running-style-table">
              <caption className="sr-only">Recorded CM Uma race participations by historical running style. Usage excludes unknown styles.</caption>
              <thead><tr><th scope="col">Style</th><th scope="col">Races</th><th scope="col">Wins</th><th scope="col">Win Rate</th><th scope="col">Usage</th></tr></thead>
              <tbody>{runningStyles.rows.map((row) => (
                <tr key={row.style} data-running-style={row.style}>
                  <th scope="row">{row.label}</th>
                  <td>{row.races.toLocaleString("en")}</td><td>{row.wins.toLocaleString("en")}</td><td className="uma-statistics-rate">{formatUmaWinRate(row.winRate)}</td><td>{formatUmaWinRate(row.usage)}</td>
                </tr>
              ))}</tbody>
            </table>
          </section>
          <section className="uma-statistics-panel" aria-labelledby="uma-statistics-role-title">
            <div className="uma-statistics-section-heading"><h2 id="uma-statistics-role-title">Role Performance</h2></div>
            <table className="uma-statistics-distance-table uma-overview-role-table">
              <caption className="sr-only">Recorded CM Uma race participations by historical role. Usage excludes unknown role configurations.</caption>
              <thead><tr><th scope="col">Role</th><th scope="col">Races</th><th scope="col">Wins</th><th scope="col">Win Rate</th><th scope="col">Usage</th></tr></thead>
              <tbody>{roles.rows.map((row) => (
                <tr key={row.role} data-role={row.role}>
                  <th scope="row">{row.label}</th><td>{row.races.toLocaleString("en")}</td><td>{row.wins.toLocaleString("en")}</td><td className="uma-statistics-rate">{formatUmaWinRate(row.winRate)}</td><td>{formatUmaWinRate(row.usage)}</td>
                </tr>
              ))}</tbody>
            </table>
          </section>
        </div>
      </div>

      <div id="uma-statistics-compare" role="tabpanel" aria-labelledby="uma-statistics-tab-compare" hidden={activeTab !== "compare"} tabIndex={0}>
        <div className="uma-statistics-section-heading uma-statistics-comparison-heading">
          <div><h2>Compare Umas</h2><p>Select up to {MAX_COMPARISON_UMAS} versions to compare their competitive history.</p></div>
          <span className="uma-statistics-comparison-count" role="status">{comparisonIds.length} / {MAX_COMPARISON_UMAS} selected</span>
        </div>

        {comparisonSlotToFill !== null && (
          <UmaStatisticsSelector
            key={comparisonSlotToFill}
            id="uma-statistics-comparison-selector"
            umas={allUmas}
            selectedIds={comparisonIds}
            onSelect={addComparisonUma}
            onClose={closeComparisonSelector}
            comparison
          />
        )}

        <UmaComparisonTable
          cms={cms}
          slots={comparisonUmas}
          activeSlot={comparisonSlotToFill}
          headerPinned={compareHeaderPinned}
          onToggleHeaderPinned={() => setCompareHeaderPinned((pinned) => !pinned)}
          onAdd={(index) => comparisonSlotToFill === index ? closeComparisonSelector() : setComparisonSlotToFill(index)}
          onRemove={removeComparisonUma}
          onSlotButton={(index, button) => { comparisonSlotButtons.current[index] = button }}
        />
      </div>
        </div>
        {(detailsOpen || selectedUma) && (
          <div className="uma-statistics-view uma-statistics-detail-view" hidden={!detailsOpen && !transitioning} aria-hidden={!detailsOpen} inert={!detailsOpen}>
            <UmaStatisticsDetailPage key={selectedVersionId} uma={selectedUma} cms={cms} onBack={backToOverview} onOpenCm={onOpenCm} />
          </div>
        )}
      </div>
    </main>
  )
}
