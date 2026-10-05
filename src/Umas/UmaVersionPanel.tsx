import { useEffect, useId, useRef, useState } from "react"
import ModalPortal from "../components/ModalPortal"
import UmaAvatarImage from "../components/UmaAvatarImage"
import type { UmaVersion } from "../types/types"
import type { CharacterEntry } from "./UmaCharacterBrowser"
import UmaDatabaseIcon from "./UmaDatabaseIcon"

type Props = {
  entry: CharacterEntry
  hasOfficialMatch: boolean
  isCustomVersion: (id: string) => boolean
  isVersionUsed: (id: string) => boolean
  onArchive: (id: string) => void
  onUnarchive: (id: string) => void
  onDelete: (version: UmaVersion) => void
  onBack: () => void
  mobileDetailsOpen: boolean
}

type VersionActionsProps = {
  version: UmaVersion
  used: boolean
  onClose: () => void
  onArchive: (id: string) => void
  onUnarchive: (id: string) => void
  onDelete: (version: UmaVersion) => void
}

function VersionActions({
  version,
  used,
  onClose,
  onArchive,
  onUnarchive,
  onDelete,
}: VersionActionsProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    return () => {
      dialog?.close()
    }
  }, [])

  const actionClass =
    "flex min-h-12 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-semibold transition hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-cyan-300"

  return (
    <ModalPortal>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onCancel={(event) => {
          event.preventDefault()
          onClose()
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose()
        }}
        className="fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-sm overflow-y-auto rounded-xl border border-sky-300/20 bg-[#081321] p-0 text-white shadow-2xl backdrop:bg-black/65 backdrop:backdrop-blur-sm"
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/[0.07] px-4 py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-violet-200/65">
              Custom version
            </p>
            <h3 id={titleId} className="mt-1 break-words text-base font-bold">
              {version.displayName}
            </h3>
          </div>
          <button
            type="button"
            aria-label="Close version actions"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-blue-100/60 hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:outline-cyan-300"
          >
            <UmaDatabaseIcon name="close" />
          </button>
        </div>
        <div className="space-y-1 p-2">
          {version.archived ? (
            <button
              type="button"
              onClick={() => {
                onUnarchive(version.id)
                onClose()
              }}
              className={`${actionClass} text-emerald-200`}
            >
              <UmaDatabaseIcon name="restore" />
              Unarchive
            </button>
          ) : (
            used && (
              <button
                type="button"
                onClick={() => {
                  onArchive(version.id)
                  onClose()
                }}
                className={`${actionClass} text-amber-200`}
              >
                <UmaDatabaseIcon name="archive" />
                Archive
              </button>
            )
          )}
          <button
            type="button"
            disabled={used}
            onClick={() => {
              onClose()
              onDelete(version)
            }}
            className={`${actionClass} text-red-200 disabled:cursor-not-allowed disabled:text-blue-100/30 disabled:hover:bg-transparent`}
          >
            <UmaDatabaseIcon name="delete" />
            Delete
          </button>
          {used && (
            <p className="px-3 pb-2 text-xs leading-relaxed text-blue-100/55">
              This version is used in a Champions Meeting and cannot be deleted.
            </p>
          )}
        </div>
        <div className="border-t border-white/[0.07] p-3">
          <button
            type="button"
            onClick={onClose}
            className="min-h-10 w-full rounded-lg border border-sky-200/15 bg-sky-400/[0.04] text-xs font-bold text-sky-200 hover:bg-sky-400/10 focus-visible:outline-2 focus-visible:outline-cyan-300"
          >
            Cancel
          </button>
        </div>
      </dialog>
    </ModalPortal>
  )
}

