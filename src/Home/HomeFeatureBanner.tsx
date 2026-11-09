import { useMemo, useState } from "react"
import type { UmaVersion } from "../types/types"
import type { ChangelogEntry } from "../data/changelogData"
import { getTrackImage } from "../data/trackData"
import UmaAvatarImage from "../components/UmaAvatarImage"
import UmaName from "../LoH/components/LoHUmaName"
import { formatUmaWinRate } from "../Statistics/umaStatistics"
import { formatLoHNumber } from "../LoH/format"
import { getHomeEventFeaturedUma, getHomeEventResult, getHomeEventTitle } from "./homeData"
import type { HomeEvent, HomeFeaturedUma } from "./homeData"
import HomeIcon from "./HomeIcon"
import HomeCarouselControls from "./HomeCarouselControls"
import HomeCarouselTransition from "./HomeCarouselTransition"
import useHomeCarousel from "./useHomeCarousel"

type Props = { lastCM: HomeEvent | null; lastLoH: HomeEvent | null; featuredUmas: HomeFeaturedUma[]; latestUpdate?: ChangelogEntry; versions: UmaVersion[]; hasNewChangelog: boolean; onOpenEvent: (item: HomeEvent) => void; onOpenUma: (id: string) => void; onOpenChangelog: () => void }

