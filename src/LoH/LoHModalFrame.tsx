import { useEffect, useId, useRef } from "react"
import type { ReactNode, RefObject } from "react"
import ModalPortal from "../components/ModalPortal"

type Props = {
  title: string
  onClose: () => void
  children: ReactNode
  variant?: "default" | "notes" | "day" | "editor"
  anchorRef?: RefObject<HTMLElement | null>
  fitContent?: boolean
}

export default function LoHModalFrame({ title, onClose, children, variant = "default", anchorRef, fitContent = false }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    const previousOverflow = document.body.style.overflow
    // Nested dialogs must not restore a lock owned by their parent after it unmounts.
    const ownsScrollLock = !document.querySelector("dialog[open]")
    dialog?.showModal()
    if (ownsScrollLock) document.body.style.overflow = "hidden"
    const positionEditor = () => {
      const anchor = anchorRef?.current
      if (variant !== "editor" || !dialog || !anchor) return
      const area = anchor.getBoundingClientRect()
      const parent = anchor.closest("dialog")?.getBoundingClientRect()
      const parentTop = Math.max(12, (parent?.top ?? 0) + 12)
      const parentBottom = Math.min(window.innerHeight - 12, (parent?.bottom ?? window.innerHeight) - 12)
      let top = Math.max(parentTop, area.top)
      let bottom = Math.min(parentBottom, area.bottom)
      const left = Math.max(12, (parent?.left ?? area.left) + 12)
      const right = Math.min(window.innerWidth - 12, (parent?.right ?? area.right) - 12)
      dialog.style.width = `${Math.min(760, right - left)}px`
      const contentHeight = dialog.scrollHeight + dialog.offsetHeight - dialog.clientHeight
      // Keep the form usable when the header leaves only a small part of Results visible.
      if (bottom - top < Math.min(440, parentBottom - parentTop) || (fitContent && contentHeight > bottom - top)) { top = parentTop; bottom = parentBottom }
      Object.assign(dialog.style, {
        top: `${(top + bottom) / 2}px`, left: `${(left + right) / 2}px`, bottom: "auto", right: "auto",
        margin: "0", transform: "translate(-50%, -50%)",
        width: `${Math.min(760, right - left)}px`, maxHeight: `${Math.max(1, bottom - top)}px`,
      })
    }
    positionEditor()
    const contentObserver = fitContent && variant === "editor" ? new ResizeObserver(positionEditor) : null
    if (dialog && contentObserver) {
      contentObserver.observe(dialog)
      for (const child of dialog.children) contentObserver.observe(child)
    }
    if (variant === "editor") window.addEventListener("resize", positionEditor)
    return () => {
      contentObserver?.disconnect()
      window.removeEventListener("resize", positionEditor)
      dialog?.close()
      if (ownsScrollLock) document.body.style.overflow = previousOverflow
    }
  }, [variant, anchorRef, fitContent])

  return (
    <ModalPortal>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onKeyDown={event => {
          if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose() }
        }}
        onCancel={event => { event.preventDefault(); event.stopPropagation(); onClose() }}
        className={`loh-scrollbar fixed inset-0 m-auto max-h-[95dvh] overflow-x-hidden border p-0 text-white shadow-2xl ${variant === "day" ? "hidden h-[min(860px,95dvh)] open:flex flex-col overflow-y-hidden" : "overflow-y-auto"} ${variant === "editor"
          ? "w-[calc(100%-3rem)] max-w-[760px] rounded-xl border-rose-400/25 bg-slate-950 backdrop:bg-black/35"
          : variant === "notes"
          ? "w-[calc(100%-2rem)] max-w-2xl rounded-2xl border-rose-900/70 bg-gray-950 backdrop:bg-black/70"
          : "w-[calc(100%-1.5rem)] max-w-[900px] rounded-[22px] border-rose-500/45 bg-slate-950 backdrop:bg-black/80 backdrop:backdrop-blur-sm"}`}
      >
        <h2 id={titleId} className="sr-only">{title}</h2>
        {children}
        {variant !== "notes" && variant !== "editor" && <button type="button" onClick={onClose} aria-label={`Close ${title}`} className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-slate-950/75 text-2xl text-rose-100/70 backdrop-blur-md transition hover:border-rose-300/40 hover:text-white focus-visible:outline-2 focus-visible:outline-rose-300">
          &times;
        </button>}
      </dialog>
    </ModalPortal>
  )
}
