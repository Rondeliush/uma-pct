import { formatTrackLength } from "../../formatting"
import type { LoH } from "../types"
import { TrackConditionIcon } from "../../components/EventIcons"
import { LOH_EVENT_RANDOM } from "../constants"

type Props = {
  event: Pick<LoH, "racecourse" | "surface" | "distance" | "length" | "direction" | "weather" | "season" | "condition">
  compact?: boolean
}

/** The same eight conditions and tile layout used by the CM event details. */
export default function LoHRaceConditions({ event, compact = false }: Props) {
  const conditions = [
    ["racecourse", "Racecourse", event.racecourse || null],
    ["surface", "Surface", event.surface],
    ["distance", "Distance", event.distance === null ? null : `${event.distance}m`],
    ["length", "Length", event.length === null ? null : formatTrackLength(event.length)],
    ["direction", "Direction", event.direction],
    ["weather", "Weather", LOH_EVENT_RANDOM],
    ["season", "Season", event.season],
    ["condition", "Condition", LOH_EVENT_RANDOM],
  ] as const

  return (
    <dl className={`grid gap-2 ${compact ? "grid-cols-2 sm:grid-cols-4 xl:grid-cols-8" : "grid-cols-2 md:grid-cols-4"}`}>
      {conditions.map(([kind, label, value]) => (
        <div key={kind} className="flex min-h-14 min-w-0 items-center gap-2 rounded-[10px] border border-white/[0.07] bg-white/[0.018] px-2.5 py-2 transition hover:border-rose-300/15 hover:bg-rose-300/[0.025] md:gap-2.5 md:px-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center text-rose-300 drop-shadow-[0_0_5px_rgba(244,63,94,0.4)]"><TrackConditionIcon kind={kind} /></div>
          <div className="min-w-0"><dt className="text-[11px] font-medium leading-4 text-blue-200/45">{label}</dt>
          <dd className="truncate text-sm font-bold leading-5 text-white md:text-base" title={value ?? "Not recorded"}>{value ?? "\u2014"}</dd></div>
        </div>
      ))}
    </dl>
  )
}
