import {
  useEffect,
  useState,
} from "react"
import type { CM } from "../types/types"
import { umaStyleClasses } from "../data/cmData"
import { useUmaDatabase } from "../context/UmaDatabaseContext"
import CMModal from "./CMModal"
import EditCMModal from "./EditCMModal"
import CMNotesModal from "./CMNotesModal"
import {
  calculateOverallWinRateFromAttempts,
  calculateFinalQualificationFromAttempts,
} from "./CMCalculations"
import ModalPortal from "../components/ModalPortal"
import UmaAvatarImage from "../components/UmaAvatarImage"
import { getTrackImage } from "../data/trackData"



type CMCardProps = {
  cm: CM
  setCms: React.Dispatch<React.SetStateAction<CM[]>>
  compact?: boolean
  compactDimmed?: boolean
  onCompactHoverStart?: () => void
}

function CMCard({
  cm,
  setCms,
  compact = false,
  compactDimmed = false,
  onCompactHoverStart,
}: CMCardProps) {
  const {versions} = useUmaDatabase()
  const trackImage = getTrackImage(cm.track)
  const overallWinRate =
    calculateOverallWinRateFromAttempts(cm)
  const finalQualification =
  calculateFinalQualificationFromAttempts(
    cm.attempts ?? []
  )
  const displayedFinalQualification =
  cm.phase === "eliminated"
    ? "Eliminated"
    : finalQualification

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false)

  useEffect(() => {
  const handleGuideOpenEdit = (
    event: Event
  ) => {
    const customEvent =
      event as CustomEvent<{
        cmNumber: number
      }>

    if (
      customEvent.detail?.cmNumber !==
      cm.number
    ) {
      return
    }

    setIsEditModalOpen(true)
  }

  const handleGuideCloseEdit = (
    event: Event
  ) => {
    const customEvent =
      event as CustomEvent<{
        cmNumber: number
      }>

    if (
      customEvent.detail?.cmNumber !==
      cm.number
    ) {
      return
    }

    setIsEditModalOpen(false)
  }

  window.addEventListener(
    "uma-tracker:guide-open-cm-edit",
    handleGuideOpenEdit
  )

  window.addEventListener(
    "uma-tracker:guide-close-cm-edit",
    handleGuideCloseEdit
  )

  return () => {
    window.removeEventListener(
      "uma-tracker:guide-open-cm-edit",
      handleGuideOpenEdit
    )

    window.removeEventListener(
      "uma-tracker:guide-close-cm-edit",
      handleGuideCloseEdit
    )
  }
}, [cm.number])


  const handleDelete = () => {
  setShowDeleteConfirm(true)
  }

  const confirmDelete = () => {
  setCms((current) =>
    current.filter((item) => item.number !== cm.number)
  )

    setShowDeleteConfirm(false)
  }
  const handleSaveNotes = (notes: string) => {
    setCms((current) =>
      current.map((item) =>
        item.number === cm.number
          ? {
              ...item,
              notes,
            }
          : item
      )
    )
  }

  const showFinalLineup =
  cm.phase === "finalResult" ||
  cm.phase === "completed"

  const displayedLineup =
    showFinalLineup
      ? cm.participants
          .filter(
            (participant) =>
              participant.finalParticipant
          )
          .map(
            (participant) =>
              participant.cmUmaId
          )
      : cm.currentLineup


