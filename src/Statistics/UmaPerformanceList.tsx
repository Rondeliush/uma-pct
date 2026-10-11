import UmaDatabaseIcon from "../Umas/UmaDatabaseIcon"
import { UmaStatisticsAvatar } from "./UmaStatisticsSelector"
import { formatUmaWinRate } from "./umaStatistics"
import type { UmaPerformanceListEntry, UmaStatisticsSort } from "./umaStatistics"
import "./UmaPerformanceList.css"

type Props = {
  umas: UmaPerformanceListEntry[]
  sort: UmaStatisticsSort
  onSelect: (versionId: string, trigger: HTMLButtonElement) => void
}

const formatCount = (value: number) => value.toLocaleString("en")

export default function UmaPerformanceList({ umas, sort, onSelect }: Props) {
  const showRank = sort !== "name-az" && sort !== "name-za"

  return (
    <div className="uma-performance-list" data-show-rank={showRank}>
      <div className="uma-performance-list-heading" aria-hidden="true">
        <span className="uma-performance-list-rank">#</span><span>Uma</span>
        <span><span className="uma-performance-mobile-label">Events</span><span className="uma-performance-desktop-label">CM Events</span></span><span>Finals</span><span>Races</span><span>Wins</span><span><span className="uma-performance-mobile-label">WR</span><span className="uma-performance-desktop-label">Win Rate</span></span><span />
      </div>
      <ol className="uma-performance-list-rows" aria-label="Uma version performance">
        {umas.map((uma, index) => {
          const winRate = uma.hasRecordedData ? formatUmaWinRate(uma.winRate) : "—"
          const values = [
            { label: "CM Events", value: formatCount(uma.cmEvents), stat: "events" },
            { label: "Finals", value: formatCount(uma.finalAppearances), stat: "finals" },
            { label: "Races", value: formatCount(uma.races), stat: "races" },
            { label: "Wins", value: formatCount(uma.wins), stat: "wins" },
            { label: "Win Rate", value: winRate, stat: "win-rate" },
          ].map((value) => ({ ...value, value: uma.hasRecordedData ? value.value : "—" }))

          return (
            <li key={uma.versionId} className="uma-performance-list-row" data-version-id={uma.versionId} data-has-data={uma.hasRecordedData}>
              <button
                type="button"
                className="uma-performance-row-button"
                aria-label={`View ${uma.name} statistics. ${uma.hasRecordedData ? values.map((value) => `${value.label}: ${value.value}`).join(", ") : "No recorded data"}`}
                onClick={(event) => onSelect(uma.versionId, event.currentTarget)}
              >
                <span className="uma-performance-list-rank">{showRank && uma.hasRecordedData ? index + 1 : "—"}</span>
                <span className="uma-performance-list-identity">
                  <UmaStatisticsAvatar uma={uma} />
                  <span className="uma-performance-list-description">
                    <span className="uma-performance-list-name">{uma.name}</span>
                    {!uma.hasRecordedData && <span className="uma-performance-no-data">No recorded data</span>}
                  </span>
                </span>
                {values.slice(0, 4).map((value) => <span key={value.stat} className="uma-performance-desktop-stat" data-stat={value.stat}><span className="sr-only">{value.label}: </span>{value.value}</span>)}
                <span className="uma-performance-list-rate" data-unavailable={uma.winRate === null || !uma.hasRecordedData}>{winRate}</span>
                <UmaDatabaseIcon name="chevron" className="uma-performance-list-chevron" />
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
