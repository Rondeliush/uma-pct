import { useState } from "react"
import { umaStyleClasses } from "../data/cmData"
import { useUmaDatabase } from "../context/UmaDatabaseContext"
import type { CM, CMUma } from "../types/types"
import type { Dispatch, SetStateAction } from "react"
import { calculateFinalQualificationFromAttempts } from "./CMCalculations"
import UmaAvatarImage from "../components/UmaAvatarImage"

type CMUmasProps = {
  cm: CM
  setCms: Dispatch<SetStateAction<CM[]>>
}
const umaStyleTextClasses = {
  Runaway: "text-rose-200",
  "Front Runner": "text-sky-200",
  "Pace Chaser": "text-emerald-200",
  "Late Surger": "text-orange-200",
  "End Closer": "text-violet-200",
}

function CMUmas({ cm, setCms }: CMUmasProps) {
  
  const { versions } = useUmaDatabase()

  const finalQualification =
  calculateFinalQualificationFromAttempts(cm.attempts)
  
  const qualifiedForFinal =
    finalQualification === "Final A" ||
    finalQualification === "Final B"

  const isEliminatedFinal =
  cm.phase === "eliminated"

  const isPendingFinal =
  !isEliminatedFinal &&
  finalQualification === "Not qualified yet"

  const showFinalOverlay =
    !qualifiedForFinal &&
    (isPendingFinal || isEliminatedFinal)

  const [isEditingFinalLineup, setIsEditingFinalLineup] =
    useState(false)

  const [draftFinalParticipantIds, setDraftFinalParticipantIds] =
    useState<string[]>([])
  
 const [previewPosition, setPreviewPosition] =
  useState<{
    cmUmaId: string
    left: number
    top: number
    width: number
    placement: "above" | "below"
  } | null>(null)

  const getSavedFinalParticipantIds = () =>
    cm.participants
      .filter((participant) => participant.finalParticipant)
      .map((participant) => participant.cmUmaId)

  const handleStartEdit = () => {
    setDraftFinalParticipantIds(
      getSavedFinalParticipantIds()
    )

    setIsEditingFinalLineup(true)
  }

  const handleCancelEdit = () => {
    setDraftFinalParticipantIds(
      getSavedFinalParticipantIds()
    )

    setIsEditingFinalLineup(false)
  }

  const handleToggleFinalParticipant = (
    cmUmaId: string
  ) => {
    setDraftFinalParticipantIds((current) => {
      const isSelected = current.includes(cmUmaId)

      if (isSelected) {
        return current.filter(
          (id) => id !== cmUmaId
        )
      }

      if (current.length >= 3) {
        return current
      }

      return [...current, cmUmaId]
    })
  }

  const handleSaveFinalLineup = () => {
  if (draftFinalParticipantIds.length !== 3) {
    return
  }

  setCms((current) =>
    current.map((item) => {
      if (item.number !== cm.number) {
        return item
      }

      const finalLineupNames =
        draftFinalParticipantIds.map(
          (cmUmaId) => {
            const participant =
              item.participants.find(
                (participant) =>
                  participant.cmUmaId === cmUmaId
              )

            const version = versions.find(
              (version) =>
                version.id === participant?.umaId
            )

            return (
              version?.displayName ??
              "Unknown Uma"
            )
          }
        )

      return {
        ...item,

        phase: "finalResult",

        participants:
          item.participants.map(
            (participant) => ({
              ...participant,

              finalParticipant:
                draftFinalParticipantIds.includes(
                  participant.cmUmaId
                ),

              won: false,
            })
          ),

        log: [
          ...(item.log ?? []),
          {
            id: `cm${item.number}-final-lineup-${Date.now()}`,
            timestamp: new Date().toISOString(),
            type: "finalLineupSet",
            message: "Final Lineup set.",
            details: finalLineupNames,
          },
        ],
      }
    })
  )

  setIsEditingFinalLineup(false)
}

  const getParticipantStats = (
    participant: CMUma
  ) => {
    let wins = 0
    let races = 0

    cm.attempts.forEach((attempt) => {
      const result = attempt.umaWins.find(
        (item) =>
          item.cmUmaId === participant.cmUmaId
      )

      if (!result) {
        return
      }

      wins += result.wins
      races += attempt.racesPlayed
    })

    // Final to dodatkowy wyścig dla 3 Final Participants.
    if (
      cm.finalPlace !== "" &&
      participant.finalParticipant
    ) {
      races += 1

      if (
        cm.finalPlace === "1st" &&
        participant.won
      ) {
        wins += 1
      }
    }

    const winRate =
      races > 0
        ? (wins / races) * 100
        : null

    return {
      wins,
      races,
      winRate,
    }
  }

  const visibleFinalParticipantIds =
    isEditingFinalLineup
      ? draftFinalParticipantIds
      : getSavedFinalParticipantIds()

  const finalParticipants =
    visibleFinalParticipantIds
      .map((cmUmaId) =>
        cm.participants.find(
          (participant) =>
            participant.cmUmaId === cmUmaId
        )
      )
      .filter(
        (participant): participant is CMUma =>
          participant !== undefined
      )

   const canSaveFinalLineup =
    draftFinalParticipantIds.length === 3

  const renderUmaTile = (
    cmUma: CMUma,
    location: "final" | "all"
  ) => {
    const umaVersion = versions.find(
      (item) => item.id === cmUma.umaId
    )

    if (!umaVersion) {
      return null
    }

    const stats = getParticipantStats(cmUma)

    const isSelected =
      draftFinalParticipantIds.includes(
        cmUma.cmUmaId
      )

    const selectionLocked =
      isEditingFinalLineup &&
      !isSelected &&
      draftFinalParticipantIds.length >= 3

    const isWinner = cmUma.won

    const winRateText =
      stats.winRate === null
        ? "— WR"
        : `${stats.winRate.toFixed(2)}% WR`

    return (
      <div
        key={`${location}-${cmUma.cmUmaId}`}
        
        className={`group relative pt-5 ${
          selectionLocked
            ? "cursor-not-allowed opacity-40"
            : isEditingFinalLineup
              ? "cursor-pointer"
              : ""
        }`}
        onMouseEnter={(event) => {
          if (isEditingFinalLineup) {
            return
          }

          const tileRect =
            event.currentTarget.getBoundingClientRect()

          const modalRect =
            event.currentTarget
              .closest(".cm-scrollbar")
              ?.getBoundingClientRect()

          const leftBoundary =
            (modalRect?.left ?? 0) + 12

          const rightBoundary =
            (modalRect?.right ?? window.innerWidth) - 12

          const availableWidth =
            rightBoundary - leftBoundary

          const previewWidth = Math.min(
            520,
            availableWidth
          )

          let left =
            tileRect.left +
            tileRect.width / 2 -
            previewWidth / 2

          left = Math.max(
            leftBoundary,
            Math.min(
              left,
              rightBoundary - previewWidth
            )
          )

          const spaceBelow =
            window.innerHeight - tileRect.bottom

          const placement =
            spaceBelow < 220
              ? "above"
              : "below"

          setPreviewPosition({
            cmUmaId: cmUma.cmUmaId,
            left,
            top:
              placement === "above"
                ? tileRect.top - 12
                : tileRect.bottom + 12,
            width: previewWidth,
            placement,
          })
        }}
        onMouseLeave={() => {
          setPreviewPosition(null)
        }}
        onClick={() => {
          if (
            !isEditingFinalLineup ||
            selectionLocked
          ) {
            return
          }

          handleToggleFinalParticipant(
            cmUma.cmUmaId
          )
        }}
      >

        {/* WINNER CROWN */}
            {isWinner && (
              <div className="pointer-events-none absolute left-1/2 top-0 z-20 -translate-x-1/2">
                <div className="absolute left-1/2 top-1/2 h-7 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#020611]/45 blur-[4px]" />

                <svg
                  viewBox="0 0 32 24"
                  className="relative h-5 w-7 text-yellow-300 drop-shadow-[0_0_6px_rgba(250,204,21,0.7)]"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M4 19h24l2-12-7 5-7-9-7 9-7-5 2 12Zm2 2h20v2H6v-2Z" />
                </svg>
              </div>
            )}

        {/* COMPACT UMA */}
        <div className="flex w-28 flex-col items-center">
          <div
            className={`relative flex h-22 w-22 items-center justify-center overflow-hidden rounded-[10px] border ${umaStyleClasses[cmUma.style]} transition ${
              isWinner
                ? "ring-1 ring-yellow-300/80 shadow-[0_0_12px_rgba(250,204,21,0.16)]"
                : isEditingFinalLineup && isSelected
                  ? "ring-1 ring-cyan-300/80 shadow-[0_0_12px_rgba(34,211,238,0.14)]"
                  : ""
            }`}
          >
           {umaVersion.avatar ? (
              <UmaAvatarImage
                avatar={umaVersion.avatar}
                alt={umaVersion.displayName}
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gray-900/70 text-3xl text-gray-500">
                ?
              </div>
            )}

            {/* EDIT CHECK */}
            {isEditingFinalLineup &&
              isSelected && (
               <div className="absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-cyan-200/40 bg-cyan-500/90 text-[11px] font-black text-white shadow-[0_0_8px_rgba(34,211,238,0.35)]">
                  ✓
                </div>
              )}
          </div>

          <div className="mt-2 whitespace-nowrap rounded-md border border-white/[0.06] bg-white/[0.025] px-2 py-1 text-xs font-black text-blue-100/75">
            {winRateText}
          </div>

        </div>

        {/* EXPANDED CARD */}
        {!isEditingFinalLineup &&
          previewPosition?.cmUmaId ===
            cmUma.cmUmaId && (
            <div
              className="fixed z-300"
              style={{
              left: previewPosition.left,
              top: previewPosition.top,
              width: previewPosition.width,
              transform:
                previewPosition.placement === "above"
                  ? "translateY(-100%)"
                  : undefined,
            }}
            >

          <div
              className={`relative overflow-hidden rounded-xl border border-white/10 shadow-[0_20px_55px_rgba(0,0,0,0.65)] backdrop-blur-xl ${umaStyleClasses[cmUma.style]}`}
            >
            {/* TOP ACCENT */}
            <div
              className={`absolute inset-x-0 top-0 h-[2px] ${
                isWinner
                  ? "bg-gradient-to-r from-transparent via-yellow-300/80 to-transparent"
                  : "bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent"
              }`}
            />

            <div className="flex gap-4 p-4">
              {/* AVATAR */}
              <div
                className={`relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[10px] border bg-[#050d1b] ${
                  isWinner
                    ? "border-yellow-300/40 shadow-[0_0_14px_rgba(250,204,21,0.12)]"
                    : "border-cyan-300/15"
                }`}
              >
                {umaVersion.avatar ? (
                  <UmaAvatarImage
                    avatar={umaVersion.avatar}
                    alt={umaVersion.displayName}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-3xl font-black text-blue-100/15">
                    ?
                  </div>
                )}

                {isWinner && (
                  <div className="pointer-events-none absolute left-1.5 top-1.5">
                    <svg
                      viewBox="0 0 32 24"
                      className="h-4 w-5 text-yellow-300 drop-shadow-[0_0_5px_rgba(250,204,21,0.65)]"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M4 19h24l2-12-7 5-7-9-7 9-7-5 2 12Zm2 2h20v2H6v-2Z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* INFO */}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-lg font-black leading-tight text-white">
                      {umaVersion.displayName}
                    </div>

                    <div
                    className={`mt-0.5 text-xs font-bold ${umaStyleTextClasses[cmUma.style]}`}
                  >
                    {cmUma.style}
                  </div>
                  </div>

                  {isWinner && (
                    <div className="shrink-0 rounded-md border border-yellow-300/15 bg-yellow-300/[0.04] px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-yellow-200/70">
                      Winner
                    </div>
                  )}
                </div>

                {/* TAGS */}
                {(cmUma.ace || cmUma.debuffer || cmUma.autoRun) && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {cmUma.ace && (
                  <span className="rounded-md border border-sky-300/35 bg-sky-300/[0.10] px-2 py-1 text-[10px] font-bold text-sky-100">
                    Ace
                  </span>
                )}

                {cmUma.debuffer && (
                  <span className="rounded-md border border-red-300/35 bg-red-400/[0.10] px-2 py-1 text-[10px] font-bold text-red-100">
                    Debuffer
                  </span>
                )}

                {cmUma.autoRun && (
                  <span className="rounded-md border border-violet-300/35 bg-violet-300/[0.10] px-2 py-1 text-[10px] font-bold text-violet-100">
                    AutoRun
                  </span>
                )}
                  </div>
                )}
              </div>
            </div>

            {/* STATS */}
            <div className="grid grid-cols-3 border-t border-white/[0.07]">
              <div className="px-3 py-2.5 text-center">
                <div className="text-[9px] font-black uppercase tracking-[0.12em] text-blue-100/30">
                  Wins
                </div>

                <div className="mt-0.5 text-sm font-black text-white">
                  {stats.wins}
                </div>
              </div>

              <div className="border-x border-white/[0.07] px-3 py-2.5 text-center">
                <div className="text-[9px] font-black uppercase tracking-[0.12em] text-blue-100/30">
                  Races
                </div>

                <div className="mt-0.5 text-sm font-black text-white">
                  {stats.races}
                </div>
              </div>

              <div className="px-3 py-2.5 text-center">
                <div className="text-[9px] font-black uppercase tracking-[0.12em] text-blue-100/30">
                  Win Rate
                </div>

                <div className="mt-0.5 text-sm font-black text-cyan-100">
                  {stats.winRate === null
                    ? "—"
                    : `${stats.winRate.toFixed(2)}%`}
                </div>
              </div>
            </div>
          </div>

          </div>
        )}

      </div>
    )
  }

  return (
  <div className="px-5 py-5">

          {/* FINAL LINEUP */}
          <div className="mx-auto max-w-[760px]">

              <div className="relative mb-4 flex min-h-10 items-center justify-between border-b border-white/[0.07] pb-3">
        <div>


          <div className="mt-0.5 text-lg font-black text-white">
            Final Lineup
          </div>
        </div>

        {qualifiedForFinal && isEditingFinalLineup && (
          <div className="flex items-center gap-2">
            <div className="mr-1 text-xs font-bold text-blue-100/45">
              {draftFinalParticipantIds.length}/3 selected
            </div>

            <button
              type="button"
              onClick={handleCancelEdit}
              className="h-9 rounded-lg border border-white/10 bg-white/[0.02] px-4 text-xs font-bold text-blue-100/55 transition hover:border-white/20 hover:text-white"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSaveFinalLineup}
              disabled={!canSaveFinalLineup}
              className="h-9 rounded-lg border border-cyan-400/35 bg-cyan-400/[0.06] px-4 text-xs font-black text-cyan-200 transition hover:border-cyan-300/60 hover:bg-cyan-400/[0.1] disabled:cursor-not-allowed disabled:border-white/[0.06] disabled:bg-transparent disabled:text-white/20"
            >
              Save Lineup
            </button>
          </div>
        )}
      </div>
  
        {cm.phase === "finalLineup" && !isEditingFinalLineup && (
            <div className="mb-4 flex items-center justify-between gap-5 border-l-2 border-violet-400/45 bg-gradient-to-r from-violet-400/[0.05] via-blue-400/[0.018] to-transparent px-4 py-3">
              <div>
                <div className="text-[9px] font-black uppercase tracking-[0.18em] text-violet-200/45">
                  Action Required
                </div>

                <div className="mt-0.5 text-sm font-black text-white">
                  Select your Final Lineup
                </div>

                <div className="mt-0.5 text-[11px] font-medium text-blue-100/40">
                  Choose 3 Umas that will participate in the Final.
                </div>
              </div>

              <button
                type="button"
                onClick={handleStartEdit}
                className="h-9 shrink-0 rounded-lg border border-violet-400/35 bg-violet-400/[0.07] px-5 text-xs font-black text-violet-200 transition hover:border-violet-300/60 hover:bg-violet-400/[0.12]"
              >
                Set Lineup
              </button>
            </div>
          )}
        <div className="relative">
        {/* FINAL SLOTS */}
        <div
        className={`flex min-h-36 items-start justify-center gap-8 transition ${
          showFinalOverlay
            ? "opacity-25"
            : "opacity-100"
        }`}
      >
          {[0, 1, 2].map((index) => {
            const participant =
              finalParticipants[index]

            if (!participant) {
              return (
                <div
                  key={index}
                  className="mt-5 flex h-22 w-22 items-center justify-center rounded-xl border border-dashed border-cyan-300/15 bg-cyan-300/[0.015] text-2xl font-black text-cyan-100/15"
                >
                  ?
                </div>
              )
            }

            return renderUmaTile(
              participant,
              "final"
            )
          })}
        </div>

        {/* WAITING / ELIMINATED BAR */}
         {showFinalOverlay && (
            <div className="absolute inset-0 flex -translate-y-2 items-center justify-center">
              <div
                className={`flex h-10 w-[460px] max-w-[90%] items-center justify-center gap-2.5 border-y text-xs font-black uppercase tracking-[0.08em] backdrop-blur-[3px] ${
                  isPendingFinal
                    ? "border-cyan-300/15 bg-[#061426]/75 text-blue-100/65"
                    : "border-red-500/20 bg-red-950/45 text-red-200/75"
                }`}
              >
                {isPendingFinal ? (
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
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
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path d="m8 8 8 8" />
                  </svg>
                )}

                <span>
                  {isPendingFinal
                    ? "Waiting for Final Qualification"
                    : "Eliminated"}
                </span>
              </div>
            </div>
          )}

      </div>

      </div>

      {/* ALL PARTICIPANTS */}
      <div className="mx-auto mt-6 max-w-4xl border-t border-white/[0.07] pt-4">

        <div className="mx-auto mb-4 max-w-[760px]">
          <div className="text-lg font-black text-white">
            All Participants
          </div>

          {isEditingFinalLineup && (
            <>
              <div className="mt-1 text-xs font-medium text-blue-100/45">
                Select 3 Umas for the Final
              </div>

              <div className="mt-2 inline-flex items-center rounded-md border border-amber-400/10 bg-amber-400/[0.025] px-2.5 py-1 text-[10px] font-semibold text-amber-200/55">
                Changes are locked after saving the Final Lineup.
              </div>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-start justify-center gap-x-7 gap-y-5">
          {cm.participants.map(
            (participant) =>
              renderUmaTile(
                participant,
                "all"
              )
          )}
        </div>

      </div>

    </div>
  )
}

export default CMUmas