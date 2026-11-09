import { useState } from "react"
import type { Dispatch, SetStateAction } from "react"
import { useUmaDatabase } from "../context/UmaDatabaseContext"
import type { CM, CMParticipantConfiguration, CMUma } from "../types/types"

import { calculateFinalQualificationFromAttempts } from "./CMCalculations"
import UmaAvatarImage from "../components/UmaAvatarImage"
import { snapshotParticipantConfiguration } from "./cmParticipantConfiguration"
import { getCMUmaOverallStats, getHistoricalParticipantEntries, getParticipantConfigurationKey } from "./cmParticipantPresentation"
import type { HistoricalParticipantEntry } from "./cmParticipantPresentation"
import { getFinalLineupCandidates, isFinalLineupCandidateLocked, saveFinalLineupCandidates, toggleFinalLineupCandidate } from "./cmFinalLineupCandidates"
import type { FinalLineupCandidate } from "./cmFinalLineupCandidates"
import { getRunningStyleVisual } from "./runningStyleVisuals"
import EventUmaCard from "../components/EventUmaCard"
import CMFinalPlacementBadge from "./CMFinalPlacementBadge"
import EditCMModal from "./EditCMModal"
import "./ParticipantConfiguration.css"

type CMUmasProps = {
  cm: CM
  setCms: Dispatch<SetStateAction<CM[]>>
}