export default function UmaVersionPanel({
  entry,
  hasOfficialMatch,
  isCustomVersion,
  isVersionUsed,
  onArchive,
  onUnarchive,
  onDelete,
  onBack,
  mobileDetailsOpen,
}: Props) {
  const { character, versions, custom } = entry
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(
    null
  )
  const [actionVersionId, setActionVersionId] = useState<string | null>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const selectedVersion =
    versions.find((version) => version.id === selectedVersionId) ?? versions[0]
  const actionVersion = versions.find(
    (version) => version.id === actionVersionId
  )

  useEffect(() => {
    if (mobileDetailsOpen && window.matchMedia("(max-width: 1023px)").matches) {
      headingRef.current?.focus({ preventScroll: true })
    }
  }, [mobileDetailsOpen])

  return (
    <section aria-label={`${character.name} versions`} className="p-3 sm:p-4">
      <div className="mb-3 lg:hidden">
        <div className="mb-2 flex items-center gap-2 text-cyan-300">
          <UmaDatabaseIcon name="book" className="h-5 w-5" />
          <h1 className="text-base font-bold text-white">Uma Database</h1>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="-ml-2 flex min-h-10 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-sky-200 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-cyan-300"
        >
          <UmaDatabaseIcon name="back" />
          Back to list
        </button>
      </div>

      <div className="relative mx-auto flex h-[380px] w-full max-w-[380px] shrink-0 items-center justify-center overflow-hidden rounded-lg border border-sky-200/10 bg-[#06101e]/80 sm:h-[400px] sm:max-w-[400px] lg:aspect-square lg:h-auto lg:max-w-[292px]">
        {selectedVersion.avatar ? (
          <UmaAvatarImage
            avatar={selectedVersion.avatar}
            alt={selectedVersion.displayName}
            className="absolute inset-0 h-full w-full object-contain object-center p-0.5 lg:object-bottom lg:p-[0.775%]"
          />
        ) : (
          <span className="text-6xl font-black text-sky-200/20">
            {character.name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="mt-4 break-words text-2xl font-black tracking-tight text-white outline-none"
      >
        {character.name}
      </h2>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="mr-1 text-blue-100/65">
          {versions.length} {versions.length === 1 ? "version" : "versions"}
        </span>
        <span
          className={`rounded-md border px-2 py-1 font-bold ${custom ? "border-violet-300/25 bg-violet-400/[0.05] text-violet-200" : "border-emerald-300/25 bg-emerald-400/[0.05] text-emerald-200"}`}
        >
          {custom ? "Custom" : "Official"}
        </span>
        <span
          className={`rounded-md border px-2 py-1 font-semibold ${selectedVersion.archived ? "border-amber-300/25 bg-amber-400/[0.05] text-amber-200" : "border-sky-300/25 bg-sky-400/[0.05] text-sky-200"}`}
        >
          {selectedVersion.archived ? "Archived" : "Active"}
        </span>
      </div>
      {custom && hasOfficialMatch && (
        <p className="mt-3 text-xs font-medium text-emerald-200/70">
          Official version available
        </p>
      )}

      <div className="mb-3 mt-5 flex items-center gap-2 border-t border-white/[0.07] pt-4">
        <UmaDatabaseIcon name="list" className="h-4 w-4 text-sky-200/60" />
        <h3 className="text-xs font-bold text-blue-100/85">Versions</h3>
        <span className="ml-auto text-[11px] text-blue-100/40">
          {versions.length}
        </span>
      </div>
      <div className="space-y-2">
        {versions.map((version) => {
          const versionCustom = isCustomVersion(version.id)
          const selected = selectedVersion.id === version.id
          return (
            <div
              key={version.id}
              className={`flex min-w-0 items-center gap-1 rounded-lg border transition ${selected ? "border-cyan-400/45 bg-cyan-400/[0.04]" : "border-sky-200/15 bg-black/15 hover:border-sky-300/25"}`}
            >
              <button
                type="button"
                onClick={() => setSelectedVersionId(version.id)}
                aria-pressed={selected}
                aria-label={`Select ${version.displayName}`}
                className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-2 text-left focus-visible:outline-2 focus-visible:outline-cyan-300"
              >
                <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/[0.07] bg-sky-300/[0.04]">
                  {version.avatar ? (
                    <UmaAvatarImage
                      avatar={version.avatar}
                      alt=""
                      className="h-full w-full object-cover object-top"
                    />
                  ) : (
                    <span className="text-xl font-bold text-sky-200/30">
                      {character.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block break-words text-xs font-bold leading-relaxed text-white/90">
                    {version.displayName}
                  </span>
                  <span className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px]">
                    <span className="rounded-md border border-sky-200/10 bg-sky-400/[0.04] px-1.5 py-0.5 text-blue-100/75">
                      {version.versionName}
                    </span>
                    <span
                      className={`rounded-full border px-2 py-0.5 font-semibold ${version.archived ? "border-amber-300/20 bg-amber-400/[0.05] text-amber-200" : "border-emerald-300/25 bg-emerald-400/[0.05] text-emerald-200"}`}
                    >
                      {version.archived ? "Archived" : "Active"}
                    </span>
                    {versionCustom && (
                      <span className="text-violet-200/75">Custom</span>
                    )}
                  </span>
                </span>
              </button>
              {versionCustom && (
                <button
                  type="button"
                  aria-label={`Actions for ${version.displayName}`}
                  aria-haspopup="dialog"
                  onClick={() => setActionVersionId(version.id)}
                  className="mr-2 flex h-11 w-9 shrink-0 items-center justify-center rounded-lg border border-sky-200/10 text-sky-200/70 transition hover:border-cyan-300/40 hover:bg-cyan-400/10 hover:text-cyan-200 focus-visible:outline-2 focus-visible:outline-cyan-300"
                >
                  <UmaDatabaseIcon name="more" />
                </button>
              )}
            </div>
          )
        })}
      </div>

      {actionVersion && isCustomVersion(actionVersion.id) && (
        <VersionActions
          version={actionVersion}
          used={isVersionUsed(actionVersion.id)}
          onClose={() => setActionVersionId(null)}
          onArchive={onArchive}
          onUnarchive={onUnarchive}
          onDelete={onDelete}
        />
      )}
    </section>
  )
}
