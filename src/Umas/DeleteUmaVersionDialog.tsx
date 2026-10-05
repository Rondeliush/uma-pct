import { useEffect, useId, useRef } from "react"
import ModalPortal from "../components/ModalPortal"
import UmaDatabaseIcon from "./UmaDatabaseIcon"

type Props = {
  displayName: string
  onClose: () => void
  onConfirm: () => void
}

export default function DeleteUmaVersionDialog({
  displayName,
  onClose,
  onConfirm,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    return () => {
      dialog?.close()
    }
  }, [])

  return (
    <ModalPortal>
      <dialog
        ref={dialogRef}
        role="alertdialog"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onCancel={(event) => {
          event.preventDefault()
          onClose()
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose()
        }}
        className="fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-xl border border-red-300/20 bg-[#081321] p-0 text-white shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-sm"
      >
        <div className="flex items-center gap-3 border-b border-white/[0.07] px-5 py-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-red-300/20 bg-red-400/[0.06] text-red-200">
            <UmaDatabaseIcon name="delete" className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-red-200/60">
              Custom Uma
            </p>
            <h2 id={titleId} className="mt-1 text-lg font-black">
              Delete Version
            </h2>
          </div>
        </div>
        <div className="px-5 py-4">
          <p
            id={descriptionId}
            className="text-sm leading-relaxed text-blue-100/65"
          >
            This version will be permanently removed from your database.
          </p>
          <p className="mt-4 break-words rounded-lg border border-white/[0.07] bg-black/20 p-3 text-sm font-bold">
            {displayName}
          </p>
          <p className="mt-3 border-l-2 border-red-400/35 bg-red-400/[0.035] px-3 py-2 text-xs leading-relaxed text-red-100/65">
            This Uma has never been used in a Champions Meeting, so it can be
            safely deleted.
          </p>
        </div>
        <div className="flex justify-end gap-2 border-t border-white/[0.07] px-5 py-3">
          <button
            type="button"
            autoFocus
            onClick={onClose}
            className="min-h-10 rounded-lg border border-white/15 px-4 text-xs font-bold text-blue-100/70 hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:outline-cyan-300"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-10 rounded-lg border border-red-300/30 bg-red-400/10 px-4 text-xs font-bold text-red-200 hover:bg-red-400/20 focus-visible:outline-2 focus-visible:outline-red-300"
          >
            Delete
          </button>
        </div>
      </dialog>
    </ModalPortal>
  )
}
