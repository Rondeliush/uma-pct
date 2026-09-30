import { useState, useSyncExternalStore } from "react"
import { localBackup, supportsAutomaticBackup } from "./localBackup"

const buttonClass = "rounded-xl border border-violet-300/20 bg-violet-400/10 px-4 py-2 text-xs font-bold text-violet-200 disabled:opacity-40"

export default function LocalBackupSection({ profileName }: { profileName: string }) {
  const state = useSyncExternalStore(localBackup.subscribe, localBackup.getSnapshot, localBackup.getSnapshot)
  const [working, setWorking] = useState(false)
  const supported = supportsAutomaticBackup()
  const busy = working || state.phase === "loading" || state.phase === "saving"
  const run = async (action: () => Promise<void>) => {
    if (working) return
    setWorking(true)
    try { await action() } finally { setWorking(false) }
  }
  return <section className="rounded-3xl border border-violet-300/15 bg-[#07111f]/95 px-6 py-5">
    <h2 className="text-sm font-black text-white">Automatic file backup</h2>
    <p className="mt-2 text-xs leading-5 text-blue-100/60">Before every file save, UmaPCT checks which profile the existing backup belongs to. A backup of another profile will not be overwritten, even if both profiles have the same name.</p>
    <p className="mt-2 text-xs leading-5 text-blue-100/60">
      Save {profileName} to a file on this device. While this profile is open, changes update its selected file after about 2 seconds. Each profile has its own backup file.
    </p>
    {supported ? <>
      <p className="mt-3 text-xs font-bold text-emerald-300">Automatic file backup is supported in this browser.</p>
      <p className="mt-2 text-xs leading-5 text-blue-100/50">Select where to save the automatic backup. The Save dialog creates or selects the destination file; to restore data, use Profiles → Import Profile. Your browser may ask you to allow access again after restarting. The file contains the latest saved version; previous versions are replaced.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" disabled={busy} className={buttonClass} onClick={() => { void run(() => localBackup.selectFile()) }}>
          {state.configured ? "Change save location" : "Set up automatic backup"}
        </button>
        {state.configured && <>
          <button type="button" disabled={busy} className={buttonClass} onClick={() => { void run(() => localBackup.resume()) }}>
            {state.phase === "permission" ? "Allow file access" : "Save now"}
          </button>
          <button type="button" disabled={busy} className={buttonClass} onClick={() => { void run(() => localBackup.disable()) }}>Turn off</button>
        </>}
      </div>
    </> : <p className="mt-3 text-xs leading-5 text-amber-200">
      This browser does not support automatic writing to a selected file. Your profile still saves in this browser. Use Profiles → Export Profile for a manual file backup.
    </p>}
    <p className="mt-3 text-xs leading-5 text-blue-100/50">Supported browsers include Chrome and Edge on desktop, and Chrome 132 or later on Android. Installed UmaPCT apps use the capabilities of their browser. File access requires your permission, and automatic backup runs while the app is open.</p>
    <div role="status" className="mt-3 space-y-1 text-xs text-blue-100/60">
      {state.fileName && <p>File: {state.fileName}</p>}
      {state.phase === "off" && <p>Automatic file backup is off. Your data still saves in this browser.</p>}
      {state.phase === "loading" && <p>Loading backup settings...</p>}
      {state.phase === "pending" && <p>Changes waiting to be saved to the file...</p>}
      {state.phase === "saving" && <p>Saving backup file...</p>}
      {state.phase === "ready" && <p>Automatic file backup is on.</p>}
      {state.lastSavedAt && <p>Last file backup: {new Date(state.lastSavedAt).toLocaleString()}</p>}
    </div>
    {state.error && <p role="alert" className="mt-3 text-xs text-amber-200">{state.error}</p>}
    <p className="mt-3 text-xs leading-5 text-blue-100/50">Wait for saving to finish before closing the app. Restore this JSON through Profiles → Import Profile or the welcome screen. Turn off keeps your existing backup file.</p>
  </section>
}
