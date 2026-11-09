import { useRef, useState } from "react"
import type { UmaVersion } from "../types/types"
import UmaAvatarImage from "../components/UmaAvatarImage"
import UmaName from "../LoH/components/LoHUmaName"
import { formatUmaWinRate } from "../Statistics/umaStatistics"
import type { getHomeFavoriteStatistics } from "./homeData"
import HomeIcon from "./HomeIcon"
import HomeFavoritePicker from "./HomeFavoritePicker"
import useHomeCarousel from "./useHomeCarousel"

const modes = ["cm", "loh"] as const
const count = (value: number | null) => value === null ? "—" : value.toLocaleString("en-US")
type Props = { uma: UmaVersion | null; versions: UmaVersion[]; unavailable: boolean; ready: boolean; stats: ReturnType<typeof getHomeFavoriteStatistics> | null; onSelectFavorite: (id: string) => Promise<void>; onOpenStatistics: (id: string) => void }

export default function HomeFavoriteUma({ uma, versions, unavailable, ready, stats, onSelectFavorite, onOpenStatistics }: Props) {
  const [choosing, setChoosing] = useState(false)
  const editButton = useRef<HTMLButtonElement>(null)
  function closeSearch(restoreFocus = true) {
    setChoosing(false)
    if (restoreFocus) requestAnimationFrame(() => editButton.current?.focus({ preventScroll: true }))
  }
  const picker = choosing ? <HomeFavoritePicker versions={versions} selectedId={uma?.id ?? ""} onSelect={onSelectFavorite} onClose={closeSearch} /> : null
  const carousel = useHomeCarousel(modes, 7000)
  const mode = modes[carousel.index]
  const metrics = stats ? mode === "cm" ? [
    ["CM Events", count(stats.cm.cmEvents)], ["Finals", count(stats.cm.finalAppearances)],
    ["Races", count(stats.cm.races)], ["Final Wins", count(stats.cm.finalWins)],
    ["Wins", count(stats.cm.wins)], ["Best Distance", stats.cmHighlights.bestDistance ? `${count(stats.cmHighlights.bestDistance.distance)} m` : "—"],
    ["Win Rate", formatUmaWinRate(stats.cm.winRate)], ["Best Style", stats.cmHighlights.bestRunningStyle?.label ?? "—"],
  ] : [
    ["LoH Events", count(stats.loh.events)], ["Extra Stages", count(stats.loh.extraStages)],
    ["Races", count(stats.loh.races)], ["Extra Stage Wins", count(stats.loh.extraStageWins)],
    ["Wins", count(stats.loh.wins)], ["Raw Points", count(stats.loh.rawPoints)],
    ["Win Rate", formatUmaWinRate(stats.loh.winRate)], ["", ""],
  ] : []
  return <section className="home-panel home-favorite" aria-labelledby="home-favorite-title" data-guide="home-favorite-uma" {...carousel.bind}>
    <header className="home-panel-heading"><h2 id="home-favorite-title"><HomeIcon name="heart" />Favorite Uma</h2><button ref={editButton} type="button" className="home-icon-button" aria-label="Change favorite Uma" aria-expanded={choosing} onClick={() => setChoosing(true)} disabled={!ready || choosing}><HomeIcon name="edit" /></button></header>
    {uma && stats ? <div className="home-favorite-body">
      <div className="home-favorite-art" aria-hidden="true"><UmaAvatarImage avatar={uma.avatar ?? ""} alt="" /></div>
      <div className="home-favorite-content"><div className="home-favorite-name">{picker ?? <h3><UmaName name={uma.displayName} /></h3>}</div>
        <div className="home-mode-tabs" role="tablist" aria-label="Favorite Uma event format">{modes.map((item, index) => <button key={item} type="button" id={`home-favorite-tab-${item}`} role="tab" aria-selected={mode === item} aria-controls="home-favorite-record" onClick={() => carousel.select(index)} onKeyDown={event => {
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); const next = (index + 1) % modes.length; carousel.select(next); document.getElementById(`home-favorite-tab-${modes[next]}`)?.focus() }
        }} tabIndex={mode === item ? 0 : -1}><HomeIcon name={item === "cm" ? "crown" : "star"} />{item === "cm" ? "CM" : "LoH"}</button>)}</div>
        <div id="home-favorite-record" className="home-favorite-record" role="tabpanel" aria-labelledby={`home-favorite-tab-${mode}`} data-home-favorite-mode={mode}>
          {(mode === "cm" ? stats.cm.races : stats.loh.races) > 0 ? <dl key={mode} className="home-favorite-metrics home-slide-enter">{metrics.map(([label, value], index) => label ? <div key={label} data-metric={label}><dt>{label}</dt><dd className={label === "Win Rate" || label === "Raw Points" ? "home-metric-accent" : ""}>{value}</dd></div> : <div key={index} aria-hidden="true" />)}</dl>
            : <div key={mode} className="home-favorite-record-empty home-slide-enter"><HomeIcon name={mode === "loh" ? "star" : "crown"} /><p>No {mode === "cm" ? "CM" : "LoH"} races recorded yet.</p><span>Her results will appear here.</span></div>}
        </div>
        <button type="button" className="home-cta home-favorite-cta" onClick={() => onOpenStatistics(uma.id)}>View Full Statistics<HomeIcon name="arrow" /></button>
      </div>
    </div> : <div className="home-favorite-empty" data-editing={choosing}><HomeIcon name="heart" /><h3>{!ready ? "Loading your favorite…" : unavailable ? "Your favorite is unavailable" : "Every trainer has a favorite."}</h3>{picker ?? <><p>{unavailable ? "Choose an available Uma version for your Home page." : "Choose an Uma to keep her competitive story close."}</p><button type="button" className="home-cta" onClick={() => setChoosing(true)} disabled={!ready}>Choose Favorite Uma<HomeIcon name="heart" /></button></>}</div>}
  </section>
}
