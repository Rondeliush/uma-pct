import { useMemo, useState } from "react"
import type { Dispatch, SetStateAction } from "react"
import type { CM } from "../types/types"
import type { LoH, LoHEventDetails } from "../LoH/types"
import { useUmaDatabase } from "../context/UmaDatabaseContext"
import { changelog } from "../data/changelogData"
import database from "../data/uma-database.json"
import { calculateUmaStatistics } from "../Statistics/umaStatistics"
import { createLoHEvent } from "../LoH/lohData"
import LoHEventForm from "../LoH/LoHEventForm"
import { getHomeCareerStatistics, getHomeFavoriteStatistics, getHomeFeaturedUmas, getHomeOverview, getLatestHomeUmas } from "./homeData"
import type { HomeEvent } from "./homeData"
import useFavoriteUma from "./useFavoriteUma"
import HomeFeatureBanner from "./HomeFeatureBanner"
import HomeLatestUma from "./HomeLatestUma"
import HomeCurrentEvent from "./HomeCurrentEvent"
import HomeFavoriteUma from "./HomeFavoriteUma"
import HomeRecentResults from "./HomeRecentResults"
import HomeCareerStatistics from "./HomeCareerStatistics"
import HomeStatisticsTicker from "./HomeStatisticsTicker"
import { getHomeTickerFacts } from "./homeTickerData"
import "./Home.css"

type Props = { cms: CM[]; lohs: LoH[]; setCms: Dispatch<SetStateAction<CM[]>>; setLohs: Dispatch<SetStateAction<LoH[]>>; profileId?: string | null; onOpenChangelog: () => void; hasNewChangelog: boolean; onOpenCm: (number: number) => void; onOpenLoH: (number: number, focus?: { day: number | null; tab: "results" | "umas" }) => void; onOpenUmaStatistics: (id: string) => void; onOpenUmaDatabase: (id?: string) => void; onOpenStatistics: (section: "events" | "uma") => void }

export default function HomePage({ cms, lohs, setCms, setLohs, profileId = null, onOpenChangelog, hasNewChangelog, onOpenCm, onOpenLoH, onOpenUmaStatistics, onOpenUmaDatabase, onOpenStatistics }: Props) {
  const { characters, versions } = useUmaDatabase()
  const favorite = useFavoriteUma(profileId)
  const [creatingLoH, setCreatingLoH] = useState(false)
  const overview = useMemo(() => getHomeOverview(cms, lohs), [cms, lohs])
  const latestUmas = useMemo(() => getLatestHomeUmas(database.latestAddedVersionIds, versions), [versions])
  const favoriteUma = versions.find(version => version.id === favorite.id) ?? null
  const favoriteStats = useMemo(() => favoriteUma ? getHomeFavoriteStatistics(cms, lohs, favoriteUma.id) : null, [cms, lohs, favoriteUma])
  const statistics = useMemo(() => calculateUmaStatistics(cms, characters, versions), [cms, characters, versions])
  const featuredUmas = useMemo(() => getHomeFeaturedUmas(statistics.umas, versions, lohs), [statistics, versions, lohs])
  const careerStatistics = useMemo(() => getHomeCareerStatistics(cms, lohs), [cms, lohs])
  const tickerFacts = useMemo(() => getHomeTickerFacts(cms, lohs, characters, versions, statistics), [cms, lohs, characters, versions, statistics])

  function openEvent(item: HomeEvent) {
    if (item.kind === "cm") onOpenCm(item.event.number)
    else onOpenLoH(item.event.number)
  }
  function createLoH(details: LoHEventDetails) {
    const id = crypto.randomUUID(), timestamp = new Date().toISOString()
    setLohs(current => [...current, createLoHEvent(current, details, id, timestamp)])
    setCreatingLoH(false)
  }

  return <main className="home-dashboard" aria-labelledby="home-title" data-home-dashboard>
    <h1 id="home-title" className="sr-only">Home — your competitive journey</h1>
    <div className="home-top-grid">
      <HomeFeatureBanner key={profileId ?? "legacy"} lastCM={overview.lastCM} lastLoH={overview.lastLoH} featuredUmas={featuredUmas} latestUpdate={changelog[0]} versions={versions} hasNewChangelog={hasNewChangelog} onOpenEvent={openEvent} onOpenUma={onOpenUmaStatistics} onOpenChangelog={onOpenChangelog} />
      <HomeLatestUma versions={latestUmas} onOpen={onOpenUmaDatabase} onOpenDatabase={onOpenUmaDatabase} />
    </div>
    <HomeCurrentEvent active={overview.active} lastCompleted={overview.lastCompleted} versions={versions} cms={cms} setCms={setCms} onCreateLoH={() => setCreatingLoH(true)} onOpen={openEvent} />
    <div className="home-bottom-grid">
      <HomeFavoriteUma key={profileId ?? "legacy"} uma={favoriteUma} versions={versions} unavailable={favorite.ready && !!favorite.id && !favoriteUma} ready={favorite.ready} stats={favoriteStats} onSelectFavorite={favorite.change} onOpenStatistics={onOpenUmaStatistics} />
      <div className="home-secondary-stack">
        <HomeRecentResults results={overview.recent} onOpen={openEvent} onViewAll={() => onOpenStatistics("events")} />
        <HomeCareerStatistics statistics={careerStatistics} />
        <HomeStatisticsTicker facts={tickerFacts} />
      </div>
    </div>
    {creatingLoH && <LoHEventForm lohs={lohs} onCreate={createLoH} onClose={() => setCreatingLoH(false)} />}
  </main>
}
