import type { CM } from "../types/types"

import { getTrackImage } from "../data/trackData"

import { umaStyleClasses } from "../data/cmData"
import { useUmaDatabase } from "../context/UmaDatabaseContext"
import UmaAvatarImage from "../components/UmaAvatarImage"

type CMCardMobileProps = {
  cm: CM
  compact?: boolean
  onOpen: () => void
  onEdit: () => void
  onNotes: () => void
  onDelete: () => void
  overallWinRate: number | null
  displayedFinalQualification: string
}


function CMCardMobile({
  cm,
  compact = false,
  onOpen,
  onEdit,
  onNotes,
  onDelete,
  overallWinRate,
  displayedFinalQualification,
}: CMCardMobileProps) {
  const trackImage = getTrackImage(
    cm.track
  )

  const { versions } = useUmaDatabase()

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

    const totalRaces = (
        cm.attempts ?? []
        ).reduce(
        (total, attempt) =>
            total + attempt.racesPlayed,
        0
        )

        const totalWins = (
        cm.attempts ?? []
        ).reduce(
        (total, attempt) =>
            total +
            (attempt.umaWins ?? []).reduce(
            (wins, uma) =>
                wins + uma.wins,
            0
            ),
        0
        )

        if (compact) {
        return (
            <div
            role="button"
            tabIndex={0}
            onClick={onOpen}
            onKeyDown={(event) => {
                if (
                event.key === "Enter" ||
                event.key === " "
                ) {
                onOpen()
                }
            }}
            className="mb-2 flex cursor-pointer gap-3 rounded-xl border border-blue-900/70 bg-gray-950/90 px-3 py-3 shadow-md"
            >
            {/* MAIN CONTENT */}
            <div className="min-w-0 flex-1">
                {/* HEADER */}
                <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="text-[10px] font-black uppercase tracking-[0.14em] text-sky-400">
                    CM{cm.number}
                    </div>

                    <div className="truncate text-base font-black text-white">
                    {cm.name || "Unnamed CM"}
                    </div>
                </div>

                <div className="shrink-0 text-right">
                    <div className="text-[9px] font-black uppercase tracking-[0.12em] text-gray-500">
                    Win Rate
                    </div>

                    <div className="text-sm font-black text-white">
                    {overallWinRate !== null
                        ? `${overallWinRate.toFixed(
                            2
                        )}%`
                        : "—"}
                    </div>
                </div>
                </div>

                {/* TRACK INFO */}
                <div className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[11px] font-semibold text-gray-400">
                <span>{cm.track || "—"}</span>
                <span className="text-sky-700">
                    •
                </span>
                <span>{cm.surface}</span>
                <span className="text-sky-700">
                    •
                </span>
                <span>{cm.distance}m</span>
                <span className="text-sky-700">
                    •
                </span>
                <span>{cm.length}</span>
                </div>

                {/* BOTTOM */}
                <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/10 pt-2">
                {/* UMAS */}
                <div className="flex items-center gap-1.5">
                    {displayedLineup
                    .slice(0, 3)
                    .map((cmUmaId) => {
                        const cmUma = (
                        cm.participants ?? []
                        ).find(
                        (participant) =>
                            participant.cmUmaId ===
                            cmUmaId
                        )

                        if (!cmUma) {
                        return null
                        }

                        const umaVersion =
                        versions.find(
                            (item) =>
                            item.id ===
                            cmUma.umaId
                        )

                        if (!umaVersion) {
                        return null
                        }

                        return (
                        <div
                            key={cmUma.cmUmaId}
                            title={
                            umaVersion.displayName
                            }
                            className={`relative h-10 w-10 overflow-hidden rounded-lg border border-black/40 ${umaStyleClasses[cmUma.style]} ${
                            cmUma.won
                                ? "ring-2 ring-yellow-400"
                                : ""
                            }`}
                        >
                            {umaVersion.avatar ? (
                            <UmaAvatarImage
                                avatar={
                                umaVersion.avatar
                                }
                                alt={
                                umaVersion.displayName
                                }
                                className="h-full w-full bg-black/20 object-contain"
                            />
                            ) : (
                            <div className="flex h-full items-center justify-center font-black text-white/60">
                                ?
                            </div>
                            )}

                            {cmUma.ace && (
                            <span className="absolute bottom-0 left-0 flex h-4 w-4 items-center justify-center rounded-tr bg-black/70 text-[9px] text-yellow-300">
                                ★
                            </span>
                            )}
                        </div>
                        )
                    })}
                </div>

                {/* RESULT */}
                <div className="shrink-0 text-right">
                    <div className="text-[9px] font-black uppercase tracking-[0.12em] text-gray-500">
                    Result
                    </div>

                    {cm.finalPlace === "1st" ? (
                    <div className="font-black text-yellow-400">
                        🏆 1st
                    </div>
                    ) : cm.finalPlace ===
                    "2nd" ? (
                    <div className="font-black text-gray-300">
                        🥈 2nd
                    </div>
                    ) : cm.finalPlace ===
                    "3rd" ? (
                    <div className="font-black text-orange-400">
                        🥉 3rd
                    </div>
                    ) : cm.phase ===
                    "eliminated" ? (
                    <div className="font-bold text-red-400">
                        Eliminated
                    </div>
                    ) : (
                    <div className="font-bold text-indigo-300">
                        {
                        displayedFinalQualification
                        }
                    </div>
                    )}
                </div>
                </div>
            </div>

            {/* ACTIONS */}
            <div className="flex shrink-0 flex-col justify-center gap-1.5 border-l border-white/10 pl-2">
                <button
                data-guide="cm-edit"
                type="button"
                onClick={(event) => {
                    event.stopPropagation()
                    onEdit()
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-blue-900/70 bg-gray-950/60 text-sm text-gray-400"
                title="Edit CM"
                >
                ✏️
                </button>

                <button
                type="button"
                onClick={(event) => {
                    event.stopPropagation()
                    onNotes()
                }}
                className={`flex h-8 w-8 items-center justify-center rounded-lg border text-sm ${
                    cm.notes?.trim()
                    ? "border-sky-400 bg-sky-500/25 text-sky-100"
                    : "border-blue-900/70 bg-gray-950/60 text-gray-500"
                }`}
                title={
                    cm.notes?.trim()
                    ? "View Notes"
                    : "Add Notes"
                }
                >
                📝
                </button>

                <button
                type="button"
                onClick={(event) => {
                    event.stopPropagation()
                    onDelete()
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-950/70 bg-gray-950/60 text-sm text-red-400"
                title="Delete CM"
                >
                🗑️
                </button>
            </div>
            </div>
        )
        }

  return (
    <div className="mb-3">
      <div
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(event) => {
            if (
            event.key === "Enter" ||
            event.key === " "
            ) {
            onOpen()
            }
        }}
        className="relative w-full cursor-pointer overflow-hidden rounded-xl border border-sky-400/50 bg-gray-950 text-left shadow-[0_0_14px_rgba(56,189,248,0.16)]"
        >
        {/* TRACK BACKGROUND */}
        {trackImage ? (
          <img
            src={trackImage}
            alt={cm.track}
            className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center opacity-70"
          />
        ) : (
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-950 via-indigo-950 to-violet-950" />
        )}

        {/* OVERLAYS */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-gray-950/20 via-gray-950/45 to-gray-950/90" />

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-gray-950/65 via-transparent to-gray-950/30" />

        {/* CONTENT */}
            <div
            data-guide="cm-card-mobile"
            className="relative z-10 px-4 pb-4 pt-4"
            >
          {/* HEADER */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div
                className={`text-[10px] font-black uppercase tracking-[0.18em] ${
                  cm.league ===
                  "Open League"
                    ? "text-emerald-300"
                    : cm.league ===
                        "Graded League"
                      ? "text-red-400"
                      : "text-gray-400"
                }`}
              >
                {cm.league ===
                "Open League"
                  ? "OPEN LEAGUE"
                  : cm.league ===
                      "Graded League"
                    ? "GRADED LEAGUE"
                    : "—"}
              </div>

              <div className="mt-1 line-clamp-2 text-2xl font-black leading-tight tracking-tight text-white drop-shadow-lg">
                {cm.name ||
                  "Unnamed CM"}
              </div>
            </div>

            {/* CM NUMBER */}
            <div className="shrink-0 rounded-xl border border-sky-400/40 bg-blue-950/80 px-3 py-2 text-center shadow-lg backdrop-blur-sm">
              <div className="text-[9px] font-black uppercase tracking-[0.12em] text-blue-300/70">
                CM
              </div>

              <div className="mt-0.5 text-2xl font-black leading-none text-sky-300">
                {cm.number}
              </div>
            </div>
          </div>

          {/* MAIN TRACK INFO */}
          <div className="mt-4 flex flex-wrap gap-2">
            <div className="rounded-lg border border-blue-700/70 bg-gray-950/80 px-3 py-1.5 text-sm font-bold text-white backdrop-blur-sm">
              {cm.track || "—"}
            </div>

            <div
              className={`rounded-lg px-3 py-1.5 text-sm font-black ${
                cm.surface === "Turf"
                  ? "bg-emerald-800/90 text-emerald-100"
                  : "bg-amber-800/90 text-amber-100"
              }`}
            >
              {cm.surface}
            </div>

            <div className="rounded-lg border border-blue-700/70 bg-gray-950/80 px-3 py-1.5 text-sm font-bold text-white backdrop-blur-sm">
              {cm.distance}m
            </div>

            <div className="rounded-lg border border-blue-700/70 bg-gray-950/80 px-3 py-1.5 text-sm font-bold text-white backdrop-blur-sm">
              {cm.length}
            </div>
          </div>

          {/* SECONDARY TRACK INFO */}
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold text-gray-200">
            <span>{cm.direction}</span>

            <span className="text-sky-500/60">
              •
            </span>

            <span>{cm.weather}</span>

            <span className="text-sky-500/60">
              •
            </span>

            <span>{cm.season}</span>

            <span className="text-sky-500/60">
              •
            </span>

            <span>{cm.condition}</span>
          </div>
        </div>
        {/* TEAM LINEUP */}
            <div className="relative z-10 mt-1 border-t border-white/15 bg-gray-950/80 px-4 pb-4 pt-3 backdrop-blur-sm">
            <div className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-gray-300">
                Team Lineup
            </div>

            <div className="grid grid-cols-3 gap-2">
                {displayedLineup.map((cmUmaId) => {
                const cmUma = (
                    cm.participants ?? []
                ).find(
                    (participant) =>
                    participant.cmUmaId === cmUmaId
                )

                if (!cmUma) {
                    return null
                }

                const umaVersion = versions.find(
                    (item) =>
                    item.id === cmUma.umaId
                )

                if (!umaVersion) {
                    return null
                }

                return (
                    <div
                    key={cmUma.cmUmaId}
                    className="min-w-0"
                    >
                    <div
                        className={`relative aspect-square overflow-hidden rounded-lg border border-black/40 ${umaStyleClasses[cmUma.style]} ${
                        cmUma.won
                            ? "ring-2 ring-yellow-400"
                            : ""
                        }`}
                    >
                        {umaVersion.avatar ? (
                        <UmaAvatarImage
                            avatar={umaVersion.avatar}
                            alt={
                            umaVersion.displayName
                            }
                            className="h-full w-full bg-black/20 object-contain"
                        />
                        ) : (
                        <div className="flex h-full items-center justify-center text-xl font-black text-white/60">
                            ?
                        </div>
                        )}

                        {(cmUma.debuffer ||
                        cmUma.autoRun) && (
                            <div className="absolute right-1 top-1 flex flex-col gap-0.5">
                            {cmUma.debuffer && (
                                <span className="flex h-4 w-4 items-center justify-center rounded bg-black/70 text-[9px]">
                                🟥
                                </span>
                            )}

                            {cmUma.autoRun && (
                                <span className="flex h-4 w-4 items-center justify-center rounded bg-black/70 text-[9px]">
                                🤖
                                </span>
                            )}
                            </div>
                        )}
                    </div>

                    <div className="mt-1 min-h-[2.25rem] text-center">
                        <div
                        className="line-clamp-2 break-words text-[11px] font-bold leading-tight text-white"
                        title={
                            umaVersion.displayName
                        }
                        >
                        {cmUma.ace && (
                            <span className="mr-1 text-yellow-300">
                            ★
                            </span>
                        )}

                        {umaVersion.displayName}
                        </div>
                    </div>
                    </div>
                )
                })}
            </div>
            </div>
            {/* RESULT */}
                <div className="relative z-10 border-t border-white/10 bg-gray-950/90 px-4 py-3">
                <div className="grid grid-cols-3 divide-x divide-white/10 rounded-xl border border-blue-900/60 bg-blue-950/20">
                    {/* WIN RATE */}
                    <div className="px-3 py-2.5">
                    <div className="text-[9px] font-black uppercase tracking-[0.14em] text-gray-500">
                        Win Rate
                    </div>

                    <div className="mt-1 text-xl font-black text-white">
                        {overallWinRate !== null
                        ? `${overallWinRate.toFixed(2)}%`
                        : "—"}
                    </div>

                    <div className="mt-0.5 text-[10px] font-bold text-gray-500">
                        {totalWins}W / {totalRaces}R
                    </div>
                    </div>

                    {/* FINAL RESULT */}
                    <div className="px-3 py-3 text-center">
                    <div className="text-[9px] font-black uppercase tracking-[0.14em] text-gray-500">
                        Final Result
                    </div>

                    <div className="mt-2 text-base font-black text-indigo-300">
                        {displayedFinalQualification}
                    </div>
                    </div>

                    {/* FINAL PLACE */}
                    <div className="px-3 py-3 text-center">
                    <div className="text-[9px] font-black uppercase tracking-[0.14em] text-gray-500">
                        Final Place
                    </div>

                    {cm.phase === "eliminated" ? (
                        <div className="mt-2 text-sm font-bold text-red-400">
                        —
                        </div>
                    ) : cm.finalPlace === "1st" ? (
                        <div className="mt-1 text-xl font-black text-yellow-400">
                        🏆 1st
                        </div>
                    ) : cm.finalPlace === "2nd" ? (
                        <div className="mt-1 text-xl font-black text-gray-300">
                        🥈 2nd
                        </div>
                    ) : cm.finalPlace === "3rd" ? (
                        <div className="mt-1 text-xl font-black text-orange-400">
                        🥉 3rd
                        </div>
                    ) : (
                        <div className="mt-2 text-sm font-bold text-gray-500">
                        —
                        </div>
                    )}
                    </div>
                </div>
                </div>
                {/* ACTIONS */}
                    <div className="relative z-10 flex items-center justify-end gap-2 border-t border-white/10 bg-gray-950/95 px-4 py-2.5">
                    <button
                        data-guide="cm-edit"
                        type="button"
                        onClick={(event) => {
                        event.stopPropagation()
                        onEdit()
                        }}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-blue-900/70 bg-gray-950/60 text-base text-gray-400 transition hover:border-blue-500 hover:bg-blue-950 hover:text-white"
                        title="Edit CM"
                    >
                        ✏️
                    </button>

                    <button
                        type="button"
                        onClick={(event) => {
                        event.stopPropagation()
                        onNotes()
                        }}
                        className={`flex h-9 w-9 items-center justify-center rounded-lg border text-base transition ${
                        cm.notes?.trim()
                            ? "border-sky-400 bg-sky-500/25 text-sky-100"
                            : "border-blue-900/70 bg-gray-950/60 text-gray-500"
                        }`}
                        title={
                        cm.notes?.trim()
                            ? "View Notes"
                            : "Add Notes"
                        }
                    >
                        📝
                    </button>

                    <button
                        type="button"
                        onClick={(event) => {
                        event.stopPropagation()
                        onDelete()
                        }}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-950/70 bg-gray-950/60 text-base text-red-400 transition hover:border-red-500 hover:bg-red-950 hover:text-red-200"
                        title="Delete CM"
                    >
                        🗑️
                    </button>
                    </div>
      </div>
    </div>
  )
}

export default CMCardMobile