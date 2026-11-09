import { EventChevronIcon, TrackConditionIcon } from "../components/EventIcons"
import { formatLoHNumber } from "./format"
import { getLoHMainStage } from "./progress"
import type { LoH } from "./types"
import LoHRaceFlagGraphic from "./components/LoHRaceFlagGraphic"

function DaySummaryIcon({ kind }: { kind: "locked" | "completed" | "active" }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-full w-full" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {kind === "locked" ? <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V6a4 4 0 0 1 8 0v4M12 14v3" /></>
      : kind === "completed" ? <><circle cx="12" cy="12" r="9" /><path d="m7.5 12 3 3 6-6" /></>
      : <><circle cx="12" cy="12" r="9" opacity="0.3" /><path d="M12 3a9 9 0 0 1 9 9" strokeWidth="2.5" /></>}
  </svg>
}

export default function LoHDailySummary({ event, onOpenDay }: { event: LoH; onOpenDay: (day: number) => void }) {
  const stage = getLoHMainStage(event)
  return <section aria-label="Daily summary" className="relative z-20 mx-4 pt-3 sm:mx-7">
    <div className="loh-day-summary-grid grid gap-2.5 md:grid-cols-2">
      {stage.days.map(summary => {
        const { day, state } = summary
        const locked = state === "locked"
        const setCount = summary.sets.length
        return <button key={day} type="button" data-loh-day={day} data-loh-day-state={state} disabled={locked} onClick={() => { if (!locked) onOpenDay(day) }} aria-label={`Day ${day}: ${state}`}
          title={locked ? `Finish Day ${day - 1} to unlock Day ${day}.` : undefined}
          className="loh-day-summary-card relative isolate min-w-0 overflow-hidden rounded-2xl border px-3 py-3 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300 disabled:cursor-default">
          <span className="loh-day-summary-layout relative">
            <span className="loh-day-summary-heading flex min-w-0 flex-col items-start gap-1.5">
              <span className="loh-day-summary-title font-black tracking-tight">Day {day}</span>
              <span className="loh-day-summary-status inline-flex max-w-full items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold leading-4">
                <span className="h-3.5 w-3.5 shrink-0"><DaySummaryIcon kind={locked ? "locked" : state === "completed" ? "completed" : "active"} /></span>
                <span>{locked ? "Locked" : state === "completed" ? "Completed" : "In progress"}</span>
              </span>
            </span>
            <span className="loh-day-summary-counts flex min-w-0 flex-wrap gap-x-3 gap-y-1 text-[11px] font-medium leading-4 tabular-nums">
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap"><TrackConditionIcon kind="surface" className="h-4 w-4 shrink-0 text-rose-300" />{formatLoHNumber(setCount)} {setCount === 1 ? "Set" : "Sets"}</span>
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap"><svg viewBox="8 6 48 52" fill="currentColor" aria-hidden="true" className="h-4 w-4 shrink-0"><LoHRaceFlagGraphic /></svg>{formatLoHNumber(summary.races)} Races</span>
            </span>
            <span className="loh-day-summary-points whitespace-nowrap text-right font-black tabular-nums">{setCount ? <>+{formatLoHNumber(summary.awardedScore)} <span className="text-xs">PT</span></> : "\u2014"}</span>
            <span className="loh-day-summary-action flex items-center justify-center rounded-xl border"><span className="h-5 w-5">{locked ? <DaySummaryIcon kind="locked" /> : <EventChevronIcon className="h-full w-full" />}</span></span>
          </span>
        </button>
      })}
    </div>
  </section>
}
