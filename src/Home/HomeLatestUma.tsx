import { useMemo } from "react"
import type { UmaVersion } from "../types/types"
import UmaAvatarImage from "../components/UmaAvatarImage"
import UmaName from "../LoH/components/LoHUmaName"
import HomeIcon from "./HomeIcon"
import HomeCarouselControls from "./HomeCarouselControls"
import useHomeCarousel from "./useHomeCarousel"

export default function HomeLatestUma({ versions, onOpen, onOpenDatabase }: { versions: UmaVersion[]; onOpen: (id: string) => void; onOpenDatabase: () => void }) {
  const ids = useMemo(() => versions.map(version => version.id), [versions])
  const carousel = useHomeCarousel(ids, 5500)
  const version = versions[carousel.index]
  return <section className="home-panel home-latest" aria-label="Latest added Uma" aria-roledescription="carousel" data-home-latest={version?.id ?? "empty"} {...carousel.bind}>
    <h2 className="home-panel-heading"><HomeIcon name="lineup" />Latest Added Uma</h2>
    {version ? <div className="home-latest-content">
      <button type="button" className="home-latest-main" onClick={() => onOpen(version.id)} aria-label={`Open ${version.displayName} in Uma Database`}>
        <span key={version.id} className="home-latest-portrait home-slide-enter" aria-hidden="true"><UmaAvatarImage avatar={version.avatar ?? ""} alt="" /></span>
        <span className="home-latest-copy"><strong><UmaName name={version.displayName} /></strong></span>
      </button>
    </div> : <div className="home-latest-empty"><p>No recent additions</p><button type="button" className="home-text-link" onClick={onOpenDatabase}>Open Uma Database <HomeIcon name="arrow" /></button></div>}
    <HomeCarouselControls count={versions.length} index={carousel.index} onSelect={carousel.select} onPrevious={carousel.previous} onNext={carousel.next} label="latest Uma" />
  </section>
}
