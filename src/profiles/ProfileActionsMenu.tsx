import { useEffect, useId, useRef, useState } from "react"
import type { Profile } from "./profileStore"

export default function ProfileActionsMenu({ profile, onRename, onRestore, onDelete }: {
  profile: Profile
  onRename: () => void
  onRestore: () => void
  onDelete: () => void
}) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const sheetRef = useRef<HTMLDialogElement>(null)
  const menuId = useId()
  const [open, setOpen] = useState<{ mobile: boolean; top: number; left: number } | null>(null)

  useEffect(() => {
    if (!open) return
    const menu = menuRef.current
    const sheet = sheetRef.current
    if (open.mobile) sheet?.showModal()
    else { menu?.showPopover(); menu?.querySelector<HTMLButtonElement>("button")?.focus() }
    return () => { menu?.hidePopover(); sheet?.close() }
  }, [open])

  const choose = (action: () => void) => { setOpen(null); action() }
  const actions = <>
    <button type="button" role={open?.mobile ? undefined : "menuitem"} onClick={() => choose(onRename)} className="w-full rounded-lg px-3 py-3 text-left text-xs font-bold text-blue-100/80 hover:bg-violet-400/10 focus-visible:bg-violet-400/10 focus-visible:outline-2 focus-visible:outline-violet-300">Rename</button>
    <button type="button" role={open?.mobile ? undefined : "menuitem"} onClick={() => choose(onRestore)} className="w-full rounded-lg px-3 py-3 text-left text-xs font-bold text-blue-100/80 hover:bg-violet-400/10 focus-visible:bg-violet-400/10 focus-visible:outline-2 focus-visible:outline-violet-300">Restore from Backup</button>
    <div role="separator" className="my-1 border-t border-white/[0.07]" />
    <button type="button" role={open?.mobile ? undefined : "menuitem"} onClick={() => choose(onDelete)} className="w-full rounded-lg px-3 py-3 text-left text-xs font-bold text-red-200 hover:bg-red-400/10 focus-visible:bg-red-400/10 focus-visible:outline-2 focus-visible:outline-red-300">Delete</button>
  </>

  return <>
    <button
      ref={triggerRef}
      type="button"
      aria-label={`Profile actions for ${profile.name}`}
      aria-haspopup={open?.mobile ? "dialog" : "menu"}
      aria-expanded={!!open}
      aria-controls={open ? menuId : undefined}
      onClick={() => {
        if (open) { setOpen(null); return }
        const rect = triggerRef.current!.getBoundingClientRect()
        setOpen({
          mobile: window.matchMedia("(max-width: 767px), (pointer: coarse)").matches,
          top: rect.bottom + 168 > innerHeight ? Math.max(8, rect.top - 160) : rect.bottom + 8,
          left: Math.max(8, Math.min(rect.right - 216, innerWidth - 224)),
        })
      }}
      className="flex h-10 w-10 items-center justify-center rounded-md border border-white/[0.07] bg-white/[0.02] text-lg font-bold text-blue-100/50 transition hover:border-violet-300/25 hover:text-violet-200 focus-visible:outline-2 focus-visible:outline-violet-300 md:h-8 md:w-8"
    >
      <span aria-hidden="true">⋯</span>
    </button>
    {open?.mobile ? <dialog
      ref={sheetRef}
      id={menuId}
      aria-label={`Profile actions for ${profile.name}`}
      onCancel={(event) => { event.preventDefault(); setOpen(null) }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return
        const rect = event.currentTarget.getBoundingClientRect()
        if (event.clientY < rect.top || event.clientY > rect.bottom || event.clientX < rect.left || event.clientX > rect.right) setOpen(null)
      }}
      className="fixed inset-x-0 bottom-0 top-auto m-0 max-h-[80dvh] w-full max-w-none overflow-y-auto rounded-t-2xl border border-violet-300/20 bg-[#07111f] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-white shadow-2xl backdrop:bg-black/75"
    >
      <div className="mb-3 flex items-center gap-3 border-b border-white/[0.07] pb-3">
        <div className="min-w-0 flex-1">
          <h2 className="break-words text-lg font-black">{profile.name}</h2>
          <p className="mt-1 text-xs text-blue-100/50">Profile actions</p>
        </div>
        <button type="button" aria-label="Close profile actions" onClick={() => setOpen(null)} className="h-10 w-10 shrink-0 rounded-lg border border-white/10 text-lg text-blue-100/70">×</button>
      </div>
      <div className="[&>button]:min-h-12">{actions}</div>
    </dialog> : open && <div
      ref={menuRef}
      id={menuId}
      popover="auto"
      role="menu"
      aria-label={`Profile actions for ${profile.name}`}
      onToggle={(event) => { if (event.newState === "closed") setOpen(null) }}
      onKeyDown={(event) => {
        if (event.key === "Escape") { setOpen(null); triggerRef.current?.focus(); return }
        if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return
        event.preventDefault()
        const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button"))
        const index = items.indexOf(document.activeElement as HTMLButtonElement)
        const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1
          : (index + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length
        items[next]?.focus()
      }}
      style={{ top: open.top, left: open.left }}
      className="fixed m-0 w-[216px] rounded-xl border border-violet-300/20 bg-[#07111f] p-1.5 text-white shadow-2xl"
    >{actions}</div>}
  </>
}
