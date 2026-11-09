import { useMemo, useRef, useState } from "react"
import type { CM, UmaVersion } from "../types/types"
import UmaAvatarImage from "../components/UmaAvatarImage"
import UmaResultPortrait from "../components/UmaResultPortrait"
import HomeCarouselTransition from "../Home/HomeCarouselTransition"
import HomeIcon from "../Home/HomeIcon"
import useHomeCarousel from "../Home/useHomeCarousel"
import { formatLoHNumber } from "../LoH/format"
import UmaStatisticsIcon from "./UmaStatisticsIcon"
import UmaName from "../LoH/components/LoHUmaName"
import { formatUmaWinRate } from "./umaStatistics"
import { formatUmaRankingValue, getUmaFinalAWins, getUmaRankingModes, rankUmaOverview } from "./umaRankingStatistics"
import type { UmaRankingEntry, UmaRankingMetric } from "./umaRankingStatistics"
import type { UmaOverviewData, UmaOverviewScope } from "./umaOverviewTypes"
import { getUmaSpotlightDeck, getUmaSpotlightExclusions, getUmaSpotlightIdentity } from "./umaSpotlightData"
import "../Home/Home.css"
import "./UmaStatisticsShowcase.css"

type Props = {
  cms: CM[]
  scopes: Record<UmaOverviewScope, UmaOverviewData>
  versions: UmaVersion[]
  onSelect: (id: string, trigger: HTMLButtonElement) => void
  active: boolean
}
type Scene = { id: string; scope: UmaOverviewScope; metric: UmaRankingMetric; title: string; label: string; note?: string; entries: UmaRankingEntry[] }
const backgrounds = {
  overall: "statistic_uma_background_Ove.png",
  cm: "statistic_uma_background_CM.png",
  loh: "statistic_uma_background_LoH.png",
}
const valueLabels: Record<UmaRankingMetric, string> = { wins: "Wins", races: "Races", events: "Events", "final-appearances": "Finals", "final-a-wins": "Final A wins", "raw-points": "Raw PT", "win-rate": "Win Rate" }
const scopeLabels: Record<UmaOverviewScope, string> = { overall: "Overall", cm: "CM", loh: "LoH" }
const spotlightSlots = [0, 1, 2] as const

function RankingControls({ scenes, carousel }: { scenes: Scene[]; carousel: ReturnType<typeof useHomeCarousel> }) {
  return <>
    <button type="button" className="home-carousel-arrow home-carousel-previous" onClick={carousel.previous} aria-label="Previous ranking category"><HomeIcon name="back" /></button>
    <button type="button" className="home-carousel-arrow home-carousel-next" onClick={carousel.next} aria-label="Next ranking category"><HomeIcon name="back" /></button>
    <div className="uma-scene-pagination" role="group" aria-label="Ranking categories">
      {(["overall", "cm", "loh"] as const).map(scope => <div key={scope} className="uma-scene-pagination-group" data-active={scenes[carousel.index].scope === scope} role="group" aria-label={`${scopeLabels[scope]} rankings`}>
        <span>{scopeLabels[scope]}</span>
        <div className="uma-scene-pagination-dots">
          {scenes.map((scene, index) => scene.scope === scope && <button key={scene.id} type="button" onClick={() => carousel.select(index)} aria-label={`${scopeLabels[scope]}: ${scene.title}`} aria-current={index === carousel.index ? "true" : undefined}><span /></button>)}
        </div>
      </div>)}
    </div>
  </>
}

