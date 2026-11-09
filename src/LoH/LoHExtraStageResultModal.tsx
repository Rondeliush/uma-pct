import { useState } from "react"
import type { LoH, LoHExtraStagePlacement, LoHExtraStageResult } from "./types"
import { useUmaDatabase } from "../context/UmaDatabaseContext"
import { TRACK_WEATHER } from "../types/types"
import TrackConditionOptions from "../components/TrackConditionOptions"
import type { TrackCondition, TrackWeather } from "../types/types"
import { assertLoHExtraStageResult, LOH_EXTRA_STAGE_PLACEMENTS, LOH_EXTRA_STAGE_PLACEMENT_LABELS } from "./extraStage"
import { saveLoHExtraStageResult } from "./progress"
import LoHModalFrame from "./LoHModalFrame"

export default function LoHExtraStageResultModal({ event, onClose, onSave }: { event: LoH; onClose: () => void; onSave: (input: LoHExtraStageResult) => void }) {
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
  try { assertLoHExtraStageResult(input, lineup); valid = true } catch { /* Incomplete fields keep Save disabled. */ }
  return <LoHModalFrame title="Add Extra Stage Result" onClose={onClose}>
    <form className="p-5 sm:p-7" onSubmit={change => {
      change.preventDefault()
      if (!valid) return
      try { saveLoHExtraStageResult(event, input); onSave(input); onClose() }
      catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save Extra Stage result.") }
    }}>
      <h3 className="pr-12 text-xl font-black text-white">Add Extra Stage Result</h3>
      <p className="mt-2 text-xs text-slate-400">Record the single final race for your registered lineup.</p>
      <div className="mt-5 space-y-3">
        {lineup.map((uma, index) => <label key={uma.umaId} className="grid grid-cols-[minmax(0,1fr)_100px] items-center gap-3 rounded-lg border border-rose-400/15 p-3 text-sm font-bold text-rose-100">
          <span className="min-w-0 break-words">{versions.find(version => version.id === uma.umaId)?.displayName ?? uma.umaId}</span>
          <select aria-label={`Extra Stage placement ${index + 1}`} required value={placements[index]} onChange={change => {
            const value = change.target.value as LoHExtraStagePlacement | ""
            if (value && value !== "fourth_or_lower" && placements.some((place, slot) => slot !== index && place === value)) return
            setPlacements(current => current.map((place, slot) => slot === index ? value : place))
          }} className="min-h-11 rounded-lg border border-rose-900/70 bg-slate-950 px-2 text-sm text-white">
            <option value="">Place</option>{LOH_EXTRA_STAGE_PLACEMENTS.map(place => <option key={place} value={place} disabled={place !== "fourth_or_lower" && placements.some((other, slot) => slot !== index && other === place)}>{LOH_EXTRA_STAGE_PLACEMENT_LABELS[place]}</option>)}
          </select>
        </label>)}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <label className="text-xs font-bold text-slate-400">Weather<select aria-label="Extra Stage Weather" required value={weather} onChange={change => setWeather(change.target.value as TrackWeather)} className="mt-2 min-h-11 w-full rounded-lg border border-rose-900/70 bg-slate-950 px-2 text-white"><option value="" disabled>Select Weather</option>{TRACK_WEATHER.map(value => <option key={value}>{value}</option>)}</select></label>
        <label className="text-xs font-bold text-slate-400">Condition<select aria-label="Extra Stage Condition" required value={condition} onChange={change => setCondition(change.target.value as TrackCondition)} className="mt-2 min-h-11 w-full rounded-lg border border-rose-900/70 bg-slate-950 px-2 text-white"><option value="" disabled>Select Condition</option><TrackConditionOptions value={condition} /></select></label>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-rose-300">{error}</p>}
      <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onClose} className="min-h-11 rounded-lg border border-white/10 px-4 text-sm font-bold text-slate-300">Cancel</button>
        <button type="submit" disabled={!valid} className="min-h-11 rounded-lg border border-rose-500 bg-rose-950/60 px-4 text-sm font-black text-rose-100 disabled:opacity-40">Save Extra Stage Result</button></div>
    </form>
  </LoHModalFrame>
}