if (compact) {
  return (
    <div
    className="group mb-2"
    onMouseEnter={onCompactHoverStart}
  >
      <div
      data-guide="cm-card"
        className={`relative flex cursor-pointer items-center gap-6 overflow-hidden rounded-lg border border-blue-900/70 bg-gray-950/90 px-4 py-2 shadow-md transition-[transform,filter,box-shadow,opacity] duration-300 ease-out group-hover:z-10 group-hover:-translate-y-1 group-hover:scale-[1.04] group-hover:brightness-110 group-hover:shadow-2xl ${
        compactDimmed
          ? "scale-[0.99] opacity-70"
          : "scale-100 opacity-100"
      }`}
        onClick={() => setIsModalOpen(true)}
      >
        
      {/* CM NUMBER */}
      <div className="w-20 shrink-0 font-bold text-indigo-400">
        CM{cm.number}
      </div>

      {/* CM NAME */}
      <div className="w-40 shrink-0 truncate font-semibold text-white">
        {cm.name || "Unnamed CM"}
      </div>

      {/* RACECOURSE */}
      <div className="w-36 shrink-0 truncate text-gray-300">
        {cm.track || "—"}
      </div>

      {/* LENGTH */}
      <div className="w-24 shrink-0 text-gray-300">
        {cm.length}
      </div>

      {/* WIN RATE */}
      <div className="w-24 shrink-0 font-semibold text-white">
        {overallWinRate !== null
          ? `${overallWinRate.toFixed(2)}%`
          : "—"}
      </div>

            {/* RESULT */}
      <div className="min-w-28 shrink-0 font-semibold">
        {cm.phase === "eliminated" ? (
          <span className="text-red-400">
            ⛔ Eliminated
          </span>
        ) : cm.finalPlace === "1st" ? (
          <span className="text-yellow-400">
            🏆 1st
          </span>
        ) : cm.finalPlace === "2nd" ? (
          <span className="text-gray-300">
            🥈 2nd
          </span>
        ) : cm.finalPlace === "3rd" ? (
          <span className="text-orange-400">
            🥉 3rd
          </span>
        ) : (
          <span className="text-gray-500">
            {displayedFinalQualification}
          </span>
        )}
      </div>

            {/* COMPACT UMAS */}
      <div className="flex w-36 shrink-0 items-center gap-2">
        {displayedLineup.map((cmUmaId) => {
          const cmUma = (cm.participants ?? []).find(
            (participant) => participant.cmUmaId === cmUmaId
          )

          if (!cmUma) {
            return null
          }

          const umaVersion = versions.find(
            (item) => item.id === cmUma.umaId
          )

          if (!umaVersion) {
            return null
          }

          return (
  <div
    key={cmUma.cmUmaId}
    title={umaVersion.displayName}
    className="flex w-10 shrink-0 flex-col items-center"
  >
    {/* AVATAR */}
    <div
      className={`relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-md border border-black/40 ${umaStyleClasses[cmUma.style]} ${
        cmUma.won
          ? "ring-2 ring-yellow-400"
          : ""
      }`}
    >
      {umaVersion.avatar ? (
        <UmaAvatarImage
          avatar={umaVersion.avatar}
          alt={umaVersion.displayName}
          className="h-full w-full bg-black/20 object-contain"
        />
      ) : (
        <span className="text-sm font-bold text-white/70">
          ?
        </span>
      )}

      {cmUma.won && (
        <span className="absolute -right-1 -top-1 text-[10px]">
          👑
        </span>
      )}
    </div>

    {/* STATUS */}
    <div className="mt-1 flex h-3 items-center justify-center gap-0.5 text-[9px] leading-none">
      {cmUma.ace && (
        <span
          className="text-yellow-300"
          title="Ace"
        >
          ★
        </span>
      )}

      {cmUma.debuffer && (
        <span title="Debuffer">
          🟥
        </span>
      )}

      {cmUma.autoRun && (
        <span title="AutoRun">
          🤖
        </span>
      )}
    </div>
  </div>
)
        })}
      </div>

      {/* ACTIONS */}
      <div className="ml-auto flex shrink-0 items-center gap-1">
        <button
          data-guide="cm-edit"
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setIsEditModalOpen(true)
          }}
          className="flex h-8 w-8 items-center justify-center rounded-md text-sm text-gray-400 transition hover:bg-gray-700 hover:text-white"
          title="Edit CM"
        >
          ✏️
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setIsNotesModalOpen(true)
          }}
          className={`flex h-8 w-8 items-center justify-center rounded-md border text-sm transition ${
            cm.notes?.trim()
              ? "border-sky-400 bg-sky-500/25 text-sky-100 shadow-[0_0_8px_rgba(56,189,248,0.45)] hover:bg-sky-500/35"
              : "border-blue-900/70 bg-gray-950/60 text-gray-500 hover:border-blue-500 hover:bg-blue-950 hover:text-white"
          }`}
          title={cm.notes?.trim() ? "View Notes" : "Add Notes"}
        >
          📝
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            handleDelete()
          }}
          className="flex h-8 w-8 items-center justify-center rounded-md text-sm text-red-400 transition hover:bg-red-500 hover:text-white"
          title="Delete CM"
        >
          🗑️
        </button>
      </div>
          </div>

      {isModalOpen && (
        <CMModal
          cm={cm}
          setCms={setCms}
          onClose={() => setIsModalOpen(false)}
        />
      )}
      {isEditModalOpen && (
      <EditCMModal
        cm={cm}
        setCms={setCms}
        onClose={() => setIsEditModalOpen(false)}
      />
    )}
    {/* NOTES MODAL */}
    {isNotesModalOpen && (
      <CMNotesModal
        cm={cm}
        onSave={handleSaveNotes}
        onClose={() => setIsNotesModalOpen(false)}
      />
    )}
    {showDeleteConfirm && (
  <ModalPortal>
    <div
      className="fixed inset-0 z-200 flex items-center justify-center bg-black/70"
      onClick={() => setShowDeleteConfirm(false)}
    >
      <div
        className="w-full max-w-md rounded-xl bg-gray-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-3 text-xl font-bold text-white">
          Delete CM{cm.number}?
        </h2>

        <p className="mb-6 text-gray-400">
          Are you sure you want to delete this CM?
        </p>

        <div className="flex justify-end gap-3">
          <button
            onClick={() => setShowDeleteConfirm(false)}
            className="rounded-lg border-2 border-gray-600 px-5 py-2 text-gray-300 transition hover:bg-gray-700"
          >
            Cancel
          </button>

          <button
            onClick={confirmDelete}
            className="rounded-lg border-2 border-red-500 px-5 py-2 font-semibold text-red-400 transition hover:bg-red-500 hover:text-white"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  </ModalPortal>
)}
    </div>
  )
}

