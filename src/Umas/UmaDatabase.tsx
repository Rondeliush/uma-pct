import { useState } from "react"
import { useUmaDatabase } from "../context/UmaDatabaseContext"
import AddUmaModal from "./AddUmaModal"
import type { CM } from "../types/types"
import ModalPortal from "../components/ModalPortal"
import UmaAvatarImage from "../components/UmaAvatarImage"

type StatusFilter = "active" | "archived" | "all"

type UmaDatabaseProps = {
  cms: CM[]
  hasUpdateNotification: boolean
}

type DeleteTarget = {
  versionId: string
  characterId: string
  displayName: string
}

function UmaDatabase({
  cms,
  hasUpdateNotification,
}: UmaDatabaseProps) {
  const {
    characters,
    versions,
    customVersions,
    setCustomCharacters,
    setCustomVersions,
    isCustomCharacter,
    isCustomVersion,
    hasOfficialCharacterMatch,
    archiveVersion,
    unarchiveVersion,
  } = useUmaDatabase()

  const [searchText, setSearchText] = useState("")
  const [isAddUmaOpen, setIsAddUmaOpen] = useState(false)

  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("active")

  const [showOfficial, setShowOfficial] = useState(true)
  const [showCustom, setShowCustom] = useState(true)

  const [deleteTarget, setDeleteTarget] =
    useState<DeleteTarget | null>(null)

  const isVersionUsed = (versionId: string) => {
  return cms.some((cm) =>
    (cm.participants ?? []).some(
      (participant) =>
        participant.umaId === versionId
    )
  )
}

  const deleteCustomVersion = (
    versionId: string,
    characterId: string
  ) => {
    if (isVersionUsed(versionId)) {
      return
    }

    const remainingCustomVersions = customVersions.filter(
      (version) => version.id !== versionId
    )

    setCustomVersions(remainingCustomVersions)

    unarchiveVersion(versionId)

    const hasOtherCustomVersions =
      remainingCustomVersions.some(
        (version) =>
          version.characterId === characterId
      )

    if (
      !hasOtherCustomVersions &&
      isCustomCharacter(characterId)
    ) {
      setCustomCharacters((current) =>
        current.filter(
          (character) =>
            character.id !== characterId
        )
      )
    }

    setDeleteTarget(null)
  }

  const getFilteredVersions = (
    characterId: string
  ) => {
    return versions.filter((version) => {
      if (version.characterId !== characterId) {
        return false
      }

      if (statusFilter === "active") {
        if (version.archived) {
          return false
        }

        const custom =
          isCustomVersion(version.id)

        if (custom && !showCustom) {
          return false
        }

        if (!custom && !showOfficial) {
          return false
        }

        return true
      }

      if (statusFilter === "archived") {
        return version.archived
      }

      return true
    })
  }

  const filteredCharacters =
    characters.filter((character) => {
      const characterVersions =
        getFilteredVersions(character.id)

      if (characterVersions.length === 0) {
        return false
      }

      const search =
        searchText.toLowerCase().trim()

      if (search === "") {
        return true
      }

      return (
        character.name
          .toLowerCase()
          .includes(search) ||
        characterVersions.some((version) =>
          version.displayName
            .toLowerCase()
            .includes(search)
        )
      )
    })

  return (
    <div>

      {/* STICKY DATABASE TOOLBAR */}
      <div
        data-guide="uma-database-toolbar"
        className={`sticky ${
          hasUpdateNotification
            ? "top-[96px]"
            : "top-[60px]"
        } z-40 mx-auto mb-6 max-w-4xl overflow-hidden rounded-xl border border-sky-400/15 bg-[#07111f]/90 shadow-[0_12px_32px_rgba(0,0,0,0.28)] backdrop-blur-xl`}
      >
        {/* MAIN ROW */}
        <div className="flex items-center gap-3 px-4 py-3">

          {/* STATUS FILTER */}
          <div className="flex shrink-0 items-center gap-1 border-r border-white/[0.07] pr-3">
            {(
              [
                ["active", "Active"],
                ["archived", "Archived"],
                ["all", "All"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatusFilter(value)}
                className={`relative rounded-md px-3 py-1.5 text-xs font-bold transition ${
                  statusFilter === value
                    ? "bg-sky-400/[0.09] text-sky-200"
                    : "text-blue-100/40 hover:bg-white/[0.035] hover:text-white"
                }`}
              >
                {label}

                {statusFilter === value && (
                  <span className="absolute inset-x-2 -bottom-[13px] h-0.5 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.55)]" />
                )}
              </button>
            ))}
          </div>

          {/* SEARCH */}
          <div className="relative min-w-0 flex-1">
            <svg
              viewBox="0 0 24 24"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-blue-100/25"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-4-4" />
            </svg>

            <input
              type="text"
              value={searchText}
              onChange={(e) =>
                setSearchText(e.target.value)
              }
              placeholder="Search Uma..."
              className="h-9 w-full rounded-lg border border-white/[0.08] bg-black/20 pl-9 pr-3 text-sm font-medium text-white outline-none placeholder:text-blue-100/25 focus:border-sky-400/40 focus:bg-black/25"
            />
          </div>

          {/* ADD UMA */}
          <button
            type="button"
            onClick={() =>
              setIsAddUmaOpen(true)
            }
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-sky-400/35 bg-sky-400/[0.06] px-3.5 text-xs font-bold text-sky-200 transition hover:border-sky-300/60 hover:bg-sky-400/[0.12] hover:text-white"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>

            Add Custom Uma
          </button>

        </div>

        {/* SOURCE FILTER */}
        {statusFilter === "active" && (
          <div className="flex items-center gap-2 border-t border-white/[0.06] px-4 py-2">

            <span className="mr-1 text-[9px] font-black uppercase tracking-[0.15em] text-blue-100/25">
              Source
            </span>

            <button
              type="button"
              onClick={() =>
                setShowOfficial(
                  (current) => !current
                )
              }
              className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[10px] font-bold transition ${
                showOfficial
                  ? "border-emerald-300/25 bg-emerald-400/[0.07] text-emerald-200"
                  : "border-white/[0.06] text-blue-100/25 hover:text-blue-100/50"
              }`}
            >
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
                <path d="M12 3 19 6v5c0 4.6-2.8 8-7 10-4.2-2-7-5.4-7-10V6Z" />
              </svg>

              Official
            </button>

            <button
              type="button"
              onClick={() =>
                setShowCustom(
                  (current) => !current
                )
              }
              className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[10px] font-bold transition ${
                showCustom
                  ? "border-violet-300/25 bg-violet-400/[0.07] text-violet-200"
                  : "border-white/[0.06] text-blue-100/25 hover:text-blue-100/50"
              }`}
            >
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
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />
              </svg>

              Custom
            </button>

          </div>
        )}
      </div>

      {/* UMA LIST */}
      <div className="space-y-4">

        {filteredCharacters.map((character) => {
          const characterVersions =
            getFilteredVersions(character.id)

          return (
            <div
              key={character.id}
              className="rounded-xl border border-white/[0.08] bg-[#0a1525]/72 px-3.5 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.14)] backdrop-blur-sm"
            >

              {/* CHARACTER */}
              <div className="mb-2 flex items-center justify-between border-b border-white/[0.06] pb-2">

                <div className="text-base font-black text-white">
                  {character.name}
                </div>

                {isCustomCharacter(character.id) ? (
                  <div className="flex items-center gap-1.5 rounded-md border border-violet-300/20 bg-violet-400/[0.06] px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-violet-200">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-3 w-3"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />
                    </svg>

                    Custom
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 rounded-md border border-emerald-300/20 bg-emerald-400/[0.06] px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-emerald-200">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-3 w-3"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M12 3 19 6v5c0 4.6-2.8 8-7 10-4.2-2-7-5.4-7-10V6Z" />
                    </svg>

                    Official
                  </div>
                )}

              </div>

              {/* OFFICIAL MATCH */}
              {isCustomCharacter(
                character.id
              ) &&
                hasOfficialCharacterMatch(
                  character.id
                ) && (
                  <div className="mb-3 text-xs font-semibold text-emerald-200/60">
                  Official version available
                </div>
                )}

              {/* VERSIONS */}
              <div className="flex flex-wrap gap-2">

                {characterVersions.map(
                  (version) => {
                    const custom =
                      isCustomVersion(
                        version.id
                      )

                    const used =
                      isVersionUsed(
                        version.id
                      )

                    return (
                      <div
                      key={version.id}
                      className="group flex min-w-[190px] items-center gap-2.5 rounded-lg border border-white/[0.07] bg-black/15 px-2.5 py-2 transition hover:border-sky-300/20 hover:bg-white/[0.025]"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-black/25">
                        {version.avatar ? (
                          <UmaAvatarImage
                            avatar={version.avatar}
                            alt={version.displayName}
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <span className="text-lg font-bold text-blue-100/20">
                            ?
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">

                          <span className="min-w-0 truncate text-sm font-bold text-white/90">
                            {version.displayName}
                          </span>

                          {custom ? (
                            <svg
                              viewBox="0 0 24 24"
                              className="h-3.5 w-3.5 shrink-0 text-violet-300/70"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />
                            </svg>
                          ) : (
                            <svg
                              viewBox="0 0 24 24"
                              className="h-3.5 w-3.5 shrink-0 text-emerald-300/70"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M12 3 19 6v5c0 4.6-2.8 8-7 10-4.2-2-7-5.4-7-10V6Z" />
                            </svg>
                          )}

                        </div>

                        {version.archived && (
                          <div className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-300/65">
                            Archived
                          </div>
                        )}
                      </div>

                      {custom && (
                      <div className="ml-1 flex shrink-0 items-center gap-1">

                        {/* UNARCHIVE */}
                        {version.archived && (
                          <button
                            type="button"
                            onClick={() =>
                              unarchiveVersion(version.id)
                            }
                            title="Unarchive"
                            aria-label={`Unarchive ${version.displayName}`}
                            className="flex h-7 w-7 items-center justify-center rounded-md border border-emerald-300/20 bg-emerald-400/[0.05] text-emerald-200/70 transition hover:border-emerald-300/40 hover:bg-emerald-400/[0.10] hover:text-emerald-100"
                          >
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
                              <path d="M4 7h16" />
                              <path d="M6 7l1-3h10l1 3" />
                              <path d="M6 7v13h12V7" />
                              <path d="m9 14 3-3 3 3" />
                              <path d="M12 11v6" />
                            </svg>
                          </button>
                        )}

                        {/* ARCHIVE */}
                        {!version.archived && used && (
                          <button
                            type="button"
                            onClick={() =>
                              archiveVersion(version.id)
                            }
                            title="Archive"
                            aria-label={`Archive ${version.displayName}`}
                            className="flex h-7 w-7 items-center justify-center rounded-md border border-amber-300/20 bg-amber-400/[0.05] text-amber-200/70 transition hover:border-amber-300/40 hover:bg-amber-400/[0.10] hover:text-amber-100"
                          >
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
                              <path d="M4 7h16" />
                              <path d="M6 7l1-3h10l1 3" />
                              <path d="M6 7v13h12V7" />
                              <path d="m9 13 3 3 3-3" />
                              <path d="M12 10v6" />
                            </svg>
                          </button>
                        )}

                        {/* DELETE */}
                        {!used && (
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteTarget({
                                versionId: version.id,
                                characterId: version.characterId,
                                displayName: version.displayName,
                              })
                            }
                            title="Delete"
                            aria-label={`Delete ${version.displayName}`}
                            className="flex h-7 w-7 items-center justify-center rounded-md border border-red-300/20 bg-red-400/[0.05] text-red-200/65 transition hover:border-red-300/40 hover:bg-red-400/[0.10] hover:text-red-100"
                          >
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
                              <path d="M4 7h16" />
                              <path d="M9 7V4h6v3" />
                              <path d="M6 7l1 13h10l1-13" />
                              <path d="M10 11v5" />
                              <path d="M14 11v5" />
                            </svg>
                          </button>
                        )}

                      </div>
                    )}
                    </div>
                    )
                  }
                )}

              </div>
            </div>
          )
        })}

      </div>

      {/* DELETE MODAL */}
        {deleteTarget && (
          <ModalPortal>
            <div
              className="fixed inset-0 z-200 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
              onClick={() => setDeleteTarget(null)}
            >
              <div
                className="w-full max-w-md overflow-hidden rounded-xl border border-red-300/15 bg-[#081321] shadow-[0_24px_70px_rgba(0,0,0,0.65)]"
                onClick={(e) => e.stopPropagation()}
              >
                {/* HEADER */}
                <div className="border-b border-white/[0.07] px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-300/20 bg-red-400/[0.06] text-red-200">
                      <svg
                        viewBox="0 0 24 24"
                        className="h-4.5 w-4.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M4 7h16" />
                        <path d="M9 7V4h6v3" />
                        <path d="M6 7l1 13h10l1-13" />
                        <path d="M10 11v5" />
                        <path d="M14 11v5" />
                      </svg>
                    </div>

                    <div>
                      <div className="text-[9px] font-black uppercase tracking-[0.16em] text-red-200/45">
                        Custom Uma
                      </div>

                      <h2 className="mt-0.5 text-lg font-black text-white">
                        Delete Version
                      </h2>
                    </div>
                  </div>
                </div>

                {/* CONTENT */}
                <div className="px-5 py-4">
                  <div className="text-sm text-blue-100/55">
                    This version will be permanently removed from your database.
                  </div>

                  <div className="mt-4 flex items-center gap-3 rounded-lg border border-white/[0.07] bg-black/20 px-3 py-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md border border-violet-300/15 bg-violet-400/[0.05] text-violet-200">
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
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />
                      </svg>
                    </div>

                    <div className="font-bold text-white/90">
                      {deleteTarget.displayName}
                    </div>
                  </div>

                  <div className="mt-3 border-l-2 border-red-400/35 bg-red-400/[0.035] px-3 py-2 text-xs font-medium text-red-100/55">
                    This Uma has never been used in a Champions Meeting, so it can be safely deleted.
                  </div>
                </div>

                {/* ACTIONS */}
                <div className="flex justify-end gap-2 border-t border-white/[0.06] px-5 py-3">
                  <button
                    type="button"
                    onClick={() =>
                      setDeleteTarget(null)
                    }
                    className="rounded-lg border border-white/[0.08] px-4 py-2 text-xs font-bold text-blue-100/55 transition hover:bg-white/[0.04] hover:text-white"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      deleteCustomVersion(
                        deleteTarget.versionId,
                        deleteTarget.characterId
                      )
                    }
                    className="rounded-lg border border-red-300/25 bg-red-400/[0.06] px-4 py-2 text-xs font-bold text-red-200 transition hover:border-red-300/45 hover:bg-red-400/[0.12] hover:text-red-100"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </ModalPortal>
        )}

      {/* ADD UMA MODAL */}
      {isAddUmaOpen && (
        <AddUmaModal
          onClose={() =>
            setIsAddUmaOpen(false)
          }
        />
      )}

    </div>
  )
}

export default UmaDatabase