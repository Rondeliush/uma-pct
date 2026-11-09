import { useMemo, useState } from "react"
import type { CM } from "../types/types"
import UmaAvatarImage from "../components/UmaAvatarImage"
import UmaDatabaseIcon from "../Umas/UmaDatabaseIcon"
import UmaStatisticsName from "./UmaStatisticsName"
import { getUmaPerformanceList } from "./umaStatistics"
import type { UmaStatisticsEntry } from "./umaStatistics"
import type { OverviewUma, UmaOverviewScope } from "./umaOverviewTypes"
import { formatUmaRankingValue, getUmaFinalAWins, getUmaRankingModes, getUmaRankingValue, rankUmaOverview } from "./umaRankingStatistics"
import type { UmaRankingEntry, UmaRankingMetric } from "./umaRankingStatistics"

type Props = {
  cms: CM[]
  umas: OverviewUma[]
  cmUmas: OverviewUma[]
  catalogue: UmaStatisticsEntry[]
  scope: UmaOverviewScope
  onScope: (scope: UmaOverviewScope) => void
  onSelect: (versionId: string, trigger: HTMLButtonElement) => void
}

function RankingCard({ entry, position, podium, tied, metric, onSelect }: {
  entry: UmaRankingEntry; position: number; podium?: boolean; tied?: boolean; metric: UmaRankingMetric; onSelect: Props["onSelect"]
}) {
  const { uma, value, place } = entry
  const valueLabel = formatUmaRankingValue(value, metric)
  return <div className={podium ? "uma-overview-podium-position" : "uma-overview-runner"} data-position={position}>
    <button type="button" className={`uma-overview-leader${podium ? " is-podium" : ""}`} data-rank={position} data-place={place} data-version-id={uma.versionId}
      aria-label={`View ${uma.name} statistics, rank ${place}, ${valueLabel}`} onClick={event => onSelect(uma.versionId, event.currentTarget)}>
      {!podium && <span className="uma-overview-rank" aria-hidden="true">{place}</span>}
      <span className="uma-overview-portrait" aria-hidden="true">{uma.avatar ? <UmaAvatarImage avatar={uma.avatar} alt="" loading={podium ? "eager" : "lazy"} /> : <span>{uma.name.charAt(0)}</span>}</span>
      <span className="uma-overview-leader-body"><span className="uma-overview-leader-name"><UmaStatisticsName name={uma.name} /></span><strong className="uma-overview-ranking-value">{metric === "raw-points" && value !== null ? <>{value.toLocaleString("en")}<small> PT</small></> : valueLabel}</strong></span>
    </button>
    {podium && <span className="uma-overview-podium-place" data-place={place}>{tied && "TIED "}{place}{place === 1 ? "ST" : place === 2 ? "ND" : "RD"}</span>}
  </div>
}