return (
  <div className="group mb-3">
    <>
      <div
        data-guide="cm-card"
        className="cm-card-sweep relative cursor-pointer overflow-hidden rounded-xl border border-sky-400/50 bg-gray-950/90 shadow-[0_0_14px_rgba(56,189,248,0.18),0_0_30px_rgba(37,99,235,0.10)] transition-[transform,background-color,box-shadow,border-color] duration-200 ease-out group-hover:-translate-y-1 group-hover:scale-[1.01] group-hover:border-sky-300/70 group-hover:bg-gray-900/95 group-hover:shadow-[0_0_20px_rgba(56,189,248,0.28),0_0_42px_rgba(37,99,235,0.18)]"
        onClick={() => setIsModalOpen(true)}
      >
        <div className="pointer-events-none absolute inset-0 rounded-xl shadow-[inset_0_0_12px_rgba(56,189,248,0.08)]" />
        
        <div className="grid min-h-[150px] grid-cols-[140px_480px_minmax(0,1fr)_120px_52px]">

          {/* CM NUMBER */}
          <div className="relative flex items-center justify-center overflow-hidden">

            {/* BACKGROUND */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-950/80 via-indigo-950/70 to-violet-950/80" />

            {/* SUBTLE GLOW */}
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/10 blur-2xl" />

            <div className="relative z-10 flex flex-col items-center">

              {/* LEAGUE */}
              <div
                className={`mb-1 text-[9px] font-black uppercase tracking-[0.18em] ${
                  cm.league === "Open League"
                    ? "text-emerald-400"
                    : cm.league === "Graded League"
                      ? "text-red-400"
                      : "text-gray-500"
                }`}
              >
                {cm.league === "Open League"
                  ? "OPEN"
                  : cm.league === "Graded League"
                    ? "GRADED"
                    : "—"}
              </div>

              {/* CROWN */}
              <svg
                viewBox="0 0 32 24"
                className="mb-0.5 h-5 w-7 text-sky-300 drop-shadow-[0_0_7px_rgba(125,211,252,0.7)]"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M4 19h24l2-12-7 5-7-9-7 9-7-5 2 12Zm2 2h20v2H6v-2Z" />
              </svg>

              {/* CM */}
              <div className="text-lg font-black tracking-wide text-blue-200">
                CM
              </div>

              {/* NUMBER + LAURELS */}
              <div className="relative mt-[-2px] flex items-center justify-center">

                {/* LEFT LAUREL */}
                <svg
                  viewBox="0 0 30 64"
                  className="absolute right-full mr-1 h-14 w-6 text-blue-400 drop-shadow-[0_0_7px_rgba(96,165,250,0.65)]"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <ellipse cx="18" cy="54" rx="4" ry="9" transform="rotate(-35 18 54)" />
                  <ellipse cx="13" cy="44" rx="4" ry="9" transform="rotate(-28 13 44)" />
                  <ellipse cx="11" cy="33" rx="4" ry="9" transform="rotate(-18 11 33)" />
                  <ellipse cx="12" cy="22" rx="4" ry="8" transform="rotate(-8 12 22)" />
                  <ellipse cx="16" cy="12" rx="4" ry="8" transform="rotate(12 16 12)" />
                </svg>

                {/* NUMBER */}
                <div
                  className={`font-black leading-none tracking-tight text-white drop-shadow-[0_0_8px_rgba(96,165,250,0.45)] ${
                    String(cm.number).length <= 2
                      ? "text-5xl"
                      : String(cm.number).length === 3
                        ? "text-4xl"
                        : String(cm.number).length === 4
                          ? "text-3xl"
                          : "text-2xl"
                  }`}
                >
                  {cm.number}
                </div>

                {/* RIGHT LAUREL */}
                <svg
                  viewBox="0 0 30 64"
                  className="absolute left-full ml-1 h-14 w-6 -scale-x-100 text-blue-400 drop-shadow-[0_0_7px_rgba(129,140,248,0.65)]"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <ellipse cx="18" cy="54" rx="4" ry="9" transform="rotate(-35 18 54)" />
                  <ellipse cx="13" cy="44" rx="4" ry="9" transform="rotate(-28 13 44)" />
                  <ellipse cx="11" cy="33" rx="4" ry="9" transform="rotate(-18 11 33)" />
                  <ellipse cx="12" cy="22" rx="4" ry="8" transform="rotate(-8 12 22)" />
                  <ellipse cx="16" cy="12" rx="4" ry="8" transform="rotate(12 16 12)" />
                </svg>

              </div>

            </div>

            {/* DIVIDER */}
            <div className="pointer-events-none absolute right-0 top-1/2 h-[68%] w-px -translate-y-1/2 bg-gradient-to-b from-transparent via-sky-400/80 to-transparent shadow-[0_0_6px_rgba(56,189,248,0.65)]" />

          </div>
          {/* EVENT / TRACK */}
          <div className="relative overflow-hidden">
            <div className="pointer-events-none absolute left-0 top-1/2 z-30 h-[68%] w-px -translate-y-1/2 bg-gradient-to-b from-transparent via-sky-400/80 to-transparent shadow-[0_0_6px_rgba(56,189,248,0.65)]" />

            {/* TRACK BACKGROUND */}
            {trackImage ? (
              <img
                src={trackImage}
                alt={cm.track}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-indigo-950 to-violet-950" />
            )}

            {/* OVERLAYS */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-gray-950 from-0% via-gray-950/80 via-45% to-gray-950/15 to-100%" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-gray-950/90 via-transparent to-gray-950/45" />

            {/* CONTENT */}
            <div className="relative z-10 flex h-full flex-col justify-center px-5 py-4">

              {/* CM NAME */}
              <div className="truncate text-2xl font-black tracking-tight text-white drop-shadow-lg">
                {cm.name || "Unnamed CM"}
              </div>

              {/* MAIN TRACK INFO */}
              <div className="mt-4 flex flex-nowrap items-center gap-2">

                {/* RACECOURSE */}
                <div className="whitespace-nowrap rounded-lg border border-blue-800/60 bg-gray-950/70 px-3 py-1.5 text-sm font-bold text-white backdrop-blur-sm">
                  {cm.track || "—"}
                </div>

                {/* SURFACE */}
                <div
                  className={`rounded-lg px-3 py-1.5 text-sm font-black ${
                    cm.surface === "Turf"
                      ? "bg-emerald-900/90 text-emerald-200"
                      : "bg-amber-900/90 text-amber-200"
                  }`}
                >
                  {cm.surface}
                </div>

                {/* DISTANCE */}
                <div className="rounded-lg border border-blue-800/60 bg-gray-950/70 px-3 py-1.5 text-sm font-bold text-white backdrop-blur-sm">
                  {cm.distance}m
                </div>

                {/* LENGTH */}
                <div className="rounded-lg border border-blue-800/60 bg-gray-950/70 px-3 py-1.5 text-sm font-bold text-white backdrop-blur-sm">
                  {cm.length}
                </div>
              </div>

              {/* SECONDARY INFO */}
              <div className="mt-3 flex items-center gap-3 whitespace-nowrap text-sm font-semibold text-gray-300">
                <span>{cm.direction}</span>

                <span className="text-blue-800">|</span>

                <span className="text-gray-300">
                  {cm.weather}
                </span>

                <span className="text-blue-800">|</span>

                <span className="text-gray-300">
                  {cm.season}
                </span>

                <span className="text-blue-800">|</span>

                <span className="text-gray-300">
                  {cm.condition}
                </span>

                <span className="text-blue-800">|</span>

                <span className="font-bold text-indigo-300">
                  {displayedFinalQualification}
                </span>
              </div>
            </div>
          </div>

          {/* TEAM LINEUP */}
<div className="relative flex min-w-0 flex-col justify-center px-4 py-3">

  {/* GLOW DIVIDER */}
  <div className="pointer-events-none absolute left-0 top-1/2 h-[68%] w-px -translate-y-1/2 bg-gradient-to-b from-transparent via-sky-400/80 to-transparent shadow-[0_0_6px_rgba(56,189,248,0.65)]" />

  {/* HEADER */}
    <div className="mx-auto flex items-center justify-center gap-3">

  {/* VERTICAL TEAM LINEUP LABEL */}
  <div className="flex h-[150px] shrink-0 items-center justify-center">
    <div className="rotate-180 [writing-mode:vertical-rl] text-sm font-black uppercase tracking-[0.22em] text-gray-300 drop-shadow-[0_0_5px_rgba(125,211,252,0.25)]">
      Team Lineup
    </div>
  </div>

  {/* UMA CARDS */}
  <div className="flex items-center gap-3">
    {displayedLineup.map((cmUmaId) => {
      const cmUma = (cm.participants ?? []).find(
        (participant) =>
          participant.cmUmaId === cmUmaId
      )

      if (!cmUma) {
        return null
      }

      const umaVersion = versions.find(
        (item) => item.id === cmUma.umaId
      )

      if (!umaVersion) {
        return null
      }

      return (
        <div
          key={cmUma.cmUmaId}
          className={`relative flex h-[150px] w-[150px] shrink-0 flex-col overflow-hidden rounded-xl border shadow-md ${umaStyleClasses[cmUma.style]} ${
            cmUma.won
              ? "ring-2 ring-yellow-400 ring-offset-1 ring-offset-gray-950"
              : ""
          }`}
        >
          {/* PORTRAIT */}
          <div className="relative min-h-0 flex-1 overflow-hidden">

              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-red-900/20 via-transparent to-black/20" />

              {/* AVATAR CLIPPING AREA */}
              <div className="absolute inset-0 overflow-hidden">
                {umaVersion.avatar ? (
                  <UmaAvatarImage
                    avatar={umaVersion.avatar}
                    alt={umaVersion.displayName}
                    className="absolute inset-0 h-full w-full origin-top scale-[1.65] object-contain object-top"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-2xl font-black text-gray-600">
                    ?
                  </div>
                )}
              </div>
          {/* STATUS ICONS */}
          {(cmUma.debuffer || cmUma.autoRun) && (
            <div className="absolute right-1 top-1 z-30 flex flex-col gap-0.5">
              {cmUma.debuffer && (
                <span
                  className="flex h-4 w-4 items-center justify-center rounded bg-black/65 text-[9px]"
                  title="Debuffer"
                >
                  🟥
                </span>
              )}

              {cmUma.autoRun && (
                <span
                  className="flex h-4 w-4 items-center justify-center rounded bg-black/65 text-[9px]"
                  title="AutoRun"
                >
                  🤖
                </span>
              )}
            </div>
          )}
          </div>

          {/* NAME */}
          <div className="relative z-20 flex min-h-[38px] items-center justify-center border-t border-white/10 bg-black/25 px-2 py-1 text-center">
            <div
              className="line-clamp-2 break-words text-[11px] font-black leading-[1.05] text-white"
              title={umaVersion.displayName}
            >
              {cmUma.ace && (
                <span className="mr-1 text-yellow-300">★</span>
              )}
              {umaVersion.displayName}
            </div>
          </div>

        </div>
      )
    })}
  </div>
  </div>
</div>

          {/* RESULT */}
            <div className="relative flex flex-col items-center justify-center px-3 text-center">
            <div className="pointer-events-none absolute left-0 top-1/2 h-[68%] w-px -translate-y-1/2 bg-gradient-to-b from-transparent via-sky-400/80 to-transparent shadow-[0_0_8px_rgba(56,189,248,0.65)]" />

            {/* WIN RATE */}
            <div className="mb-3">
              <div className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-500">
                Win Rate
              </div>

              <div className="mt-0.5 text-lg font-black text-white">
                {overallWinRate !== null
                  ? `${overallWinRate.toFixed(2)}%`
                  : "—"}
              </div>
              
            </div>

            {/* FINAL RESULT */}
            {cm.phase === "eliminated" ? (
              <>
                <div className="text-3xl">
                  ⛔
                </div>

                <div className="mt-1 text-xs font-bold text-red-400">
                  Eliminated
                </div>
              </>
            ) : cm.finalPlace === "1st" ? (
              <>
                <div className="text-3xl">
                  🏆
                </div>

                <div className="mt-1 text-xs font-black text-yellow-400">
                  1st Place
                </div>
              </>
            ) : cm.finalPlace === "2nd" ? (
              <>
                <div className="text-3xl">
                  🥈
                </div>

                <div className="mt-1 text-xs font-black text-gray-300">
                  2nd Place
                </div>
              </>
            ) : cm.finalPlace === "3rd" ? (
              <>
                <div className="text-3xl">
                  🥉
                </div>

                <div className="mt-1 text-xs font-black text-orange-400">
                  3rd Place
                </div>
              </>
            ) : (
              <div className="max-w-[110px] text-xs font-semibold leading-tight text-gray-400">
                {displayedFinalQualification}
              </div>
            )}
          </div>

          {/* ACTIONS */}
            <div className="relative flex flex-col items-center justify-center gap-2">
            <div className="pointer-events-none absolute left-0 top-1/2 h-[68%] w-px -translate-y-1/2 bg-gradient-to-b from-transparent via-sky-400/80 to-transparent shadow-[0_0_8px_rgba(56,189,248,0.65)]" />

            <button
            data-guide="cm-edit"
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setIsEditModalOpen(true)
              }}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-blue-900/70 bg-gray-950/60 text-base text-gray-400 transition hover:border-blue-500 hover:bg-blue-950 hover:text-white"
              title="Edit CM"
            >
              ✏️
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setIsNotesModalOpen(true)
              }}
              className={`flex h-9 w-9 items-center justify-center rounded-lg border text-base transition ${
                cm.notes?.trim()
                  ? "border-sky-400 bg-sky-500/25 text-sky-100 shadow-[0_0_10px_rgba(56,189,248,0.45)] hover:bg-sky-500/35"
                  : "border-blue-900/70 bg-gray-950/60 text-gray-500 hover:border-blue-500 hover:bg-blue-950 hover:text-white"
              }`}
              title={cm.notes?.trim() ? "View Notes" : "Add Notes"}
            >
              📝
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleDelete()
              }}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-950/70 bg-gray-950/60 text-base text-red-400 transition hover:border-red-500 hover:bg-red-950 hover:text-red-200"
              title="Delete CM"
            >
              🗑️
            </button>
          </div>

        </div>
      </div>

      {/* CM MODAL */}
      {isModalOpen && (
        <CMModal
          cm={cm}
          setCms={setCms}
          onClose={() =>
            setIsModalOpen(false)
          }
        />
      )}

      {/* EDIT MODAL */}
      {isEditModalOpen && (
        <EditCMModal
          cm={cm}
          setCms={setCms}
          onClose={() =>
            setIsEditModalOpen(false)
          }
        />
      )}
      {/* NOTES MODAL */}
      {isNotesModalOpen && (
        <CMNotesModal
          cm={cm}
          onSave={handleSaveNotes}
          onClose={() =>
            setIsNotesModalOpen(false)
          }
        />
      )}

      {/* DELETE CONFIRM */}
      {showDeleteConfirm && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-200 flex items-center justify-center bg-black/70"
            onClick={() =>
              setShowDeleteConfirm(false)
            }
          >
            <div
              className="w-full max-w-md rounded-xl bg-gray-900 p-6 shadow-2xl"
              onClick={(e) =>
                e.stopPropagation()
              }
            >
              <h2 className="mb-3 text-xl font-bold text-white">
                Delete CM{cm.number}?
              </h2>

              <p className="mb-6 text-gray-400">
                Are you sure you want to
                delete this CM?
              </p>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setShowDeleteConfirm(
                      false
                    )
                  }
                  className="rounded-lg border-2 border-gray-600 px-5 py-2 text-gray-300 transition hover:bg-gray-700"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={confirmDelete}
                  className="rounded-lg border-2 border-red-500 px-5 py-2 font-semibold text-red-400 transition hover:bg-red-500 hover:text-white"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </>
  </div>
)
}

export default CMCard