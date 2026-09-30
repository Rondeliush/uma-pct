import { useState, useSyncExternalStore } from "react"
import { localBackup } from "./localBackup"
import AppMessageDialog from "../components/AppMessageDialog"
import type { BackupState } from "./LocalBackupController"

function BackupFailure({ state }: { state: BackupState }) {
  const [dismissed, setDismissed] = useState(false)
  const title = state.configured ? "File backup paused" : "Could not set up file backup"
  return <>
    {!dismissed && <AppMessageDialog
      title={title}
      message={`${state.profileName}: ${state.error}\n\nYour profile data remains saved locally on this device. Check the backup settings before trying again.`}
      onClose={() => setDismissed(true)}
    />}
    <aside role="status" className="fixed bottom-4 right-4 z-[1300] max-w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-violet-300/25 bg-[#07111f] px-4 py-3 text-xs text-blue-100 shadow-xl">
      <p className="font-bold">{state.profileName}: {title.toLowerCase()}</p>
      <button type="button" className="mt-2 font-bold text-violet-200 underline" onClick={() => setDismissed(false)}>Show details</button>
      {state.configured && <button type="button" className="ml-3 mt-2 rounded-lg bg-violet-400/15 px-3 py-2 font-bold text-violet-200" onClick={() => { void localBackup.resume() }}>
        {state.phase === "permission" ? "Allow file access" : "Retry backup"}
      </button>}
    </aside>
  </>
}

export default function BackupNotice() {
  const state = useSyncExternalStore(localBackup.subscribe, localBackup.getSnapshot, localBackup.getSnapshot)
  if (!state.profileId || state.phase === "off" || state.phase === "loading" || state.phase === "ready") return null
  const failed = state.phase === "permission" || state.phase === "error"
  if (failed) return <BackupFailure key={`${state.profileId}:${state.error}`} state={state} />
  return <aside role="status" className="fixed bottom-4 right-4 z-[1300] max-w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-violet-300/25 bg-[#07111f] px-4 py-3 text-xs text-blue-100 shadow-xl">
    <p className="font-bold">{state.profileName}: saving file backup...</p>
  </aside>
}
