import type { ReactNode, Ref } from "react"
import type { LoH } from "./types"
import { formatLoHNumber } from "./lohData"
import LoHRank from "./LoHRank"
import { getLoHRankProgress } from "./ranks"
import LoHResultPortraits from "./LoHResultPortraits"
import LoHDailySummary from "./LoHDailySummary"
import { getLoHExtraStageOutcome } from "./extraStage"
import { getLoHMainStage } from "./progress"
import { LOH_EXTRA_STAGE_CUTOFF } from "./constants"

type Props = { event: LoH; onOpenDay: (day: number) => void; children?: ReactNode; ref?: Ref<HTMLDivElement>; dayViewRef?: Ref<HTMLDivElement> }

export default function LoHResults({ event, onOpenDay, children, ref, dayViewRef }: Props) {
  const progress = getLoHRankProgress(event.leagueScore)
  const stage = getLoHMainStage(event)
  const isQualified = stage.qualified
  const extraOutcome = getLoHExtraStageOutcome(event)

  return (
    <div ref={ref} data-loh-results className="pb-4">
      <section aria-label="League result" className="loh-results-hero relative isolate overflow-visible px-4 pb-3 pt-3 sm:px-7">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-cover bg-center opacity-70" style={{ backgroundImage: `url("${import.meta.env.BASE_URL}loh-background.png")` }} />
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-rose-950/20 via-slate-950/20 to-slate-950" />

        <aside aria-label="Overall ranking" className="absolute right-4 top-4 flex max-w-[130px] flex-col items-end text-right sm:right-7">
          {extraOutcome && <div aria-label="Extra Stage outcome" className="mb-3 text-right">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-rose-200">Extra Stage</p>
            <p className={`mt-1 font-black uppercase ${extraOutcome === "winner" ? "text-xl text-amber-200" : "text-base text-rose-100"}`}>{extraOutcome === "winner" ? "★ WINNER" : "PARTICIPATED"}</p>
          </div>}
          <h3 className="text-[9px] font-black uppercase tracking-[0.16em] text-rose-200/55">Overall Rank</h3>
          <p className={`mt-1 font-black tabular-nums text-white ${extraOutcome ? "text-sm" : "text-2xl"}`}>{event.overallRank === null ? "\u2014" : `#${formatLoHNumber(event.overallRank)}`}</p>
          {!extraOutcome && (isQualified ? <div className="mt-2 border-l-2 border-rose-400/60 pl-2">
            <p className="text-[8px] font-black uppercase tracking-[0.18em] text-rose-200/55">Extra Stage</p>
            <p className="mt-0.5 text-[10px] font-black uppercase tracking-wider text-rose-300">Qualified</p>
          </div> : stage.complete && event.overallRank !== null && event.overallRank > LOH_EXTRA_STAGE_CUTOFF && <p className="mt-2 text-[9px] font-bold uppercase tracking-wide text-slate-400">Not qualified for Extra Stage</p>)}
        </aside>

        <div className={`mx-auto max-w-[360px] text-center sm:pt-1 ${extraOutcome ? "pt-28" : "pt-20"}`}>
          <h3 className="text-[9px] font-black uppercase tracking-[0.22em] text-rose-300">League Score</h3>
          <div className="loh-results-current-rank mt-1"><LoHRank rank={progress.rank} size="large" /></div>
          <p data-loh-score className="mt-1 inline-flex items-baseline gap-1.5 whitespace-nowrap font-black tabular-nums leading-none tracking-tight text-white">
            <span className="text-3xl sm:text-4xl">{formatLoHNumber(event.leagueScore)}</span>
            <span className="text-xs tracking-normal text-rose-200/70 sm:text-sm">PT</span>
          </p>
        </div>

        <div className="loh-results-threshold relative isolate mx-auto mt-2 max-w-[520px] before:pointer-events-none before:absolute before:-inset-x-4 md:before:-inset-x-20 before:-inset-y-2 before:-z-10 before:bg-[linear-gradient(to_right,transparent,rgba(2,6,23,0.8)_16%,rgba(2,6,23,0.8)_84%,transparent)] before:blur-[6px] before:content-['']">
          <div className="mb-1 flex items-end justify-between gap-4">
            <div aria-label="Reached rank threshold" className="text-center">
              <LoHRank rank={progress.rank} />
              <p className="mt-0.5 text-[9px] font-bold tabular-nums text-slate-300">{formatLoHNumber(progress.threshold)} PT</p>
            </div>
            <div aria-label="Next rank threshold" className="text-center">
              {progress.nextRank !== null && progress.nextThreshold !== null ? <>
                <LoHRank rank={progress.nextRank} />
                <p className="mt-0.5 text-[9px] font-bold tabular-nums text-slate-300">{formatLoHNumber(progress.nextThreshold)} PT</p>
              </> : <p className="pb-1 text-[9px] font-black uppercase tracking-wider text-rose-200/60">Max Rank</p>}
            </div>
          </div>
          <div
            role="progressbar" aria-label="League rank progress" aria-valuemin={0} aria-valuemax={100}
            aria-valuenow={Math.round(progress.percent)}
            aria-valuetext={progress.nextRank ? `${formatLoHNumber(progress.pointsToNext)} PT to ${progress.nextRank}` : "Maximum league rank reached"}
            className="h-1.5 overflow-hidden rounded-full border border-white/[0.07] bg-slate-900"
          >
            <div className="h-full rounded-full bg-gradient-to-r from-rose-700 via-rose-500 to-rose-300 transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${progress.percent}%` }} />
          </div>
          <p data-loh-rank-remaining className="mt-1 text-center text-[9px] font-black uppercase tracking-[0.12em] text-rose-200/80">
            {progress.nextRank ? `${formatLoHNumber(progress.pointsToNext)} PT to ${progress.nextRank}` : "Maximum league rank reached"}
          </p>
        </div>
        <LoHResultPortraits event={event} />
      </section>
      <div ref={dayViewRef} data-loh-day-view>{children ?? <LoHDailySummary event={event} onOpenDay={onOpenDay} />}</div>
    </div>
  )
}
