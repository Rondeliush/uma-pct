import { useEffect, useRef } from "react"
import type { ReactNode } from "react"
import ModalPortal from "../ModalPortal"

type Props = { eventType?: "CM" | "LoH"; mode?: "create" | "edit"; children: ReactNode; onClose: () => void; onCreate: () => void; canCreate: boolean; isSaved?: boolean }

export default function EventCreationModal({ eventType = "CM", mode = "create", children, onClose, onCreate, canCreate, isSaved }: Props) {
  const isLoHEdit = eventType === "LoH" && mode === "edit"
  const title = mode === "edit" ? `Edit ${eventType}` : eventType === "CM" ? "Add CM" : "Add LoH"
  const subtitle = mode === "edit" ? "Update your League of Heroes card" : eventType === "CM" ? "Create a new Champions Meeting card" : "Create a new League of Heroes card"
  const dialogRef = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    if (eventType !== "LoH") return
    const dialog = dialogRef.current
    const previousOverflow = document.body.style.overflow
    dialog?.showModal()
    document.body.style.overflow = "hidden"
    return () => { dialog?.close(); document.body.style.overflow = previousOverflow }
  }, [eventType])
  const contents = <>
    <div className="pointer-events-none absolute inset-0 z-0">


      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(2,8,23,0.98)_0%,rgba(5,18,42,0.96)_48%,rgba(13,15,45,0.96)_100%)]" />

      <div className={`absolute -left-32 top-1/3 h-[520px] w-[420px] rounded-full blur-[110px] ${eventType === "LoH" ? "bg-rose-700/15" : "bg-blue-700/15"}`} />

      <div className={`absolute -right-28 top-1/4 h-[520px] w-[420px] rounded-full blur-[120px] ${eventType === "LoH" ? "bg-rose-700/12" : "bg-violet-700/12"}`} />

      <div className={`absolute inset-x-[15%] bottom-[-100px] h-[220px] rounded-full blur-[90px] ${eventType === "LoH" ? "bg-rose-700/12" : "bg-blue-700/12"}`} />

      <div className={`absolute right-20 top-0 h-48 w-96 skew-x-[-28deg] ${eventType === "LoH" ? "bg-rose-500/[0.035]" : "bg-blue-500/[0.035]"}`} />

      <div className={`absolute right-44 top-0 h-48 w-40 skew-x-[-28deg] ${eventType === "LoH" ? "bg-rose-500/[0.035]" : "bg-violet-500/[0.035]"}`} />
    </div>
    <div className={`relative z-10 shrink-0 border-b px-8 py-5 ${eventType === "LoH" ? "border-rose-900/60" : "border-blue-900/60"}`}>
      <div className={`pointer-events-none absolute inset-x-[28%] bottom-0 h-px bg-gradient-to-r from-transparent to-transparent ${eventType === "LoH" ? "via-rose-400/80" : "via-sky-400/80"}`} />

      <div className="flex items-center justify-between">
        <div className="hidden w-52 lg:block">
        </div>

        <div className="text-center">
          <div className={`bg-gradient-to-r via-white bg-clip-text text-4xl font-black tracking-tight text-transparent ${eventType === "LoH" ? "from-rose-200 to-rose-200" : "from-blue-200 to-violet-200"}`}>
            {title}
          </div>

          <div className={`mt-1 text-sm font-medium ${eventType === "LoH" ? "text-rose-200/60" : "text-blue-200/60"}`}>
            {subtitle}
          </div>
        </div>

        <div className="flex w-52 justify-end">
          <button
            type="button"
            onClick={onClose}
            className={`flex h-11 w-11 items-center justify-center rounded-xl border bg-[#081427] text-xl text-gray-400 transition hover:text-white ${eventType === "LoH" ? "border-rose-800/70 hover:border-rose-500 hover:bg-rose-950" : "border-blue-800/70 hover:border-sky-500 hover:bg-blue-950"}`}
            aria-label={`Close ${title}`}
          >
            ×
          </button>
        </div>
      </div>
    </div>
    <div className="add-cm-scrollbar relative z-10 min-h-0 flex-1 overflow-y-auto px-7 pb-3 pt-6">
      {children}
      <div className="mt-5 grid grid-cols-2 gap-3 pb-3 md:flex md:items-center md:justify-end md:gap-2.5">

        {isLoHEdit && isSaved !== undefined && <div role="status" aria-live="polite" aria-atomic="true" className="col-span-2 min-h-8 text-right text-xs font-bold text-emerald-300/80 md:col-auto md:mr-2 md:min-w-[80px]">
          {isSaved && <div className="mr-1 flex h-8 items-center gap-1.5 rounded-lg border border-emerald-400/20 bg-emerald-400/[0.06] px-3 text-xs font-bold text-emerald-300">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>
            Saved
          </div>}
        </div>}

        {/* CANCEL */}
        <button
          type="button"
          onClick={onClose}
          className="
      flex h-11 w-full
      md:h-10 md:w-auto md:min-w-[100px]
      items-center justify-center
      rounded-lg
      border border-white/10
      bg-[#081426]/70
      px-5
      text-sm font-bold text-white/55
      shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]
      transition-all duration-200

      hover:border-white/20
      hover:bg-white/[0.04]
      hover:text-white/85
      hover:shadow-[0_0_14px_rgba(255,255,255,0.04)]

      active:scale-[0.98]
    "
        >
          Cancel
        </button>

        {/* ADD CM */}
        <button
          type="button"
          onClick={onCreate}
          disabled={!canCreate}
          className={`flex h-11 w-full md:h-10 md:w-auto md:min-w-[124px] items-center justify-center gap-2 rounded-lg border bg-gradient-to-r ${isLoHEdit ? "px-3 md:px-5" : "px-5"} text-sm font-extrabold text-white shadow-[ inset_0_1px_0_rgba(255,255,255,0.14) ] transition-all duration-200 hover:brightness-110 hover:shadow-[ inset_0_1px_0_rgba(255,255,255,0.16) ] active:scale-[0.98] disabled:cursor-not-allowed disabled:border-white/10 disabled:from-[#10182a] disabled:via-[#12192d] disabled:to-[#17152e] disabled:text-white/25 disabled:shadow-none disabled:hover:brightness-100 disabled:active:scale-100 ${eventType === "LoH" ? "border-rose-300/45 from-rose-600 via-rose-600 to-rose-600 0_0_16px_rgba(244,63,94,0.16), 0_0_24px_rgba(244,63,94,0.12), hover:border-rose-200/70 0_0_20px_rgba(244,63,94,0.24), 0_0_30px_rgba(244,63,94,0.18)," : "border-cyan-300/45 from-cyan-600 via-blue-600 to-violet-600 0_0_16px_rgba(34,211,238,0.16), 0_0_24px_rgba(124,58,237,0.12), hover:border-cyan-200/70 0_0_20px_rgba(34,211,238,0.24), 0_0_30px_rgba(124,58,237,0.18),"}`}
        >
          <svg
            viewBox="0 0 24 24"
            className={isLoHEdit ? "h-4 w-4 shrink-0" : "h-4 w-4"}
            fill="none"
            stroke="currentColor"
            strokeWidth={isLoHEdit ? "2" : "2.2"}
            strokeLinecap="round"
            strokeLinejoin={isLoHEdit ? "round" : undefined}
            aria-hidden="true"
          >
            {isLoHEdit ? <>
              <path d="M5 4h12l2 2v14H5V4Z" />
              <path d="M8 4v6h8V4" />
              <path d="M8 20v-6h8v6" />
            </> : <>
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </>}
          </svg>

          {mode === "edit" ? "Save Changes" : title}
        </button>

      </div>
    </div>
  </>
  return <ModalPortal>
    {eventType === "LoH" ? <dialog ref={dialogRef} aria-label={title} onCancel={event => { event.preventDefault(); onClose() }} className="hidden open:flex max-h-[94vh] max-w-[1480px] flex-col overflow-hidden rounded-[24px] border border-rose-500/50 bg-[#06101f] shadow-[0_0_30px_rgba(244,63,94,0.18),0_30px_90px_rgba(0,0,0,0.65)] fixed inset-0 m-auto w-[calc(100%-1.5rem)] p-0 text-white backdrop:bg-black/80 backdrop:backdrop-blur-sm">
      {contents}
    </dialog> : <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-label={title} className="relative flex max-h-[94vh] w-full max-w-[1480px] flex-col overflow-hidden rounded-[24px] border border-sky-500/50 bg-[#06101f] shadow-[0_0_30px_rgba(14,165,233,0.18),0_30px_90px_rgba(0,0,0,0.65)]">{contents}</div>
    </div>}
  </ModalPortal>
}
