import { formatTrackLength } from "../formatting"
import {
  useEffect,
  useState,
} from "react"
import type { CM } from "../types/types"
import { umaStyleClasses } from "../data/cmData"
import { getRunningStyleLabel } from "./cmParticipantConfiguration"
import { useUmaDatabase } from "../context/UmaDatabaseContext"
import { navigateAppRoute } from "../Statistics/statisticsRoute"
import EditCMModal from "./EditCMModal"
import CMNotesModal from "./CMNotesModal"
import {
  calculateOverallWinRateFromAttempts,
  calculateFinalQualificationFromAttempts,
} from "./CMCalculations"
import ModalPortal from "../components/ModalPortal"
import UmaAvatarImage from "../components/UmaAvatarImage"
import CMCardMobile from "./CMCardMobile"
import CMFinalPlacementBadge from "./CMFinalPlacementBadge"
import EventCardLayout from "../components/event-card/EventCardLayout"
import EventCardBadge from "../components/event-card/EventCardBadge"
import EventCardInfo from "../components/event-card/EventCardInfo"
import EventCardLineup from "../components/event-card/EventCardLineup"
import EventUmaTile from "../components/event-card/EventUmaTile"


type CMCardProps = {
  cm: CM
  setCms: React.Dispatch<React.SetStateAction<CM[]>>
  mobile?: boolean
  compact?: boolean
  compactDimmed?: boolean
  onCompactHoverStart?: () => void
}

function CMCard({
  cm,
  setCms,
  mobile = false,
  compact = false,
  compactDimmed = false,
  onCompactHoverStart,
}: CMCardProps) {
  const {versions} = useUmaDatabase()
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

  const openCm = () => navigateAppRoute("cms", String(cm.number), import.meta.env.BASE_URL)
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

if (mobile) {
  return (
    <>
      <CMCardMobile
        cm={cm}
        compact={compact}
        onOpen={openCm}
        onEdit={() =>
          setIsEditModalOpen(true)
        }
        onNotes={() =>
          setIsNotesModalOpen(true)
        }
        onDelete={handleDelete}
        overallWinRate={overallWinRate}
        displayedFinalQualification={
          displayedFinalQualification
        }
      />

      {isEditModalOpen && (
        <EditCMModal
          cm={cm}
          setCms={setCms}
          onClose={() =>
            setIsEditModalOpen(false)
          }
        />
      )}

      {isNotesModalOpen && (
        <CMNotesModal
          cm={cm}
          onSave={handleSaveNotes}
          onClose={() =>
            setIsNotesModalOpen(false)
          }
        />
      )}

      {showDeleteConfirm && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-200 flex items-center justify-center bg-black/70 px-4"
            onClick={() =>
              setShowDeleteConfirm(false)
            }
          >
            <div
              className="w-full max-w-md rounded-xl bg-gray-900 p-6 shadow-2xl"
              onClick={(event) =>
                event.stopPropagation()
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
                  className="rounded-lg border-2 border-gray-600 px-5 py-2 text-gray-300"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={confirmDelete}
                  className="rounded-lg border-2 border-red-500 px-5 py-2 font-semibold text-red-400"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </>
  )
}

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
        onClick={openCm}
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
        {formatTrackLength(cm.length)}
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
        {Array.from({ length: 3 }, (_, index) => displayedLineup[index]).map((cmUmaId, index) => {
          const cmUma = (cm.participants ?? []).find(
            (participant) => participant.cmUmaId === cmUmaId
          )

          if (!cmUma) {
            return <div key={`empty-${index}`} aria-label="Empty lineup slot" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-dashed border-cyan-300/15 bg-cyan-300/[0.015] text-cyan-100/15">?</div>
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
      className={`relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-md border ${umaStyleClasses[getRunningStyleLabel(cmUma.runningStyle)]} ${
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

      <CMFinalPlacementBadge placement={showFinalLineup ? cm.finalResults?.find((result) => result.cmUmaId === cmUma.cmUmaId)?.placement : null} location="compact-card" />
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
      <EventCardLayout onOpen={openCm}>
  <EventCardBadge number={cm.number} leagueLabel={cm.league === "Open League" ? "OPEN" : cm.league === "Graded League" ? "GRADED" : "?"} leagueClassName={cm.league === "Open League" ? "text-emerald-400" : cm.league === "Graded League" ? "text-red-400" : "text-gray-500"} />
  <EventCardInfo name={cm.name || "Unnamed CM"} racecourse={cm.track} surface={cm.surface} distance={cm.distance} length={cm.length} direction={cm.direction} weather={cm.weather} season={cm.season} condition={cm.condition} status={<span className="font-bold text-indigo-300">{displayedFinalQualification}</span>} />
  <EventCardLineup>{Array.from({ length: 3 }, (_, index) => displayedLineup[index]).map((cmUmaId, index) => {
      const cmUma = (cm.participants ?? []).find(
        (participant) =>
          participant.cmUmaId === cmUmaId
      )

      if (!cmUma) {
        return <div key={`empty-${index}`} aria-label="Empty lineup slot" className="flex h-[150px] w-[150px] shrink-0 items-center justify-center rounded-xl border border-dashed border-cyan-300/15 bg-cyan-300/[0.015] text-2xl font-black text-cyan-100/15">?</div>
      }

      const umaVersion = versions.find(
        (item) => item.id === cmUma.umaId
      )

      if (!umaVersion) {
        return null
      }

      return (
        <EventUmaTile key={cmUma.cmUmaId} participant={cmUma} version={umaVersion} highlightWinner={cmUma.won} decoration={<CMFinalPlacementBadge placement={showFinalLineup ? cm.finalResults?.find((result) => result.cmUmaId === cmUma.cmUmaId)?.placement : null} location="card" />} />
      )
    })}</EventCardLineup>
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
</EventCardLayout>

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
