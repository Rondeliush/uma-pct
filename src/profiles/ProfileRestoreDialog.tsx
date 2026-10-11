import { useEffect, useId, useRef } from "react"
import ModalPortal from "../components/ModalPortal"
import type { Profile } from "./profileStore"
import type { ImportedProfileFile } from "./profileTransfer"

export default function ProfileRestoreDialog({ profile, file, restoring, onCancel, onConfirm }: {
  profile: Profile
  file: ImportedProfileFile
  restoring: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descriptionId = useId()
  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    return () => { dialog?.close() }
  }, [])
  const foreign = file.profile.sourceProfileId !== (profile.sourceProfileId ?? profile.id)

  return <ModalPortal><dialog
    ref={dialogRef}
    aria-labelledby={titleId}
    aria-describedby={descriptionId}
    aria-busy={restoring}
    onCancel={(event) => { event.preventDefault(); if (!restoring) onCancel() }}
    className="fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-red-300/20 bg-[#07111f] p-0 text-white shadow-2xl backdrop:bg-black/75 backdrop:backdrop-blur-sm"
  >
    <div className="border-b border-white/[0.07] px-6 py-5">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-100/50">Profile Tools</p>
      <h2 id={titleId} className="mt-2 text-xl font-black">Restore profile from backup?</h2>
    </div>
    <div className="space-y-4 px-6 py-5 text-sm leading-6 text-blue-100/75">
      <p id={descriptionId}>This will replace the current data in <strong className="break-words text-white">“{profile.name}”</strong> with the data from the selected backup.</p>
      <dl className="rounded-xl border border-white/[0.07] bg-black/15 px-4 py-3">
        <dt className="text-[10px] font-bold uppercase tracking-wide text-blue-100/40">Profile in backup</dt>
        <dd className="mb-2 break-words font-bold text-white">{file.profile.name}</dd>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <div><dt className="inline">Champions Meetings: </dt><dd className="inline font-bold text-white">{file.data.cms.length}</dd></div>
          <div><dt className="inline">League of Heroes: </dt><dd className="inline font-bold text-white">{file.data.lohs.length}</dd></div>
          <div><dt className="inline">Custom Umas: </dt><dd className="inline font-bold text-white">{file.data.customUmaDatabase.customVersions.length}</dd></div>
        </div>
      </dl>
      {foreign && <p className="rounded-xl border border-amber-300/20 bg-amber-400/5 px-4 py-3 text-xs leading-5 text-amber-200">This backup was created from a different profile. Restoring it will replace the current profile data, but this profile's identity will be kept.</p>}
      <p className="text-xs leading-5 text-red-200">Your current profile data will be overwritten. This cannot be undone unless you have another backup.</p>
    </div>
    <div className="flex flex-wrap justify-end gap-2 border-t border-white/[0.07] px-6 py-4">
      <button type="button" autoFocus disabled={restoring} onClick={onCancel} className="rounded-lg border border-white/[0.08] px-4 py-2 text-xs font-bold text-blue-100/60 hover:text-white disabled:opacity-40">Cancel</button>
      <button type="button" disabled={restoring} onClick={onConfirm} className="rounded-lg border border-red-300/25 bg-red-400/[0.08] px-4 py-2 text-xs font-black text-red-200 hover:border-red-300/45 hover:bg-red-400/[0.14] disabled:opacity-40">{restoring ? "Restoring..." : "Restore Profile"}</button>
    </div>
  </dialog></ModalPortal>
}