function CMUmas({ cm, setCms }: CMUmasProps) {

  const { versions } = useUmaDatabase()
  const historicalParticipants = getHistoricalParticipantEntries(cm)
  const overallStatsByVersion = getCMUmaOverallStats(cm)
  const isFinalRegistration = cm.phase === "finalLineup"
  const [isEditCMOpen, setIsEditCMOpen] = useState(false)

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

  const [draftFinalCandidates, setDraftFinalCandidates] = useState<FinalLineupCandidate[]>([])
  const finalLineupCandidates = getFinalLineupCandidates(cm, versions, draftFinalCandidates)

  const [previewPosition, setPreviewPosition] = useState<{
    tileKey: string
    left: number
    top: number
    width: number
    placement: "above" | "below"
  } | null>(null)

  const getSavedFinalParticipantIds = () => cm.finalResults?.map(result => result.cmUmaId)
    ?? cm.participants.filter(participant => participant.finalParticipant).map(participant => participant.cmUmaId)

  const handleStartEdit = () => {
    if (!isFinalRegistration) return
    const saved = cm.finalResults?.map(result => result.configuration)
      ?? cm.participants.filter(participant => participant.finalParticipant).map(participant => snapshotParticipantConfiguration(participant))
    setDraftFinalCandidates(finalLineupCandidates.filter(candidate => saved.some(configuration => getParticipantConfigurationKey(configuration) === candidate.key)))
    setIsEditingFinalLineup(true)
  }

  const handleCancelEdit = () => {
    setDraftFinalCandidates([])
    setIsEditingFinalLineup(false)
  }

  const handleToggleFinalParticipant = (candidate: FinalLineupCandidate) => {
    if (!isFinalRegistration || !isEditingFinalLineup) return
    setDraftFinalCandidates(current => toggleFinalLineupCandidate(current, candidate))
  }

  const handleSaveFinalLineup = () => {
    if (!isFinalRegistration || draftFinalCandidates.length !== 3) return
    const timestamp = new Date().toISOString()
    const logId = 'cm' + cm.number + '-final-lineup-' + Date.now()
    setCms(current => current.map(item => item.number === cm.number && item.phase === "finalLineup"
      ? saveFinalLineupCandidates(item, draftFinalCandidates, versions, { timestamp, logId }) : item))
    setIsEditingFinalLineup(false)
  }

  const getFinalConfigurationStats = (configuration: CMParticipantConfiguration) => {
    const key = getParticipantConfigurationKey(configuration)
    const entry = historicalParticipants.find(participant => participant.key === key)
    return { wins: entry?.wins ?? 0, races: entry?.races ?? 0, winRate: entry?.winRate ?? 0 }
  }

  const finalParticipants = getSavedFinalParticipantIds().flatMap(id => {
    const participant = cm.participants.find(uma => uma.cmUmaId === id)
    return participant ? [participant] : []
  })
  const canSaveFinalLineup = draftFinalCandidates.length === 3

  const renderUmaTile = (
    cmUma: CMUma | undefined,
    location: "final" | "selection" | "historical",
    entry?: HistoricalParticipantEntry,
    candidate?: FinalLineupCandidate
  ) => {
    const savedFinal = location === "final" && !isFinalRegistration ? cm.finalResults?.find((result) => result.cmUmaId === cmUma?.cmUmaId) : undefined
    const configuration = entry?.configuration ?? savedFinal?.configuration ?? snapshotParticipantConfiguration(cmUma)
    const styleVisual = getRunningStyleVisual(configuration.runningStyle)
    const umaVersion = versions.find(
      (item) => item.id === configuration.umaVersionId
    )

    if (!umaVersion && !entry && !isFinalRegistration) {
      return null
    }

    const name = umaVersion?.displayName ?? "Unavailable Uma"
    const stats = entry ?? (cmUma ? getFinalConfigurationStats(configuration) : null)
    if (!stats) return null
    const tileKey = `${location}-${entry?.key ?? cmUma?.cmUmaId}`
    const isSelectable = isFinalRegistration && isEditingFinalLineup && candidate !== undefined
    const isSelected = candidate !== undefined && draftFinalCandidates.some(selected => selected.key === candidate.key)
    const selectionLocked = isSelectable && isFinalLineupCandidateLocked(candidate, draftFinalCandidates)

    const isWinner = entry ? entry.finalWins > 0 : savedFinal?.won ?? cmUma?.won ?? false
    const provenance = entry?.hasInferredConfiguration ? entry.hasRecordedConfiguration
      ? "Includes configurations inferred from the saved historical participant."
      : "Configuration inferred from the saved historical participant." : undefined
    const hasRoleBadges = configuration.ace === true || configuration.debuffer === true || configuration.entrySource === "autorun"

    const winRateText =
      stats.winRate === null
        ? "— WR"
        : `${stats.winRate.toFixed(2)}% WR`
    const overallStats = configuration.umaVersionId === null ? undefined : overallStatsByVersion.get(configuration.umaVersionId)
    const overallHeading = location !== "selection" && configuration.umaVersionId !== null
      ? `Overall Stats in CM${cm.number}:`
      : undefined

    return (
      <div
        key={tileKey}
        style={styleVisual.style}
        data-participant-configuration={entry?.key}
        data-final-candidate-key={candidate?.key}
        data-running-style={configuration.runningStyle ?? "unknown"}
        data-version-id={configuration.umaVersionId ?? ""}
        data-participant-races={stats.races}
        data-participant-wins={stats.wins}
        data-participant-win-rate={stats.winRate ?? ""}
        className={`cm-participant-tile group relative pt-5 ${entry ? "cm-historical-participant" : ""} ${location === "final" ? "w-28 min-w-0" : location === "historical" ? "w-[calc((100%_-_1.5rem)/3)] min-w-0 sm:w-auto" : ""} ${
          selectionLocked
            ? "cursor-not-allowed opacity-40"
            : isSelectable
              ? "cursor-pointer"
              : ""
        }`}
        role={isSelectable ? "button" : undefined}
        tabIndex={isSelectable ? 0 : undefined}
        aria-label={isSelectable ? `Select ${name} [${styleVisual.abbreviation || styleVisual.label}] for the final` : name}
        aria-pressed={isSelectable ? isSelected : undefined}
        aria-disabled={isSelectable ? selectionLocked : undefined}
        onKeyDown={(event) => {
          if (isSelectable && candidate && !selectionLocked && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault()
            handleToggleFinalParticipant(candidate)
          }
        }}
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
            tileKey,
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
            !isSelectable || !candidate ||
            selectionLocked
          ) {
            return
          }

          handleToggleFinalParticipant(
            candidate
          )
        }}
      >

        <CMFinalPlacementBadge placement={savedFinal?.placement} location="lineup" />

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
        <EventUmaCard
          configuration={configuration}
          version={umaVersion}
          name={name}
          primaryStat={winRateText}
          showRunningStyle={candidate !== undefined}
          portraitClassName={isWinner ? "ring-1 ring-yellow-300/80 shadow-[0_0_12px_rgba(250,204,21,0.16)]" : isEditingFinalLineup && isSelected ? "ring-1 ring-cyan-300/80 shadow-[0_0_12px_rgba(34,211,238,0.14)]" : ""}
          portraitDecoration={isSelectable && isSelected && <span className="absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-cyan-200/40 bg-cyan-500/90 text-[11px] font-black text-white shadow-[0_0_8px_rgba(34,211,238,0.35)]" aria-hidden="true">✓</span>}
          accessibleSummary={<>{name}. {styleVisual.label}. Races: {stats.races}. Wins: {stats.wins}.
            {configuration.ace === true ? " Ace." : ""}
            {configuration.debuffer === true ? " Debuffer." : ""}
            {configuration.entrySource === "autorun" ? " AutoRun." : ""}
            {configuration.entrySource === "manual" ? " Manual entry." : configuration.entrySource === null ? " Entry source unavailable." : ""}</>}
        />

        {/* EXPANDED CARD */}
        {!isEditingFinalLineup && previewPosition?.tileKey ===
            tileKey && (
            <div
              className="cm-participant-preview fixed z-300"
              ref={(element) => {
                if (!element) return
                const bounds = element.getBoundingClientRect()
                const top = Math.max(12, Math.min(bounds.top, window.innerHeight - bounds.height - 12))
                if (top !== bounds.top) {
                  element.style.top = `${top}px`
                  element.style.transform = "none"
                }
              }}
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
              className={`relative overflow-hidden rounded-xl border ${styleVisual.surfaceClassName} shadow-[0_20px_55px_rgba(0,0,0,0.65)] backdrop-blur-xl`}
            >
            {/* TOP ACCENT */}
            <div className="absolute inset-x-0 top-0 h-[2px]"
              style={{ backgroundImage: "linear-gradient(to right, transparent, color-mix(in srgb, var(--participant-style-color) 50%, transparent), transparent)" }} />

            <div className="flex gap-4 p-4">
              {/* AVATAR */}
              <div
                style={{ background: "#050D1B" }}
                className={`relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[10px] border ${styleVisual.surfaceClassName} ${
                  isWinner
                    ? "border-yellow-300/40 shadow-[0_0_14px_rgba(250,204,21,0.12)]"
                    : ""
                }`}
              >
                {umaVersion?.avatar ? (
                  <UmaAvatarImage
                    avatar={umaVersion.avatar}
                    alt={name}
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
                    <div className="text-lg font-black leading-tight text-white [overflow-wrap:anywhere]">
                      {name}
                    </div>

                    <div className="mt-0.5 text-xs font-bold"
                      style={{ color: "var(--participant-style-color)" }} data-participant-preview-style>
                      {styleVisual.label}
                    </div>
                  </div>

                  {isWinner && (
                    <div className="shrink-0 rounded-md border border-yellow-300/15 bg-yellow-300/[0.04] px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-yellow-200/70">
                      Winner
                    </div>
                  )}
                </div>

                {/* TAGS */}
                {(hasRoleBadges || overallHeading !== undefined) && <div className="mt-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
                {hasRoleBadges && (
                  <div className="flex flex-wrap gap-1.5" title={provenance}>
                    {configuration.ace === true && (
                  <span className="rounded-md border border-sky-300/35 bg-sky-300/[0.10] px-2 py-1 text-[10px] font-bold text-sky-100" data-configuration-badge="ace">
                    ACE
                  </span>
                )}

                {configuration.debuffer === true && (
                  <span className="rounded-md border border-red-300/35 bg-red-400/[0.10] px-2 py-1 text-[10px] font-bold text-red-100" data-configuration-badge="debuffer">
                    DEBUFFER
                  </span>
                )}

                {configuration.entrySource === "autorun" && (
                  <span className="rounded-md border border-violet-300/35 bg-violet-300/[0.10] px-2 py-1 text-[10px] font-bold text-violet-100" data-configuration-badge="autorun">
                    AutoRun
                  </span>
                )}
                  </div>
                )}
                {overallHeading !== undefined && <div data-cm-uma-overall className="max-w-full text-[11px] font-medium leading-4 text-blue-100/60 [overflow-wrap:anywhere] sm:ml-auto">
                  <p>{overallHeading}</p>
                  <dl className="mt-1 grid grid-cols-[auto_auto] gap-x-3 tabular-nums">
                    <dt>WR:</dt><dd className="text-right">{overallStats?.winRate == null ? "—" : `${overallStats.winRate.toFixed(2)}%`}</dd>
                    <dt>Wins:</dt><dd className="text-right">{overallStats?.wins.toLocaleString("en") ?? "—"}</dd>
                    <dt>Races:</dt><dd className="text-right">{overallStats?.races.toLocaleString("en") ?? "—"}</dd>
                  </dl>
                </div>}
                </div>}
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
  <div data-cm-umas data-final-lineup-selection={isEditingFinalLineup || undefined} className="px-5 py-5">

          {/* FINAL LINEUP */}
          <div className="mx-auto max-w-[760px]">

              <div className="relative mb-4 flex min-h-10 flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] pb-3">
        <div>


          <div className="mt-0.5 text-lg font-black text-white">
            Final Lineup
          </div>
        </div>

        {qualifiedForFinal && isEditingFinalLineup && (
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <div className="mr-1 text-[10px] font-bold text-blue-100/45 sm:text-xs">
              {draftFinalCandidates.length}/3 selected
            </div>

            <button
              type="button"
              onClick={handleCancelEdit}
              className="h-9 rounded-lg border border-white/10 bg-white/[0.02] px-3 text-xs font-bold text-blue-100/55 transition hover:border-white/20 hover:text-white sm:px-4"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSaveFinalLineup}
              disabled={!canSaveFinalLineup}
              className="h-9 rounded-lg border border-cyan-400/35 bg-cyan-400/[0.06] px-3 text-xs font-black text-cyan-200 transition hover:border-cyan-300/60 hover:bg-cyan-400/[0.1] disabled:cursor-not-allowed disabled:border-white/[0.06] disabled:bg-transparent disabled:text-white/20 sm:px-4"
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
        className={`flex min-h-36 items-start justify-center gap-3 transition sm:gap-8 ${
          showFinalOverlay
            ? "opacity-25"
            : "opacity-100"
        }`}
      >
          {[0, 1, 2].map((index) => {
            const draftCandidate = isEditingFinalLineup ? draftFinalCandidates[index] : undefined
            const participant = isEditingFinalLineup
              ? cm.participants.find(uma => uma.cmUmaId === draftCandidate?.participantId) : finalParticipants[index]

            if (!participant && !draftCandidate) {
              return (
                <div
                  key={index}
                  className="mt-5 flex h-22 w-22 min-w-0 items-center justify-center rounded-xl border border-dashed border-cyan-300/15 bg-cyan-300/[0.015] text-2xl font-black text-cyan-100/15"
                >
                  ?
                </div>
              )
            }

            return renderUmaTile(
              participant,
              "final",
              draftCandidate,
              draftCandidate
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
      <div aria-label="All participants" className="mx-auto mt-6 max-w-4xl border-t border-white/[0.07] pt-4">

        <div className="mx-auto mb-4 max-w-[760px]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-lg font-black text-white">All Participants</div>
            {isFinalRegistration && isEditingFinalLineup && <button type="button" onClick={() => setIsEditCMOpen(true)}
              className="h-9 rounded-lg border border-cyan-400/30 bg-cyan-400/[0.05] px-4 text-xs font-black text-cyan-200 transition hover:border-cyan-300/55 hover:bg-cyan-400/[0.1]">+ Add New</button>}
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

        <div aria-label={isFinalRegistration && isEditingFinalLineup ? "Final lineup selection" : undefined}
          className="cm-historical-participant-grid flex flex-wrap items-start justify-center gap-x-3 gap-y-5 max-sm:mx-auto max-sm:max-w-90 sm:gap-x-7">
          {isFinalRegistration && isEditingFinalLineup
            ? finalLineupCandidates.map(candidate => renderUmaTile(cm.participants.find(uma => uma.cmUmaId === candidate.participantId), "selection", candidate, candidate))
            : historicalParticipants.map(entry => renderUmaTile(undefined, "historical", entry))}
        </div>
        {historicalParticipants.length === 0 && !(isFinalRegistration && isEditingFinalLineup) && (
          <p className="py-3 text-sm text-blue-100/40">No recorded participant results yet.</p>
        )}

      </div>

      {isEditCMOpen && isFinalRegistration && <EditCMModal cm={cm} setCms={setCms}
        onClose={() => setIsEditCMOpen(false)} onSaved={() => setIsEditCMOpen(false)} />}

    </div>
  )
}

export default CMUmas
