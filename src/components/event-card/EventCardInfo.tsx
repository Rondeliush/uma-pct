import { formatTrackLength } from "../../formatting"
import { Fragment } from "react"
import type { ReactNode } from "react"
import { getTrackImage } from "../../data/trackData"
import type { CM } from "../../types/types"

type Props = {
  theme?: "cm" | "loh"
  name: string
  racecourse: string
  surface: CM["surface"] | null
  distance: number | null
  length: CM["length"] | null
  direction: string | null
  weather: string | null
  season: string | null
  condition: string | null
  status?: ReactNode
}

export default function EventCardInfo({ theme = "cm", name, racecourse, surface, distance, length, direction, weather, season, condition, status }: Props) {
  const isLoH = theme === "loh"
  const trackImage = getTrackImage(racecourse)
  const pillClass = `rounded-lg border bg-gray-950/70 px-3 py-1.5 text-sm font-bold text-white backdrop-blur-sm ${isLoH ? "inline-flex min-w-0 items-center gap-1 border-rose-800/60" : "border-blue-800/60"}`
  return <div className={`relative overflow-hidden ${isLoH ? "col-start-2 row-start-1 min-w-0" : ""}`}>
    <div className={`pointer-events-none absolute left-0 top-1/2 z-30 h-[68%] w-px -translate-y-1/2 bg-gradient-to-b from-transparent to-transparent ${isLoH ? "via-rose-400/80 shadow-[0_0_6px_rgba(244,63,94,0.65)]" : "via-sky-400/80 shadow-[0_0_6px_rgba(56,189,248,0.65)]"}`} />
    {trackImage ? <img src={trackImage} alt={racecourse} className="absolute inset-0 h-full w-full object-cover" /> : <div className={`absolute inset-0 bg-gradient-to-br ${isLoH ? "from-rose-950 via-rose-950 to-pink-950" : "from-blue-950 via-indigo-950 to-violet-950"}`} />}
    <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-gray-950 from-0% via-gray-950/80 via-45% to-gray-950/15 to-100%" />
    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-gray-950/90 via-transparent to-gray-950/45" />
    <div className="relative z-10 flex h-full flex-col justify-center px-5 py-4">
      <div className={`text-2xl font-black tracking-tight text-white drop-shadow-lg ${isLoH ? "break-words xl:truncate" : "truncate"}`} title={name}>{name}</div>
      <div className={`mt-4 flex items-center gap-2 ${isLoH ? "flex-wrap xl:flex-nowrap" : "flex-nowrap"}`}>
        <div className={`whitespace-nowrap ${pillClass}`} title="Racecourse"><span className={isLoH ? "truncate" : undefined}>{racecourse || "\u2014"}</span></div>
        <div title="Surface" className={`rounded-lg px-3 py-1.5 text-sm font-black ${isLoH ? "inline-flex items-center gap-1" : ""} ${surface === "Turf" ? "bg-emerald-900/90 text-emerald-200" : surface === "Dirt" ? "bg-amber-900/90 text-amber-200" : "bg-gray-950/70 text-gray-300"}`}>{surface ?? "\u2014"}</div>
        <div className={pillClass} title="Distance">{distance == null ? "\u2014" : `${distance}m`}</div>
        <div className={pillClass} title="Length">{formatTrackLength(length ?? "\u2014")}</div>
      </div>
      <div className={`mt-3 flex items-center text-sm font-semibold text-gray-300 ${isLoH ? "flex-wrap gap-x-3 gap-y-1" : "gap-3 whitespace-nowrap"}`}>
        {[direction, weather, season, condition].map((value, index) => <Fragment key={index}>
          {index > 0 && <span aria-hidden="true" className={isLoH ? "text-rose-800" : "text-blue-800"}>|</span>}
          <span>{value || "\u2014"}</span>
        </Fragment>)}
        {status && <><span aria-hidden="true" className={isLoH ? "text-rose-800" : "text-blue-800"}>|</span>{status}</>}
      </div>
    </div>
  </div>
}
