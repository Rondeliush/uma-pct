type UpdateNotificationProps = {
  umaNames: string[]
  onViewUpdate: () => void
}

function UpdateNotification({
  umaNames,
  onViewUpdate,
}: UpdateNotificationProps) {
  if (umaNames.length === 0) {
    return null
  }

  let message = ""

  if (umaNames.length === 1) {
    message = `New Official Uma: ${umaNames[0]}`
  } else if (umaNames.length === 2) {
    message = `2 new Official Umas: ${umaNames[0]}, ${umaNames[1]}`
  } else {
    message = `${umaNames.length} new Official Umas available`
  }

  return (
    <div className="w-full border-b border-sky-400/[0.12] bg-[#050b15]/88 shadow-[0_4px_18px_rgba(0,0,0,0.20)] backdrop-blur-xl">
      <div className="mx-auto flex h-9 max-w-4xl items-center justify-between gap-4 px-4">

        <div className="flex min-w-0 items-center gap-2.5">

          {/* NEW BADGE */}
          <div className="flex h-5 shrink-0 items-center rounded border border-sky-300/25 bg-sky-400/[0.10] px-1.5 text-[8px] font-black uppercase tracking-[0.12em] text-sky-200">
            New
          </div>

          <span className="shrink-0 text-sm font-bold text-white/90">
            Uma Database updated
          </span>

          <span className="text-blue-100/20">
            ·
          </span>

          <span className="truncate text-xs font-medium text-blue-100/45">
            {message}
          </span>

        </div>

        <button
          type="button"
          onClick={onViewUpdate}
          className="shrink-0 rounded-md border border-sky-400/35 bg-sky-400/[0.06] px-3 py-1 text-[10px] font-bold text-sky-200 transition hover:border-sky-300/60 hover:bg-sky-400/[0.12] hover:text-white"
        >
          View Update
        </button>

      </div>
    </div>
  )
}

export default UpdateNotification