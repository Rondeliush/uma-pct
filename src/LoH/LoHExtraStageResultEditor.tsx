import { useState } from "react"
import type { LoH, LoHExtraStagePlacement, LoHExtraStageResult } from "./types"
import { useUmaDatabase } from "../context/UmaDatabaseContext"
import UmaAvatarImage from "../components/UmaAvatarImage"
import { TRACK_WEATHER } from "../types/types"
import TrackConditionOptions from "../components/TrackConditionOptions"
import type { TrackCondition, TrackWeather } from "../types/types"
import { assertLoHExtraStageResult, LOH_EXTRA_STAGE_PLACEMENTS, LOH_EXTRA_STAGE_PLACEMENT_LABELS } from "./extraStage"

/** CM Final's compact inline placement controls, with LoH's race conditions and completion. */
export default function LoHExtraStageResultEditor({ event, onComplete }: { event: LoH; onComplete: (input: LoHExtraStageResult) => void }) {
  const { versions } = useUmaDatabase()
  const lineup = event.extraStage!.lineupSnapshot
  const [identity] = useState(() => ({ id: crypto.randomUUID(), createdAt: new Date().toISOString() }))
  const [placements, setPlacements] = useState<(LoHExtraStagePlacement | "")[]>(lineup.map(() => ""))
  const [weather, setWeather] = useState<TrackWeather | "">("")
  const [condition, setCondition] = useState<TrackCondition | "">("")
  const [error, setError] = useState("")
  const input: LoHExtraStageResult = { ...identity, weather: weather as TrackWeather, condition: condition as TrackCondition,
    placements: lineup.map((uma, index) => ({ umaId: uma.umaId, placement: placements[index] as LoHExtraStagePlacement })) }
  let valid = false
  try { assertLoHExtraStageResult(input, lineup); valid = true } catch { /* Complete stays disabled until all required fields are set. */ }
  return <form aria-label="Extra Stage Result Setup" className="mx-3 mb-5 mt-3 border-l-2 border-rose-400/45 bg-gradient-to-r from-rose-400/[0.045] via-rose-400/[0.018] to-transparent px-4 py-3 md:mx-5" onSubmit={change => {
    change.preventDefault()
    if (!valid) return
    try { onComplete(input) } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not complete LoH.") }
  }}>
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-[9px] font-black uppercase tracking-[0.18em] text-rose-200/40">Final Result Setup</p><h3 className="mt-1 text-sm font-black text-white">Extra Stage</h3></div>
      <div className="grid w-full grid-cols-2 gap-3 sm:w-auto sm:min-w-72">
        <label className="text-xs font-bold text-rose-200/60">Weather<select aria-label="Extra Stage Weather" required value={weather} onChange={change => setWeather(change.target.value as TrackWeather)} className="mt-1 h-10 w-full rounded-lg border border-rose-400/25 bg-[#071426]/90 px-2 text-xs text-white"><option value="" disabled>Select Weather</option>{TRACK_WEATHER.map(value => <option key={value}>{value}</option>)}</select></label>
        <label className="text-xs font-bold text-rose-200/60">Condition<select aria-label="Extra Stage Condition" required value={condition} onChange={change => setCondition(change.target.value as TrackCondition)} className="mt-1 h-10 w-full rounded-lg border border-rose-400/25 bg-[#071426]/90 px-2 text-xs text-white"><option value="" disabled>Select Condition</option><TrackConditionOptions value={condition} /></select></label>
      </div>
    </div>
    <p className="mb-2 mt-4 text-xs font-bold text-rose-200/60">Individual Uma Placements</p>
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      {lineup.map((uma, index) => {
        const version = versions.find(item => item.id === uma.umaId)
        const name = version?.displayName ?? uma.umaId
        return <fieldset key={uma.umaId} data-loh-final-participant={uma.umaId} className="min-w-0 rounded-lg border border-white/[0.06] bg-[#071426]/60 p-2.5">
          <legend className="sr-only">{name}</legend>
          <div className="mb-2 flex min-w-0 items-center gap-2"><div className="h-12 w-10 shrink-0 overflow-hidden"><UmaAvatarImage avatar={version?.avatar ?? ""} alt={name} className="h-full w-full object-contain" /></div><span className="min-w-0 break-words text-xs font-bold text-rose-100/80">{name}</span></div>
          <div className="grid grid-cols-4 gap-1">{LOH_EXTRA_STAGE_PLACEMENTS.map(place => {
            const selected = placements[index] === place
            const occupied = place !== "fourth_or_lower" && placements.some((other, slot) => slot !== index && other === place)
            return <button key={place} type="button" aria-label={`${name}: ${LOH_EXTRA_STAGE_PLACEMENT_LABELS[place]}`} aria-pressed={selected} data-loh-final-placement={place} disabled={occupied}
              onClick={() => setPlacements(current => current.map((value, slot) => slot === index ? selected ? "" : place : value))}
              className={`h-9 min-w-0 rounded-md border text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-30 ${selected ? "border-rose-300/65 bg-rose-500/15 text-white" : "border-rose-400/25 bg-[#071426]/90 text-rose-100/65 hover:border-rose-300/45"}`}>{LOH_EXTRA_STAGE_PLACEMENT_LABELS[place]}</button>
          })}</div>
        </fieldset>
      })}
    </div>
    <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-end md:gap-4">
      {error && <p role="alert" className="text-xs font-semibold text-amber-300/75">{error}</p>}
      <button type="submit" disabled={!valid} className="h-10 w-full shrink-0 rounded-lg border border-rose-400/35 bg-rose-700/80 px-5 text-sm font-black text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.04] disabled:text-white/25 md:w-auto md:min-w-[150px]">Complete LoH</button>
    </div>
  </form>
}