export default function UmaOverviewRanking({ cms, umas, cmUmas, catalogue, scope, onScope, onSelect }: Props) {
  const [sort, setSort] = useState<UmaRankingMetric | "name-az" | "name-za">("wins")
  const [view, setView] = useState<"cards" | "list">("cards")
  const modes = getUmaRankingModes(scope)
  const modeIndex = Math.max(0, modes.findIndex(mode => mode.id === sort))
  const mode = modes[modeIndex]
  const metric = mode.id
  const alphabetical = sort === "name-az" || sort === "name-za"
  const finalAWins = useMemo(() => getUmaFinalAWins(cms, cmUmas), [cms, cmUmas])
  const ranking = rankUmaOverview(umas, metric, finalAWins)
  const leaders = ranking.slice(0, 10)
  const podium = [leaders[1], leaders[0], leaders[2]]
  const list = alphabetical ? getUmaPerformanceList(catalogue, umas, sort).map(uma => ({ uma, value: uma.hasRecordedData ? getUmaRankingValue(uma, mode.id, finalAWins) : null, place: 0 })) : ranking
  const showMode = (index: number) => setSort(modes[(index + modes.length) % modes.length].id)
  const title = alphabetical ? "Uma Performance" : mode.title

  return <section className="uma-overview-ranking" data-scope={scope} aria-labelledby="uma-statistics-performance-title">
    <div className="uma-overview-scope-switch" role="group" aria-label="Statistics event scope">
      {(["cm", "loh", "overall"] as const).map(value => <button type="button" key={value} aria-pressed={scope === value} onClick={() => { setSort("wins"); onScope(value) }}>{value === "overall" ? "Overall" : value === "cm" ? "CM" : "LoH"}</button>)}
    </div>
    <div className="uma-overview-ranking-stage">
      <div className="uma-overview-ranking-heading">
        <label><span className="sr-only">Sort Uma performance</span><select aria-label="Sort Uma performance" value={alphabetical ? sort : mode.id} onChange={event => { const value = event.target.value as typeof sort; setSort(value); if (value.startsWith("name-")) setView("list") }}>
          {modes.map(mode => <option key={mode.id} value={mode.id}>{mode.label}</option>)}<option value="name-az">Name A–Z</option><option value="name-za">Name Z–A</option>
        </select></label>
        <div className="uma-overview-view-switch" role="group" aria-label="Uma Performance presentation">
          {(["cards", "list"] as const).map(presentation => <button key={presentation} type="button" aria-pressed={view === presentation} onClick={() => { if (presentation === "cards" && alphabetical) setSort("wins"); setView(presentation) }}><UmaDatabaseIcon name={presentation === "cards" ? "grid" : "list"} /><span>{presentation === "cards" ? "Cards" : "List"}</span></button>)}
        </div>
      </div>
      {view === "list" ? <div className="uma-overview-list" role="table" aria-label={`${scope} Uma performance`}>
        <div role="row" className="uma-overview-list-header"><span role="columnheader">Uma</span><span role="columnheader">{mode.label}</span></div>
        {list.map(({ uma, value }) => <div role="row" key={uma.versionId} className="uma-overview-list-row"><span role="cell"><button type="button" className="uma-overview-list-identity" onClick={event => onSelect(uma.versionId, event.currentTarget)}>{uma.avatar && <UmaAvatarImage avatar={uma.avatar} alt="" loading="lazy" />}<span>{uma.name}</span></button></span><strong role="cell">{formatUmaRankingValue(value, mode.id)}</strong></div>)}
      </div> : <div className="uma-overview-hero" aria-roledescription="carousel" aria-label="Uma performance rankings" tabIndex={0} onKeyDown={event => {
        if (event.target !== event.currentTarget || !["ArrowLeft", "ArrowRight"].includes(event.key)) return
        event.preventDefault(); showMode(modeIndex + (event.key === "ArrowLeft" ? -1 : 1))
      }}>
        <div className="uma-overview-hero-glow" aria-hidden="true" />
        <button type="button" className="uma-overview-carousel-arrow is-previous" aria-label="Previous ranking" onClick={() => showMode(modeIndex - 1)}>‹</button>
        {leaders.length ? <div className="uma-overview-podium" key={`${scope}-${mode.id}`}>
          {podium.map((entry, index) => entry ? <RankingCard key={entry.uma.versionId} entry={entry} position={[2, 1, 3][index]} podium tied={ranking.filter(row => row.place === entry.place).length > 1} metric={mode.id} onSelect={onSelect} /> : <div key={`empty-${index}`} aria-hidden="true" />)}
        </div> : <div className="uma-overview-empty"><h3>No qualifying results yet</h3><p>{mode.note ?? "Record races to see your leading Umas in this category."}</p></div>}
        <button type="button" className="uma-overview-carousel-arrow is-next" aria-label="Next ranking" onClick={() => showMode(modeIndex + 1)}>›</button>
      </div>}
      <div className="uma-overview-ranking-caption">
        <h2 id="uma-statistics-performance-title">{title}</h2>
        {mode.note && <p className="uma-overview-ranking-note">{mode.note}</p>}
        <div className="uma-overview-carousel-dots" aria-label="Ranking categories">{modes.map((mode, index) => <button type="button" key={mode.id} aria-label={mode.title} aria-pressed={!alphabetical && modeIndex === index} onClick={() => showMode(index)}><span /></button>)}</div>
      </div>
    </div>
    {view === "cards" && leaders.length > 3 && <div className="uma-overview-runners" aria-label="Ranking positions 4 through 10">{leaders.slice(3).map((entry, index) => <RankingCard key={entry.uma.versionId} entry={entry} position={index + 4} metric={mode.id} onSelect={onSelect} />)}</div>}
  </section>
}
