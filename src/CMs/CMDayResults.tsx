import { useState } from "react"
import type {
  Dispatch,
  SetStateAction,
} from "react"

import type { CM } from "../types/types"
import CMAttemptRow from "./CMAttemptRow"

type AttemptNumber = 1 | 2 | 3 | 4
type DayNumber = 1 | 2 | 3 | 4

type CMDayResultsProps = {
  cm: CM
  day: DayNumber
  setCms: Dispatch<SetStateAction<CM[]>>
}

function CMDayResults({
  cm,
  day,
  setCms,
}: CMDayResultsProps) {
  const [activeAttempt, setActiveAttempt] =
    useState<AttemptNumber>(1)

  const attemptNumbers: AttemptNumber[] = [
    1,
    2,
    3,
    4,
  ]

  const isAttemptSaved = (
    attemptNumber: AttemptNumber
  ) => {
    return (cm.attempts ?? []).some(
      (attempt) =>
        attempt.day === day &&
        attempt.attempt === attemptNumber
    )
  }

  return (
  <div className="mt-2 min-w-0">
    {/* ATTEMPT TABS */}
    <div className="grid min-w-0 grid-cols-4 border-b border-white/[0.08]">
      {attemptNumbers.map((attemptNumber) => {
        const isActive = activeAttempt === attemptNumber
        const isSaved = isAttemptSaved(attemptNumber)

        return (
          <button
            key={attemptNumber}
            type="button"
            onClick={() => setActiveAttempt(attemptNumber)}
            className={`relative flex h-9 min-w-0 items-center justify-center gap-1 px-1 text-[11px] font-bold transition ${
              isActive
                ? "text-white"
                : isSaved
                   ? "text-blue-100/65 hover:text-white"
                   : "text-blue-100/35 hover:text-blue-100/70"
            }`}
          >
            <span className="truncate">
              Attempt {attemptNumber}
            </span>

            {isSaved && (
              <span className="shrink-0 text-emerald-400">
                ✓
              </span>
            )}

            {isActive && (
              <div className="absolute inset-x-2 bottom-0 h-[2px] bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.35)]" />
            )}
          </button>
        )
      })}
    </div>

    {/* ACTIVE ATTEMPT */}
    <div className="pt-2">
      <CMAttemptRow
        key={`${day}-${activeAttempt}`}
        cm={cm}
        day={day}
        attemptNumber={activeAttempt}
        setCms={setCms}
      />
    </div>
  </div>
)
}

export default CMDayResults