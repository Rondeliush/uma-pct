import type { LoH } from "./types"
import { getLoHDailySummaries } from "./progress"
import { formatLoHNumber } from "./format"
import LoHRaceSetDetails, { LoHRaceSetSummary } from "./LoHRaceSetDetails"
import LoHExtraStageHistory from "./LoHExtraStageHistory"

type Props = { event: LoH; compact?: boolean; day?: number | null; showDayHeading?: boolean; onEditSet: (id: string) => void; onDeleteSet: (id: string) => void }

export default function LoHRaceHistory({ event, compact = false, day: selectedDay = null, showDayHeading = true, onEditSet, onDeleteSet }: Props) {
  const days = getLoHDailySummaries(event).filter(day => selectedDay === null || day.day === selectedDay)
  const showExtraStage = selectedDay === null && event.extraStage?.result !== undefined
  if (!days.length && !showExtraStage) return <p className="py-6 text-center text-xs leading-6 text-slate-400">{selectedDay === null ? "No race sets recorded yet." : "No sets recorded."}</p>
  return <div className="mt-4 space-y-3">
    {days.map(day => {
      const sets = <div className={`space-y-3 ${showDayHeading ? "border-t border-white/[0.05] p-3" : ""}`}>
        {day.sets.map(set => <details key={set.id} data-loh-race-set={set.id} className="group/loh-set rounded-lg border border-white/[0.07] bg-slate-950/60">
          <summary className="grid min-h-12 cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
            <LoHRaceSetSummary set={set} />
          </summary>
          <LoHRaceSetDetails event={event} set={set} onEditSet={onEditSet} onDeleteSet={onDeleteSet} />
        </details>)}
      </div>
      return showDayHeading ? <details key={day.day} open={!compact} className="rounded-xl border border-rose-900/40 bg-slate-900/20">
        <summary className="flex min-h-16 cursor-pointer flex-wrap items-center justify-between gap-3 px-4 py-3 marker:text-rose-400">
          <span><span className="text-sm font-black text-white">Day {day.day}</span><span className="mt-1 block text-[11px] text-slate-400">{formatLoHNumber(day.races)} Races · {day.sets.length} {day.sets.length === 1 ? "Set" : "Sets"}</span></span>
          <span className="text-sm font-black tabular-nums text-rose-200">+{formatLoHNumber(day.awardedScore)} PT <span aria-hidden="true" className="ml-2 text-rose-300/50">⌄</span></span>
        </summary>
        {sets}
      </details> : <div key={day.day}>{sets}</div>
    })}
    {showExtraStage && <LoHExtraStageHistory event={event} />}
  </div>
}
