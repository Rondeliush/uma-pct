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
    <div className="app-nav-update">
      <div className="app-nav-update-inner">

        <div className="app-nav-update-copy">

          {/* NEW BADGE */}
          <div className="app-nav-update-badge flex h-5 shrink-0 items-center rounded border px-1.5 text-[8px] font-black uppercase tracking-[0.12em]">
            New
          </div>

          <span className="app-nav-update-title shrink-0 text-sm font-bold">
            Uma Database updated
          </span>

          <span className="app-nav-update-separator app-nav-muted">
            ·
          </span>

          <span className="app-nav-update-message app-nav-muted truncate text-xs font-medium">
            {message}
          </span>

        </div>

        <button
          type="button"
          onClick={onViewUpdate}
          className="app-nav-update-button shrink-0 rounded-md border px-3 py-1 text-[10px] font-bold transition"
        >
          View Update
        </button>

      </div>
    </div>
  )
}

export default UpdateNotification
