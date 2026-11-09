import { useEffect, useRef, useState } from "react"
import { LOH_MAIN_STAGE_DAYS } from "./constants"

type Props = { day: number; onClose: () => void; onConfirm: () => void }

export default function LoHFinishDayConfirmation({ day, onClose, onConfirm }: Props) {
  const finalDay = day === LOH_MAIN_STAGE_DAYS
  const [error, setError] = useState("")
  const formRef = useRef<HTMLFormElement>(null)
  useEffect(() => { formRef.current?.focus({ preventScroll: true }) }, [])
  return <form ref={formRef} tabIndex={-1} aria-label={`Confirm finish Day ${day}`} className="mt-3 rounded-xl border border-rose-500/30 bg-slate-950/60 p-3 outline-none" onSubmit={change => {
      change.preventDefault()
      try { onConfirm(); onClose() }
      catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to finish the day.") }
    }}>
      <h4 className="text-sm font-black text-white sm:col-span-2">Confirm finish Day {day}?</h4>
      <div className="mt-2">
        <p className="text-xs leading-5 text-slate-300">Make sure all Race Sets for this day have been recorded.</p>
        <p className="mt-2 text-xs leading-5 text-slate-400">After confirming, Day {day} will become read-only{finalDay ? " and Main Stage will be complete." : ` and Day ${day + 1} will be unlocked.`}</p>
      </div>
      {error && <p role="alert" className="mt-4 text-sm text-rose-300 sm:col-span-2">{error}</p>}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:col-span-2 sm:flex sm:justify-end">
        <button type="button" onClick={onClose} className="min-h-11 rounded-lg border border-white/10 px-3 text-xs font-bold text-slate-300 hover:bg-white/5">Cancel</button>
        <button type="submit" className="min-h-11 rounded-lg border border-rose-500 bg-rose-600/25 px-3 text-xs font-black text-rose-100 hover:bg-rose-600/40">Confirm Finish Day</button>
      </div>
    </form>
}
