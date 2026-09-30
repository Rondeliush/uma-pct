import { useSyncExternalStore } from "react"
import { localBackup } from "./localBackup"

export default function BackupNotice() {
  const state = useSyncExternalStore(localBackup.subscribe, localBackup.getSnapshot, localBackup.getSnapshot)
  if (!state.profileId || !state.configured || state.phase === "off" || state.phase === "loading" || state.phase === "ready") return null
  const failed = state.phase === "permission" || state.phase === "error"
  return <aside role={failed ? "alert" : "status"} className="fixed bottom-4 right-4 z-[1300] max-w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-violet-300/25 bg-[#07111f] px-4 py-3 text-xs text-blue-100 shadow-xl">
    <p className="font-bold">{state.profileName}: {failed ? "file backup paused" : "saving file backup..."}</p>
    {failed && <>
      <p className="mt-1">{state.error}</p>
      <p className="mt-1 text-blue-100/60">Data remains in this browser. You can change the backup file in Settings.</p>
      <button type="button" className="mt-2 rounded-lg bg-violet-400/15 px-3 py-2 font-bold text-violet-200" onClick={() => { void localBackup.resume() }}>
        {state.phase === "permission" ? "Allow file access" : "Retry backup"}
      </button>
    </>}
  </aside>
}
