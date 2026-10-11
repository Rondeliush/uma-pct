import { useState } from "react"
import type { Dispatch, SetStateAction } from "react"
import type { CM, CMFinalPlacement, CMLogEntryType } from "../types/types"
import { useUmaDatabase } from "../context/UmaDatabaseContext"
import UmaAvatarImage from "../components/UmaAvatarImage"
import BadgeTooltip, { BadgeTooltipGroup } from "../components/BadgeTooltip"
import { changeCMTeamResult, changeCMUmaPlacement, getCMFinalResults } from "./cmParticipantConfiguration"
import { CM_FINAL_PLACEMENTS, CM_FINAL_PLACEMENT_LABELS, getCMFinalValidationErrors, isCMFinalPlacementAllowed, isCMTeamPlacement } from "./cmFinalPlacements"

type Props = { cm: CM; setCms: Dispatch<SetStateAction<CM[]>>; onComplete: () => void }

function logChange(next: CM, type: CMLogEntryType, message: string, details: string[]): CM {
  return { ...next, log: [...(next.log ?? []), {
    id: `cm${next.number}-${type}-${Date.now()}`, timestamp: new Date().toISOString(), type, message, details,
  }] }
}

export default function CMFinalResultEditor({ cm, setCms, onComplete }: Props) {
  const { versions } = useUmaDatabase()
  const [error, setError] = useState("")
  const results = getCMFinalResults(cm)
  const teamSelected = isCMTeamPlacement(cm.finalPlace)
  const completionErrors = getCMFinalValidationErrors(cm, { requireWinner: true })

  const update = (action: (current: CM) => CM) => {
    try {
      action(cm)
      setError("")
      setCms((current) => current.map((item) => {
        if (item.number !== cm.number) return item
        try { return action(item) } catch { return item }
      }))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save the final result.")
    }
  }

  const setTeamResult = (finalPlace: string) => update((current) => current.finalPlace === finalPlace ? current
    : logChange(changeCMTeamResult(current, finalPlace), "finalPlaceUpdated", "Final result updated.", [
      `Team placement: ${current.finalPlace || "Not set"} → ${finalPlace || "Not set"}`,
    ]))

  const setPlacement = (cmUmaId: string, placement: CMFinalPlacement | null) => update((current) => {
    const result = getCMFinalResults(current).find((item) => item.cmUmaId === cmUmaId)
    const version = versions.find((item) => item.id === result?.configuration.umaVersionId)
    return logChange(changeCMUmaPlacement(current, cmUmaId, placement), "finalParticipantPlacementUpdated", "Individual final placement updated.", [
      `${version?.displayName ?? "Unknown Uma"}: ${result?.placement ? CM_FINAL_PLACEMENT_LABELS[result.placement] : "Not set"} → ${placement ? CM_FINAL_PLACEMENT_LABELS[placement] : "Not set"}`,
    ])
  })

  if (cm.phase === "completed") return (
    <div className="absolute left-4 top-12 z-40 md:left-5 md:top-4">
      <BadgeTooltipGroup>
        <BadgeTooltip title="Edit final result" onAction={() => update((current) => ({ ...current, phase: "finalResult" }))}>
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-blue-900/70 bg-gray-950/60 text-gray-400 transition hover:border-cyan-400/50 hover:bg-cyan-950/60 hover:text-cyan-200 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:w-11">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />
            </svg>
          </span>
        </BadgeTooltip>
      </BadgeTooltipGroup>
    </div>
  )

  return (
    <section className="mx-3 mt-3 border-l-2 border-violet-400/45 bg-gradient-to-r from-violet-400/[0.045] via-blue-400/[0.018] to-transparent px-4 py-3 md:mx-5" aria-label="Final Result Setup">
      <div className="mb-2 text-[9px] font-black uppercase tracking-[0.18em] text-violet-200/40">Final Result Setup</div>
      <fieldset>
        <legend className="mb-1.5 text-xs font-bold text-violet-200/45">Team Placement</legend>
        <div className="flex flex-wrap gap-2" data-final-team-placement>
          {(["1st", "2nd", "3rd"] as const).map((place) => (
            <button key={place} type="button" aria-pressed={cm.finalPlace === place} onClick={() => setTeamResult(place)}
              className={`h-10 min-w-16 rounded-lg border px-3 text-sm font-black transition ${cm.finalPlace === place
                ? "border-violet-300/65 bg-violet-500/15 text-white" : "border-violet-400/25 bg-[#071426]/90 text-blue-100/65 hover:border-violet-300/45"}`}>
              {place}
            </button>
          ))}
          {teamSelected && <button type="button" onClick={() => setTeamResult("")} className="px-2 text-xs font-bold text-blue-100/45 transition hover:text-blue-100">Clear</button>}
        </div>
      </fieldset>

      <div className="mt-4">
        <div className="mb-2 text-xs font-bold text-violet-200/45">Individual Uma Placements</div>
        {!teamSelected && <p className="mb-2 text-xs text-blue-100/45">Select the team result first.</p>}
        {results.length === 0 && <p className="text-xs text-blue-100/45">Save the Final Lineup in the Umas tab first.</p>}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {results.map((result) => {
            const version = versions.find((item) => item.id === result.configuration.umaVersionId)
            return (
              <fieldset key={result.cmUmaId} disabled={!teamSelected} data-final-participant={result.cmUmaId}
                className="min-w-0 rounded-lg border border-white/[0.06] bg-[#071426]/60 p-2.5">
                <legend className="sr-only">{version?.displayName ?? "Unknown Uma"}</legend>
                <div className="mb-2 flex min-w-0 items-center gap-2">
                  <div className="h-12 w-10 shrink-0 overflow-hidden"><UmaAvatarImage avatar={version?.avatar ?? ""} alt={version?.displayName ?? "Unknown Uma"} className="h-full w-full object-contain" /></div>
                  <span className="min-w-0 text-xs font-bold text-blue-100/80">{version?.displayName ?? "Unknown Uma"}</span>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {CM_FINAL_PLACEMENTS.map((placement) => {
                    const selected = result.placement === placement
                    const occupied = placement !== "fourth_or_lower" && results.some((other) => other.cmUmaId !== result.cmUmaId && other.placement === placement)
                    return (
                      <button key={placement} type="button" data-final-placement={placement} aria-pressed={selected}
                        disabled={!isCMFinalPlacementAllowed(cm.finalPlace, placement) || occupied}
                        onClick={() => setPlacement(result.cmUmaId, selected ? null : placement)}
                        className={`h-9 min-w-0 rounded-md border text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-30 ${selected
                          ? "border-violet-300/65 bg-violet-500/15 text-white" : "border-violet-400/25 bg-[#071426]/90 text-blue-100/65 hover:border-violet-300/45"}`}>
                        {CM_FINAL_PLACEMENT_LABELS[placement]}
                      </button>
                    )
                  })}
                </div>
              </fieldset>
            )
          })}
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-end md:gap-4">
        {(error || (teamSelected && completionErrors[0])) && <p role={error ? "alert" : "status"} className="text-xs font-semibold text-amber-300/75">{error || completionErrors[0]}</p>}
        <button type="button" onClick={onComplete} disabled={completionErrors.length > 0}
          className="h-10 w-full shrink-0 rounded-lg border border-emerald-400/35 bg-emerald-700/80 px-5 text-sm font-black text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.04] disabled:text-white/25 md:w-auto md:min-w-[150px]">
          Complete CM
        </button>
      </div>
    </section>
  )
}
