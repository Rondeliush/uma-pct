import type { ReactNode } from "react"
import type { LoH } from "./types"
import { getLoHPhase } from "./extraStage"
import { LOH_EXTRA_STAGE_CUTOFF } from "./constants"

type Props = { event: LoH; editing: boolean; count: number; onStart: () => void; onCancel: () => void; onSave: () => void; error: string; children: ReactNode }

export default function LoHExtraStageRegistration({ event, editing, count, onStart, onCancel, onSave, error, children }: Props) {
  const phase = getLoHPhase(event)
  const canRegister = phase === "EXTRA_STAGE_QUALIFIED"
  const waiting = !event.extraStage && !canRegister
  const waitingText = phase === "MAIN_STAGE" ? "Waiting for Main Stage completion" : phase === "AWAITING_MAIN_STAGE_RANK" ? "Waiting for Final Overall Rank"
    : event.overallRank !== null && event.overallRank > LOH_EXTRA_STAGE_CUTOFF ? "Not qualified for Extra Stage" : "Extra Stage lineup not recorded"
  return <section aria-label="Extra Stage lineup" className="mx-auto max-w-[760px]">
    <div className="relative mb-4 flex min-h-10 flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] pb-3">
      <h3 className="mt-0.5 text-lg font-black text-white">Extra Stage Lineup</h3>
      {editing && <div className="flex items-center gap-2 sm:gap-3"><span className="text-[11px] font-bold text-blue-100/45">{count}/3 selected</span>
        <button type="button" onClick={onCancel} className="h-9 rounded-lg border border-white/10 bg-white/[0.02] px-3 text-xs font-black text-slate-400 sm:px-4">Cancel</button>
        <button type="button" disabled={count !== 3} onClick={onSave} className="h-9 rounded-lg border border-rose-400/35 bg-rose-400/[0.06] px-3 text-xs font-black text-rose-200 transition hover:bg-rose-400/[0.1] disabled:border-white/[0.06] disabled:bg-transparent disabled:text-white/20 sm:px-4">Save Lineup</button>
      </div>}
    </div>
    {event.extraStage?.result && <p className="mb-2 text-[11px] text-blue-100/45">Extra Stage: {event.extraStage.result.weather} · {event.extraStage.result.condition}</p>}
    {canRegister && !editing && <div className="mb-4 flex items-center justify-between gap-5 border-l-2 border-rose-400/45 bg-gradient-to-r from-rose-400/[0.05] via-rose-400/[0.018] to-transparent px-4 py-3">
      <div><p className="text-[9px] font-black uppercase tracking-[0.18em] text-rose-200/45">Action Required</p><p className="mt-0.5 text-sm font-black text-white">Select your Extra Stage Lineup</p><p className="mt-0.5 text-[11px] font-medium text-blue-100/40">Choose 3 Umas that will participate in Extra Stage.</p></div>
      <button type="button" onClick={onStart} className="h-9 shrink-0 rounded-lg border border-rose-400/35 bg-rose-400/[0.07] px-5 text-xs font-black text-rose-200 hover:bg-rose-400/[0.12]">Set Lineup</button>
    </div>}
    <div className="relative"><div className={`flex min-h-36 items-start justify-center gap-3 sm:gap-8 ${waiting ? "opacity-25" : ""}`}>{children}</div>
      {waiting && <div className="absolute inset-0 flex -translate-y-2 items-center justify-center"><p className="max-w-[90%] border-y border-rose-300/15 bg-[#061426]/75 px-4 py-3 text-center text-xs font-black uppercase tracking-[0.08em] text-blue-100/65 backdrop-blur-[3px]">{waitingText}</p></div>}
    </div>
    {error && <p role="alert" className="mt-3 text-xs text-rose-300">{error}</p>}
  </section>
}
