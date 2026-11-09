import { useUmaDatabase } from "../context/UmaDatabaseContext"
import UmaResultPortrait from "../components/UmaResultPortrait"
import { LOH_LINEUP_SIZE } from "./constants"
import { getLoHResultLineup, getLoHUmaStats, getUniqueTopScoringUma } from "./progress"
import { formatLoHNumber } from "./format"
import type { LoH } from "./types"

export default function LoHResultPortraits({ event }: { event: LoH }) {
  const { versions } = useUmaDatabase()
  const lineup = getLoHResultLineup(event)
  const stats = getLoHUmaStats(event)
  const featuredId = getUniqueTopScoringUma(event, lineup)
  const featured = lineup.find(uma => uma.umaId === featuredId)
  const sides = lineup.filter(uma => uma.umaId !== featuredId)
  const ordered = featured ? [sides[0], featured, sides[1]] : lineup

  return <section aria-label="Results lineup" data-loh-featured={featuredId ?? undefined} className="loh-result-portraits pointer-events-none mx-auto mt-8 w-full max-w-[560px]">
    <div className="loh-result-portrait-stage">
      <div className="loh-result-portrait-trio">
        {Array.from({ length: LOH_LINEUP_SIZE }, (_, index) => {
          const uma = ordered[index]
          const version = versions.find(item => item.id === uma?.umaId)
          const isFeatured = uma !== undefined && uma.umaId === featuredId
          const points = stats.find(item => item.umaId === uma?.umaId)?.rawPoints ?? 0
          return <div key={uma?.umaId ?? `empty-${index}`} data-loh-portrait={uma?.umaId ?? "empty"} data-featured={isFeatured || undefined}
            className={`relative flex h-full w-[165px] shrink-0 items-end justify-center transition-transform ${isFeatured ? "z-30 -translate-y-5 scale-[1.14]" : "z-20 scale-100"}`}>
            {isFeatured && <div className="pointer-events-none absolute bottom-[-10px] left-1/2 z-0 h-[225px] w-[215px] -translate-x-1/2 rounded-[50%]"
              style={{ background: "radial-gradient(ellipse at center, rgba(3,10,28,0.68) 0%, rgba(3,10,28,0.46) 42%, rgba(3,10,28,0.18) 62%, transparent 78%)", filter: "blur(10px)" }} />}
            {uma && <p data-loh-portrait-points className={`loh-result-points absolute left-1/2 z-40 -translate-x-1/2 whitespace-nowrap rounded-md border border-rose-200/25 bg-[#020611]/90 font-black tabular-nums text-rose-100 shadow-[0_2px_8px_rgba(0,0,0,0.45)] ${isFeatured ? "bottom-[213px]" : "bottom-[188px]"}`}>{formatLoHNumber(points)} PT</p>}
            <UmaResultPortrait avatar={version?.avatar} name={version?.displayName ?? uma?.umaId ?? "Empty lineup slot"}
              viewportClassName={`absolute bottom-0 left-1/2 z-10 overflow-hidden -translate-x-1/2 ${isFeatured ? "h-[205px] w-[200px]" : "h-[180px] w-[180px]"}`}
              imageClassName={isFeatured ? "h-[300px]" : "h-[260px]"}
              imageStyle={{ filter: isFeatured ? "drop-shadow(0 0 1px #fde047) drop-shadow(0 0 3px rgba(250,204,21,0.85)) drop-shadow(0 0 7px rgba(250,204,21,0.45))" : undefined }} />
          </div>
        })}
      </div>
    </div>
  </section>
}
