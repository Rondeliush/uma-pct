import { useState } from "react"
import {calculateFinalQualificationFromAttempts, calculateRound2GroupFromAttempts,} from "./CMCalculations"
import type {
  Dispatch,
  SetStateAction,
} from "react"

import type { CM, CMAttempt } from "../types/types"
import { useUmaDatabase } from "../context/UmaDatabaseContext"

type CMAttemptRowProps = {
  cm: CM
  day: 1 | 2 | 3 | 4
  attemptNumber: 1 | 2 | 3 | 4
  setCms: Dispatch<SetStateAction<CM[]>>
}

function CMAttemptRow({
  cm,
  day,
  attemptNumber,
  setCms,
}: CMAttemptRowProps) {
  const { versions } = useUmaDatabase()

  const participants = cm.participants ?? []
  const attempts = cm.attempts ?? []

  const attemptsLocked =
  cm.phase !== "attempts"

  const existingAttempt = attempts.find(
    (attempt) =>
      attempt.day === day &&
      attempt.attempt === attemptNumber
  )
  const [isEditing, setIsEditing] = useState(
  !existingAttempt && !attemptsLocked
  )

  const [isRetired, setIsRetired] = useState(
  existingAttempt?.retired ?? false
)

  const [racesPlayedInput, setRacesPlayedInput] =
    useState(
      existingAttempt?.retired
        ? String(existingAttempt.racesPlayed ?? "")
        : "5"
    ) 

  // Jeśli attempt już istnieje, używamy jego historycznego składu.
  // Jeśli jest nowy, używamy aktualnego lineupu.
  const participantIds =
    existingAttempt?.umaWins.map(
      (result) => result.cmUmaId
    ) ??
    cm.currentLineup ??
    []

  const getParticipantName = (cmUmaId: string) => {
    const participant = participants.find(
      (item) => item.cmUmaId === cmUmaId
    )

    if (!participant) {
      return "Unknown Uma"
    }

    const version = versions.find(
      (item) => item.id === participant.umaId
    )

    return version?.displayName ?? "Unknown Uma"
  }

  const [winInputs, setWinInputs] = useState<string[]>(
    participantIds.map((cmUmaId) => {
      const savedResult =
        existingAttempt?.umaWins.find(
          (result) =>
            result.cmUmaId === cmUmaId
        )

      return savedResult
        ? String(savedResult.wins)
        : ""
    })
  )

  const numericWins = winInputs.map((value) =>
    value === "" ? 0 : Number(value)
  )

  const totalWins = numericWins.reduce(
    (total, wins) => total + wins,
    0
  )

  const allFieldsFilled =
    winInputs.length === 3 &&
    winInputs.every((value) => value !== "")

  const validRacesPlayed =
  !isRetired ||
  ["0", "1", "2", "3", "4"].includes(
    racesPlayedInput
  )

const racesPlayed = isRetired
  ? Number(racesPlayedInput)
  : 5

const noRacesPlayed =
  isRetired &&
  validRacesPlayed &&
  racesPlayed === 0

const validValues =
  validRacesPlayed &&
  numericWins.every(
    (wins) =>
      Number.isInteger(wins) &&
      wins >= 0 &&
      wins <= racesPlayed
  )

const validTotal =
  validRacesPlayed &&
  totalWins <= racesPlayed

const canSave =
  !attemptsLocked &&
  allFieldsFilled &&
  validRacesPlayed &&
  validValues &&
  validTotal

  const handleSave = () => {
  if (!canSave) {
    return
  }

  const newAttempt: CMAttempt = {
  day,
  attempt: attemptNumber,

  racesPlayed,
  retired: isRetired,

  umaWins: participantIds.map(
    (cmUmaId, index) => ({
      cmUmaId,
      wins: numericWins[index],
    })
  ),
}

  setCms((current) =>
    current.map((item) => {
      if (item.number !== cm.number) {
        return item
      }

      const otherAttempts =
        item.attempts.filter(
          (attempt) =>
            !(
              attempt.day === day &&
              attempt.attempt === attemptNumber
            )
        )

      const previousAttempt =
      item.attempts.find(
        (attempt) =>
          attempt.day === day &&
          attempt.attempt === attemptNumber
      )

      const isNewAttempt = !previousAttempt

      const updatedAttempts = [
        ...otherAttempts,
        newAttempt,
      ].sort(
        (a, b) =>
          a.day - b.day ||
          a.attempt - b.attempt
      )

      const previousRound2Group =
  calculateRound2GroupFromAttempts(
    item.attempts
  )

const updatedRound2Group =
  calculateRound2GroupFromAttempts(
    updatedAttempts
  )

const previousFinalQualification =
  calculateFinalQualificationFromAttempts(
    item.attempts
  )

const finalQualification =
  calculateFinalQualificationFromAttempts(
    updatedAttempts
  )

const qualifiedForFinal =
  finalQualification === "Final A" ||
  finalQualification === "Final B"

const updatedLog = [...(item.log ?? [])]

if (isNewAttempt) {
  const attemptDetails: string[] = []

  if (racesPlayed === 0) {
    attemptDetails.push("No races played.")
  } else {
    attemptDetails.push(
      `${totalWins} ${
        totalWins === 1 ? "Win" : "Wins"
      } / ${racesPlayed} ${
        racesPlayed === 1 ? "Race" : "Races"
      }`
    )
  }

  if (isRetired) {
    attemptDetails.push("Retired.")
  }

  updatedLog.push({
    id: `cm${item.number}-day${day}-attempt${attemptNumber}-${Date.now()}`,
    timestamp: new Date().toISOString(),
    type: "attemptAdded",
    message: `Day ${day} · Attempt ${attemptNumber} saved.`,
    details: attemptDetails,
  })
} else if (previousAttempt) {
  const editDetails: string[] = []

  const previousTotalWins =
    previousAttempt.umaWins.reduce(
      (total, result) =>
        total + result.wins,
      0
    )

  if (previousTotalWins !== totalWins) {
    editDetails.push(
      `Total Wins: ${previousTotalWins} → ${totalWins}`
    )
  }

  if (
    previousAttempt.racesPlayed !==
    racesPlayed
  ) {
    editDetails.push(
      `Races Played: ${previousAttempt.racesPlayed} → ${racesPlayed}`
    )
  }

  if (
    previousAttempt.retired !== isRetired
  ) {
    editDetails.push(
      `Retired: ${
        previousAttempt.retired ? "Yes" : "No"
      } → ${isRetired ? "Yes" : "No"}`
    )
  }

  newAttempt.umaWins.forEach(
    (newResult) => {
      const oldResult =
        previousAttempt.umaWins.find(
          (result) =>
            result.cmUmaId ===
            newResult.cmUmaId
        )

      if (
        !oldResult ||
        oldResult.wins === newResult.wins
      ) {
        return
      }

      editDetails.push(
        `${getParticipantName(
          newResult.cmUmaId
        )}: ${oldResult.wins} ${
          oldResult.wins === 1
            ? "Win"
            : "Wins"
        } → ${newResult.wins} ${
          newResult.wins === 1
            ? "Win"
            : "Wins"
        }`
      )
    }
  )

  if (editDetails.length > 0) {
    updatedLog.push({
      id: `cm${item.number}-day${day}-attempt${attemptNumber}-edit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: "attemptEdited",
      message: `Day ${day} · Attempt ${attemptNumber} edited.`,
      details: editDetails,
    })
  }
}

if (
  previousRound2Group !== updatedRound2Group
) {
  updatedLog.push({
    id: `cm${item.number}-qualification-round2-${Date.now()}`,
    timestamp: new Date().toISOString(),
    type: "qualificationUpdated",
    message: "Round 2 Group updated.",
    details: [
      `Group ${previousRound2Group} → Group ${updatedRound2Group}`,
    ],
  })
}

if (
  previousFinalQualification !==
  finalQualification
) {
  updatedLog.push({
    id: `cm${item.number}-qualification-final-${Date.now()}`,
    timestamp: new Date().toISOString(),
    type: "qualificationUpdated",
    message: "Final qualification updated.",
    details: [
      `${previousFinalQualification} → ${finalQualification}`,
    ],
  })
}

return {
  ...item,

        attempts: updatedAttempts,

        log: updatedLog,

        finalPlace: qualifiedForFinal
          ? item.finalPlace
          : "",

        participants: qualifiedForFinal
          ? item.participants
          : item.participants.map(
              (participant) => ({
                ...participant,
                finalParticipant: false,
                won: false,
              })
            ),
      }
    })
  )

  setIsEditing(false)
}

const isRound2 = day === 3 || day === 4

  return (
  <div className="min-w-0 bg-white/[0.015] px-3 py-3">
    {/* HEADER */}
    <div className="mb-2.5 flex items-center justify-between">
      <div
        className={`text-xs font-black ${
          isRound2 ? "text-violet-200" : "text-cyan-200"
        }`}
      >
        Attempt {attemptNumber}
      </div>

      {existingAttempt && !isEditing && !attemptsLocked && (
        <div className="text-[9px] font-black uppercase tracking-[0.14em] text-emerald-300/50">
          Saved
        </div>
      )}
    </div>

    {/* UMA RESULTS */}
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_72px] gap-x-3 gap-y-2">
      {participantIds.map((cmUmaId, index) => (
        <div key={cmUmaId} className="contents">
          <div className="flex min-w-0 items-center">
            <span className="truncate text-xs font-medium text-blue-100/75">
              {getParticipantName(cmUmaId)}
            </span>
          </div>

          {noRacesPlayed ? (
            <div className="flex h-8 items-center justify-center rounded-md border border-white/[0.08] bg-black/10 text-xs font-bold text-blue-100/25">
              —
            </div>
          ) : (
            <input
              type="number"
              min="0"
              max={racesPlayed}
              value={winInputs[index] ?? ""}
              disabled={!isEditing || attemptsLocked}
              onChange={(e) => {
                const value = e.target.value

                setWinInputs((current) =>
                  current.map((item, i) =>
                    i === index ? value : item
                  )
                )
              }}
              className={`h-8 w-full appearance-none rounded-md border bg-[#050d1b]/70 px-2 text-center text-xs font-bold text-white outline-none transition [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none ${
                isRound2
                  ? "border-violet-400/20 focus:border-violet-300/55"
                  : "border-sky-400/20 focus:border-cyan-300/55"
              } disabled:cursor-default disabled:border-white/[0.06] disabled:bg-white/[0.02] disabled:text-blue-100/40`}
            />
          )}
        </div>
      ))}
    </div>

    {/* RETIRED */}
    <div className="mt-3 flex min-h-9 items-center gap-4 border-t border-white/[0.07] pt-2.5">
      <label className="flex items-center gap-2 text-xs font-bold text-blue-100/65">
        <input
          type="checkbox"
          checked={isRetired}
          disabled={!isEditing || attemptsLocked}
          onChange={(event) => {
            const checked = event.target.checked

            setIsRetired(checked)

            if (checked) {
              setRacesPlayedInput("")
            } else {
              setRacesPlayedInput("5")
            }
          }}
          className="accent-cyan-400"
        />

        Retired
      </label>

      {isRetired && (
        <label className="flex items-center gap-2 text-xs text-blue-100/55">
          Races Played

          <select
            value={racesPlayedInput}
            disabled={!isEditing || attemptsLocked}
            onChange={(event) => {
              const value = event.target.value

              setRacesPlayedInput(value)

              if (value === "0") {
                setWinInputs(["0", "0", "0"])
              } else if (racesPlayedInput === "0") {
                setWinInputs(["", "", ""])
              }
            }}
            className="h-8 rounded-md border border-white/[0.1] bg-[#050d1b]/80 px-2 text-xs font-bold text-white outline-none focus:border-cyan-300/50 disabled:cursor-default disabled:text-blue-100/35"
          >
            <option value="">Select</option>
            <option value="0">0</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
          </select>
        </label>
      )}
    </div>

    {/* FOOTER */}
    <div className="mt-2.5 flex min-h-8 items-center justify-between border-t border-white/[0.07] pt-2.5">
      <div>
        {noRacesPlayed ? (
          <span className="text-xs font-semibold text-blue-100/40">
            No races played
          </span>
        ) : (
          <div className="flex items-baseline gap-1.5">
            <span className="text-[11px] font-medium text-blue-100/40">
              Total wins
            </span>

            <span
              className={`text-sm font-black ${
                validRacesPlayed && totalWins > racesPlayed
                  ? "text-red-400"
                  : "text-white"
              }`}
            >
              {totalWins}/{racesPlayed}
            </span>
          </div>
        )}
      </div>

      {attemptsLocked ? (
      <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-100/30">
          <svg
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="5" y="10" width="14" height="10" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
          </svg>

          Locked
        </div>
      ) : isEditing ? (
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className={`h-8 rounded-md border px-3 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-30 ${
            isRound2
              ? "border-violet-400/35 text-violet-200 hover:bg-violet-500/10"
              : "border-cyan-400/35 text-cyan-200 hover:bg-cyan-500/10"
          }`}
        >
          Save
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="h-8 rounded-md border border-white/[0.1] px-3 text-xs font-bold text-blue-100/55 transition hover:border-white/20 hover:text-white"
        >
          Edit
        </button>
      )}
    </div>

    {validRacesPlayed && totalWins > racesPlayed && (
      <div className="mt-2 text-[11px] font-medium text-red-400">
        Total wins cannot exceed the number of races played.
      </div>
    )}
  </div>
)
}

export default CMAttemptRow