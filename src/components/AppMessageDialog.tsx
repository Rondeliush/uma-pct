import { useEffect, useId, useRef } from "react"
import ModalPortal from "./ModalPortal"

type Props = {
  title: string
  message: string
  onClose: () => void
}

export default function AppMessageDialog({ title, message, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const messageId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    return () => { dialog?.close() }
  }, [])

  return <ModalPortal>
    <dialog
      ref={dialogRef}
      role="alertdialog"
      aria-labelledby={titleId}
      aria-describedby={messageId}
      onCancel={(event) => { event.preventDefault(); onClose() }}
      className="fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl border border-violet-300/25 bg-[#07111f] p-0 text-white shadow-2xl backdrop:bg-black/75 backdrop:backdrop-blur-sm"
    >
      <div className="border-b border-white/[0.07] px-6 py-5">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-300/60">UmaPCT</p>
        <h2 id={titleId} className="mt-2 text-xl font-black">{title}</h2>
      </div>
      <p id={messageId} className="whitespace-pre-line break-words px-6 py-5 text-sm leading-6 text-blue-100/75">{message}</p>
      <div className="flex justify-end border-t border-white/[0.07] px-6 py-4">
        <button type="button" onClick={onClose} className="rounded-xl border border-violet-300/25 bg-violet-400/15 px-6 py-2 text-sm font-bold text-violet-100 hover:bg-violet-400/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300">OK</button>
      </div>
    </dialog>
  </ModalPortal>
}