export default function HomeFeatureBanner({ lastCM, lastLoH, featuredUmas, latestUpdate, versions, hasNewChangelog, onOpenEvent, onOpenUma, onOpenChangelog }: Props) {
  const hasFeatured = featuredUmas.length > 0
  const ids = useMemo(() => [
    ...(lastCM ? [`cm-${lastCM.event.number}`] : []),
    ...(lastLoH ? [`loh-${lastLoH.event.number}`] : []),
    ...(hasFeatured ? ["uma-featured"] : []),
    ...(latestUpdate ? [`update-${latestUpdate.version}`] : []),
  ], [lastCM, lastLoH, hasFeatured, latestUpdate])
  const carousel = useHomeCarousel(ids, 7000)
  const featuredActive = ids[carousel.index] === "uma-featured"
  const poolKey = featuredUmas.map(item => item.uma.id).join("\0")
  const [rotation, setRotation] = useState(() => ({ pool: poolKey, active: featuredActive, visits: featuredActive ? 1 : 0, start: Math.floor(Math.random() * Math.max(1, featuredUmas.length)) }))
  if (rotation.pool !== poolKey) {
    setRotation({ pool: poolKey, active: featuredActive, visits: featuredActive ? 1 : 0, start: 0 })
  } else if (rotation.active !== featuredActive) {
    setRotation({ ...rotation, active: featuredActive, visits: rotation.visits + (featuredActive ? 1 : 0) })
  }
  // Advance only on arrival: the departing slide retains its original Uma throughout the animation.
  const featured = featuredUmas.length ? featuredUmas[(rotation.start + Math.max(0, rotation.visits - 1)) % featuredUmas.length] : undefined
  const slides = useMemo(() => [
    ...(lastCM ? [{ id: `cm-${lastCM.event.number}`, kind: "cm" as const, item: lastCM }] : []),
    ...(lastLoH ? [{ id: `loh-${lastLoH.event.number}`, kind: "loh" as const, item: lastLoH }] : []),
    ...(featured ? [{ id: "uma-featured", kind: "uma" as const, item: featured }] : []),
    ...(latestUpdate ? [{ id: `update-${latestUpdate.version}`, kind: "update" as const, item: latestUpdate }] : []),
  ], [lastCM, lastLoH, featured, latestUpdate])
  const slide = slides[carousel.index]
  function renderSlide(id: string, current: boolean) {
    const item = slides.find(slide => slide.id === id)
    if (!item && id !== "empty") return null
    const event = item?.kind === "cm" || item?.kind === "loh" ? item.item : null
    const eventUmaId = event ? getHomeEventFeaturedUma(event) : null
    const artwork = item?.kind === "uma" ? item.item.uma : versions.find(version => version.id === eventUmaId)
    const track = event ? getTrackImage(event.kind === "cm" ? event.event.track : event.event.racecourse) : null
    const label = item?.kind === "cm" ? "Last CM" : item?.kind === "loh" ? "Last LoH" : item?.kind === "uma" ? "Featured Uma" : "Latest UmaPCT Update"
    const title = event ? getHomeEventTitle(event) : item?.kind === "uma" ? item.item.uma.displayName : item?.kind === "update" ? `UmaPCT v${item.item.version}` : "Your next chapter starts here"
    const action = event ? "View Event" : item?.kind === "uma" ? "View Statistics" : "View Changelog"
    return <>
      {track && <img className="home-feature-track" src={track} alt="" />}
      {item?.kind === "uma" && <img className="home-feature-uma-background" src={`${import.meta.env.BASE_URL}home-background-featureuma.png`} alt="" />}
      <button type="button" className="home-feature-main" data-tone={item?.kind ?? "home"} tabIndex={current ? 0 : -1} onClick={() => {
        if (event) onOpenEvent(event)
        else if (item?.kind === "uma") onOpenUma(item.item.uma.id)
        else onOpenChangelog()
      }}>
        <span className="home-panel-heading"><HomeIcon name={item?.kind === "cm" ? "crown" : item?.kind === "loh" ? "star" : item?.kind === "uma" ? "lineup" : "book"} />{label}{item?.kind === "update" && hasNewChangelog && <span className="home-new-tag">New</span>}</span>
        <span className="home-feature-copy">
          <span className="home-feature-title">{item?.kind === "uma" ? <UmaName name={title} /> : title}</span>
          {event ? <><span className="home-feature-result">{getHomeEventResult(event)}</span><span className="home-feature-course">{event.kind === "cm" ? event.event.track : event.event.racecourse} <i />{event.event.surface ?? "Surface unknown"} <i />{event.event.distance === null ? "Distance unknown" : `${event.event.distance.toLocaleString("en-US")} m`}</span></>
            : item?.kind === "uma" ? <span className="home-feature-record"><span><b>{item.item.stats.races.toLocaleString("en-US")}</b> Races</span><span><b>{item.item.stats.wins.toLocaleString("en-US")}</b> Wins</span><span><b>{formatUmaWinRate(item.item.stats.winRate)}</b> WR <small>in CM</small></span><span className="home-feature-raw-points"><b>{item.item.lohRawPoints == null ? "—" : formatLoHNumber(item.item.lohRawPoints)}</b> <span>Raw pts <small>in LoH</small></span></span></span>
            : item?.kind === "update" ? <span className="home-update-copy">{(item.item.new ?? item.item.improved ?? item.item.fixed ?? []).slice(0, 2).map((change, index) => <span key={index}>{change}</span>)}</span>
            : <span className="home-feature-result">Keep your competitive story in one place.</span>}
        </span>
        {artwork?.avatar ? <span className="home-feature-art" aria-hidden="true"><UmaAvatarImage avatar={artwork.avatar} alt="" /></span>
          : <span className="home-feature-emblem" aria-hidden="true"><HomeIcon name={item?.kind === "update" ? "book" : "trophy"} /></span>}
        <span className="home-cta home-feature-cta">{action}<HomeIcon name="arrow" /></span>
      </button>
    </>
  }

  return <section className="home-panel home-feature" data-home-feature={slide?.id ?? "empty"} data-home-featured-uma={slide?.kind === "uma" ? slide.item.uma.id : undefined} data-tone={slide?.kind ?? "home"} data-guide="home-whats-new" aria-label="Home features" aria-roledescription="carousel" {...carousel.bind}>
    <HomeCarouselTransition slideId={slide?.id ?? "empty"} direction={carousel.direction} reducedMotion={carousel.reducedMotion} guide="home-latest-cm" renderSlide={renderSlide} />
    <HomeCarouselControls count={slides.length} index={carousel.index} onSelect={carousel.select} onPrevious={carousel.previous} onNext={carousel.next} label="feature" />
  </section>
}
