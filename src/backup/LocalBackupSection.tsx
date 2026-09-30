import { useState, useSyncExternalStore } from "react"
import { localBackup, supportsAutomaticBackup } from "./localBackup"

const buttonClass = "rounded-xl border border-violet-300/20 bg-violet-400/10 px-4 py-2 text-xs font-bold text-violet-200 disabled:opacity-40"

export default function LocalBackupSection({ profileName }: { profileName: string }) {
  const state = useSyncExternalStore(localBackup.subscribe, localBackup.getSnapshot, localBackup.getSnapshot)
  const [working, setWorking] = useState(false)
  const supported = supportsAutomaticBackup()
  const busy = working || state.phase === "loading" || state.phase === "saving"
  const statusLabel = !supported ? "Unavailable" : {
    off: "Off",
    loading: "Loading...",
    ready: "On",
    pending: "Waiting to save",
    saving: "Saving...",
    permission: "Needs permission",
    error: "Paused",
  }[state.phase]
  const statusColor = !supported || state.phase === "permission" || state.phase === "error"
    ? "border-amber-300/20 bg-amber-400/10 text-amber-200"
    : state.phase === "ready"
      ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-200"
      : state.phase === "pending" || state.phase === "saving"
        ? "border-sky-300/20 bg-sky-400/10 text-sky-200"
        : "border-white/10 bg-white/5 text-blue-100/60"
  const run = async (action: () => Promise<void>) => {
    if (working) return
    setWorking(true)
    try { await action() } finally { setWorking(false) }
  }
  return <section className="rounded-3xl border border-violet-300/15 bg-[#07111f]/95 px-6 py-5">
    <h2 className="text-sm font-black text-white">Automatic file backup</h2>
    <p className="mt-2 text-xs leading-5 text-blue-100/60">
      Keep a file backup of <span className="font-bold text-blue-100/85">{profileName}</span>. Changes save after about 2 seconds while the profile is open.
    </p>

    <div role="status" aria-live="polite" aria-atomic="true" className="mt-5 overflow-hidden rounded-2xl border border-violet-300/20 bg-black/25">
      <dl className="grid grid-cols-1 sm:grid-cols-2">
        <div className="min-w-0 border-b border-white/[0.08] px-4 py-4 sm:col-span-2">
          <dt className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-100/45">Backup file</dt>
          <dd className="mt-2 break-all font-mono text-sm font-semibold text-white">{state.fileName || "No file selected"}</dd>
        </div>
        <div className="border-b border-white/[0.08] px-4 py-4 sm:border-b-0 sm:border-r">
          <dt className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-100/45">Automatic backup</dt>
          <dd className="mt-2">
            <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${statusColor}`}>
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
              {statusLabel}
            </span>
          </dd>
        </div>
        <div className="min-w-0 px-4 py-4">
          <dt className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-100/45">Last successful backup</dt>
          <dd className="mt-2 text-sm font-semibold text-blue-100/90">
            {state.lastSavedAt ? <time dateTime={state.lastSavedAt}>{new Date(state.lastSavedAt).toLocaleString()}</time> : "Not saved yet"}
          </dd>
        </div>
      </dl>
    </div>

    {supported ? <>
      {!state.configured && <p className="mt-4 text-xs leading-5 text-blue-100/60">Choose a folder for a new backup, or connect this profile's existing file.</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" disabled={busy} className={buttonClass} onClick={() => { void run(() => localBackup.selectFile()) }}>
          {state.configured ? "Change backup folder" : "Choose backup folder"}
        </button>
        <button type="button" disabled={busy} className={buttonClass} onClick={() => { void run(() => localBackup.selectFile("existing")) }}>
          Use existing backup file
        </button>
        {state.configured && <>
          <button type="button" disabled={busy} className={buttonClass} onClick={() => { void run(() => localBackup.resume()) }}>
            {state.phase === "permission" ? "Allow file access" : "Save now"}
          </button>
          <button type="button" disabled={busy} className={buttonClass} onClick={() => { void run(() => localBackup.disable()) }}>Turn off</button>
        </>}
      </div>
    </> : <p className="mt-3 text-xs leading-5 text-amber-200">
      Automatic file backup is unavailable here. Use Profiles → Export Profile to download a copy.
    </p>}
    {state.error && <p role="alert" className="mt-4 rounded-xl border border-amber-300/20 bg-amber-400/5 px-4 py-3 text-xs leading-5 text-amber-200">{state.error}</p>}
    <p className="mt-4 text-xs leading-5 text-blue-100/50">Your profile is also saved locally on this device.</p>
    <details className="mt-4 border-t border-white/[0.07] pt-3 text-xs text-blue-100/60">
      <summary className="cursor-pointer font-bold text-violet-200/80">How backups work</summary>
      <ul className="mt-3 list-disc space-y-2 pl-4 leading-5">
        <li>Each profile uses its own file. Files belonging to another profile cannot be overwritten.</li>
        <li>The file keeps the latest saved version. Wait for saving to finish before closing the app.</li>
        <li>Changing folders or turning backup off keeps the previous file on your device.</li>
        <li>Connecting an existing file sets the save destination. To restore data, use Profiles → Import Profile.</li>
        <li>You may need to allow file access again after restarting.</li>
        <li>Supported browsers include Chrome and Edge on desktop, and Chrome 132 or later on Android. Installed apps use the capabilities of their browser.</li>
      </ul>
    </details>
  </section>
}