function Podium({ scene, current, onSelect }: { scene: Scene; current: boolean; onSelect: Props["onSelect"] }) {
  if (!scene.entries.length) return null
  return <div className="uma-scene-podium" data-scene-id={scene.id}>
    {[scene.entries[1], scene.entries[0], scene.entries[2]].map((entry, index) => <div className="uma-scene-position" data-position={[2, 1, 3][index]} key={index}>
      {entry ? <button type="button" className="uma-scene-uma" data-place={entry.place} data-version-id={entry.uma.versionId} tabIndex={current ? 0 : -1}
        aria-label={`View ${entry.uma.name} statistics, rank ${entry.place}, ${formatUmaRankingValue(entry.value, scene.metric)}`}
        onClick={event => onSelect(entry.uma.versionId, event.currentTarget)}>
        <span className="uma-scene-art-clip" aria-hidden="true"><span className="uma-scene-art">{entry.uma.avatar ? <UmaResultPortrait avatar={entry.uma.avatar} name="" viewportClassName="absolute inset-0 overflow-hidden" imageClassName="h-full w-[120%]" imageStyle={{ objectPosition: "center bottom" }} /> : <span className="uma-scene-art-fallback">{entry.uma.name.charAt(0)}</span>}</span></span>
        <span className="uma-scene-plinth" data-place={entry.place}>
          <span className="uma-scene-place">{entry.place}</span>
          <span className="uma-scene-name"><UmaName name={entry.uma.name} /></span>
          <span className="uma-scene-result">{scene.metric !== "raw-points" && <small>{valueLabels[scene.metric]}</small>}<strong>{formatUmaRankingValue(entry.value, scene.metric)}</strong></span>
        </span>
      </button> : null}
    </div>)}
  </div>
}

function Spotlights({ scopes, sceneId, excluded, characterByVersion, reducedMotion, onSelect }: {
  sceneId: string; reducedMotion: boolean;
  scopes: Props["scopes"]; excluded: ReadonlySet<string>; characterByVersion: ReadonlyMap<string, string>;
  onSelect: Props["onSelect"]
}) {
  const [seed] = useState(() => Math.random())
  const [deck, setDeck] = useState(() => getUmaSpotlightDeck(null, sceneId, scopes.overall.umas, excluded, characterByVersion, seed))
  const nextDeck = getUmaSpotlightDeck(deck, sceneId, scopes.overall.umas, excluded, characterByVersion, seed)
  if (nextDeck !== deck) setDeck(nextDeck)
  const cmByVersion = useMemo(() => new Map(scopes.cm.umas.map(uma => [uma.versionId, uma])), [scopes.cm.umas])
  const lohByVersion = useMemo(() => new Map(scopes.loh.umas.map(uma => [uma.versionId, uma])), [scopes.loh.umas])
  const id = deck.pages[deck.index]?.id ?? "empty"
  return <aside className="uma-spotlights home-dashboard" aria-label="Uma spotlights">
    {spotlightSlots.map(index => <section key={index} className="uma-spotlight-banner home-panel" aria-label={`Featured Uma ${index + 1}`}>
      <HomeCarouselTransition slideId={id} direction={deck.direction} reducedMotion={reducedMotion} renderSlide={(slideId, current) => {
        const page = deck.pages.find(page => page.id === slideId) ?? (deck.previous?.id === slideId ? deck.previous : null)
        const entry = page?.entries[index]
        // Also filter departing Home frames when a new podium claims their Uma.
        if (entry && excluded.has(getUmaSpotlightIdentity(entry.uma.versionId, characterByVersion))) return null
        if (!entry) return current ? <div className="uma-spotlight-empty"><HomeIcon name="lineup" /><span><strong>Featured Uma</strong><small>No other qualifying Umas yet.</small></span></div> : null
        const cm = cmByVersion.get(entry.uma.versionId)
        const loh = lohByVersion.get(entry.uma.versionId)
        const rawPoints = loh ? loh.rawPoints ?? null : 0
        return <>
          <img className="home-feature-uma-background" src={`${import.meta.env.BASE_URL}home-background-featureuma.png`} alt="" />
          <button type="button" className="uma-spotlight-main home-feature-main" data-version-id={entry.uma.versionId} tabIndex={current ? 0 : -1}
          aria-label={`View ${entry.uma.name} statistics`}
          onClick={event => onSelect(entry.uma.versionId, event.currentTarget)}>
            <span className="home-panel-heading"><HomeIcon name="lineup" />Featured Uma</span>
            <span className="home-feature-copy">
              <span className="home-feature-title"><UmaName name={entry.uma.name} /></span>
              <span className="home-feature-record">
                <span data-metric="races"><b>{(cm?.races ?? 0).toLocaleString("en-US")}</b> Races</span>
                <span data-metric="wins"><b>{(cm?.wins ?? 0).toLocaleString("en-US")}</b> Wins</span>
                <span data-metric="win-rate"><b>{formatUmaWinRate(cm?.winRate ?? null)}</b> WR <small>in CM</small></span>
                <span className="home-feature-raw-points" data-metric="raw-points"><b>{rawPoints === null ? "—" : formatLoHNumber(rawPoints)}</b> <span>Raw pts <small>in LoH</small></span></span>
              </span>
            </span>
            <span className="home-feature-art" aria-hidden="true"><UmaAvatarImage avatar={entry.uma.avatar} alt="" /></span>
          </button>
        </>
      }} />
    </section>)}
  </aside>
}

