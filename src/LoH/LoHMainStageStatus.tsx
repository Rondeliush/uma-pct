import { useState } from "react"
import type { LoH } from "./types"
import { getLoHMainStage } from "./progress"
import { formatLoHNumber } from "./format"
import { getLoHExtraStageOutcome, getLoHPhase } from "./extraStage"

export default function LoHMainStageStatus({ event, onProceed, onEnd, onConfirmRank }: { event: LoH; onProceed: () => void; onEnd: () => void; onConfirmRank: (rank: number) => void }) {
  const [rank, setRank] = useState("")
  const [error, setError] = useState("")
  const stage = getLoHMainStage(event)
  const phase = getLoHPhase(event)
  const validRank = rank.trim() !== "" && Number.isSafeInteger(Number(rank)) && Number(rank) >= 1
  // Registered Extra Stage uses its inline final form. Completed events need no action panel.
  if (!stage.complete || event.completed || phase === "EXTRA_STAGE_READY") return null
  const result = event.extraStage?.result
  const title = result ? getLoHExtraStageOutcome(event) === "winner" ? "Extra Stage Winner" : "Extra Stage Participant"
    : phase === "AWAITING_MAIN_STAGE_RANK" ? "Main Stage Complete" : stage.qualified ? "Qualified for Extra Stage" : "Did not qualify for Extra Stage"
  return <section aria-label="Main Stage status" className="mx-3 mb-5 mt-3 flex flex-col justify-between gap-3 border-l-2 border-rose-400/45 bg-gradient-to-r from-rose-400/[0.045] via-rose-400/[0.018] to-transparent px-4 py-3 sm:flex-row sm:items-center md:mx-5">
    <div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-[0.18em] text-rose-200/40">Current Status</p>
      <h3 className="mt-0.5 text-sm font-black text-white">{title}</h3>
      <p className="mt-0.5 text-[11px] text-slate-400">{phase === "AWAITING_MAIN_STAGE_RANK" ? "Enter your Final Overall Rank." : `Final Overall Rank: #${formatLoHNumber(event.overallRank!)}`}</p>
    </div>
    {phase === "AWAITING_MAIN_STAGE_RANK" ? <form className="flex flex-wrap items-end gap-2 sm:shrink-0" onSubmit={change => {
      change.preventDefault()
      if (!validRank) return
      try { onConfirmRank(Number(rank)); setError("") } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to confirm rank.") }
    }}>
      <label className="text-[10px] font-bold text-rose-200/65">Final Overall Rank<input aria-label="Final Overall Rank" type="number" min="1" step="1" required value={rank} onChange={change => setRank(change.target.value)} placeholder="#" className="no-spinner mt-1 block h-10 w-28 rounded-lg border border-rose-400/25 bg-[#071426]/90 px-3 text-sm text-white outline-none focus:border-rose-400" /></label>
      <button type="submit" disabled={!validRank} className="h-10 rounded-lg border border-rose-400/35 bg-rose-700/80 px-4 text-xs font-black text-white disabled:opacity-40">Confirm Rank</button>
      {error && <p role="alert" className="w-full text-xs text-rose-300">{error}</p>}
    </form> : <button type="button" onClick={stage.qualified && !result ? onProceed : onEnd} className="h-10 shrink-0 rounded-lg border border-rose-400/35 bg-rose-700/80 px-4 text-xs font-black text-white transition hover:bg-rose-600">{result ? "Complete LoH" : stage.qualified ? "Proceed to Extra Stage" : "End LoH"}</button>}
  </section>
}