export default function UmaStatisticsShowcase({ cms, scopes, versions, onSelect, active }: Props) {
  const finalAWins = useMemo(() => getUmaFinalAWins(cms, scopes.cm.umas), [cms, scopes.cm.umas])
  const scenes = useMemo(() => (["overall", "cm", "loh"] as const).flatMap(scope => getUmaRankingModes(scope).map(mode => ({
    ...mode, id: `${scope}:${mode.id}`, metric: mode.id, scope, entries: rankUmaOverview(scopes[scope].umas, mode.id, finalAWins).slice(0, 3),
  }))), [scopes, finalAWins])
  const ids = useMemo(() => scenes.map(scene => scene.id), [scenes])
  const countdownRef = useRef<HTMLSpanElement>(null)
  const carousel = useHomeCarousel(ids, 8500, active, countdownRef)
  const scene = scenes.find(scene => scene.id === ids[carousel.index])!
  const [frame, setFrame] = useState({ id: scene.id, previous: null as string | null, animated: !carousel.reducedMotion })
  if (frame.id !== scene.id) setFrame({ id: scene.id, previous: carousel.reducedMotion ? null : frame.id, animated: !carousel.reducedMotion })
  else if (carousel.reducedMotion && frame.animated) setFrame({ id: scene.id, previous: null, animated: false })
  const previous = scenes.find(scene => scene.id === frame.previous)
  const characterByVersion = useMemo(() => new Map(versions.map(version => [version.id, version.characterId])), [versions])
  const excluded = useMemo(() => getUmaSpotlightExclusions([...scene.entries, ...(previous?.entries ?? [])], characterByVersion), [scene.entries, previous?.entries, characterByVersion])

  return <section className="uma-showcase" aria-label="Uma performance showcase">
    <div className="uma-showcase-grid">
      <section className="uma-showcase-scene" data-scope={scene.scope} aria-roledescription="carousel" aria-label="Uma rankings">
        {Object.entries(backgrounds).map(([key, file]) => <img key={key} className="uma-scene-background" data-active={key === scene.scope} src={`${import.meta.env.BASE_URL}Statistic/${file}`} alt="" />)}
        <header className="uma-scene-heading"><span>{scene.scope === "overall" ? "Overall" : scene.scope === "cm" ? "Champions Meeting" : "League of Heroes"}</span><h2 id="uma-statistics-performance-title">{scene.title}</h2></header>
        <div className="uma-scene-window" onKeyDown={event => {
          if (event.target !== event.currentTarget || !["ArrowLeft", "ArrowRight"].includes(event.key)) return
          event.preventDefault()
          if (event.key === "ArrowLeft") carousel.previous()
          else carousel.next()
        }} tabIndex={0} aria-label="Ranking categories">
          {scene.entries.length > 0 && previous && previous.entries.length > 0 && !carousel.reducedMotion && <div key={`out-${previous.id}`} className="uma-scene-frame is-departing" aria-hidden="true" inert><Podium scene={previous} current={false} onSelect={onSelect} /></div>}
          <div key={scene.id} className="uma-scene-frame is-current" data-animated={frame.animated} onAnimationEnd={event => {
            if (event.target === event.currentTarget) setFrame(current => current.id === scene.id ? { ...current, previous: null, animated: false } : current)
          }}>{scene.entries.length ? <Podium scene={scene} current onSelect={onSelect} /> : <div className="uma-scene-empty"><UmaStatisticsIcon name="trophy" /><h3>No qualifying results yet</h3><p>{scene.note ?? "Record your first races to build your podium."}</p></div>}</div>
        </div>
        <footer className="uma-scene-footer"><div className="uma-scene-countdown" aria-hidden="true"><span ref={countdownRef} /></div><RankingControls scenes={scenes} carousel={carousel} /></footer>
      </section>
      <Spotlights scopes={scopes} sceneId={scene.id} excluded={excluded} characterByVersion={characterByVersion} reducedMotion={carousel.reducedMotion} onSelect={onSelect} />
    </div>
  </section>
}
