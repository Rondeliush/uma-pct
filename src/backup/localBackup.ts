import { getStoredValue, setStoredValue, deleteStoredValue } from "../storage/indexedDB"
import { STORAGE_CHANGE_CHANNEL, STORAGE_CHANGE_EVENT } from "../storage/storageChanges"
import { LocalBackupController, type BackupFile, type BackupConfig } from "./LocalBackupController"
import { readProfileBackup } from "./profileBackup"

type PickerWindow = Window & {
  showSaveFilePicker?: (options: {
    suggestedName: string
    types: { description: string; accept: Record<string, string[]> }[]
  }) => Promise<BackupFile>
}

export function supportsAutomaticBackup() {
  return typeof window !== "undefined" && typeof (window as PickerWindow).showSaveFilePicker === "function"
}

const controller = new LocalBackupController({
  readConfig: (id) => getStoredValue<BackupConfig>(`backup:profile:${id}`),
  writeConfig: (id, value) => value
    ? setStoredValue(`backup:profile:${id}`, value)
    : deleteStoredValue(`backup:profile:${id}`),
  readBackup: readProfileBackup,
  pickFile: (suggestedName) => {
    const pickerWindow = window as PickerWindow
    if (!pickerWindow.showSaveFilePicker) throw new Error("This browser does not support automatic file backups. Use Profiles → Export Profile instead.")
    return pickerWindow.showSaveFilePicker({
      suggestedName,
      types: [{ description: "UmaPCT profile backup", accept: { "application/json": [".json"] } }],
    })
  },
  withLock: (task) => typeof navigator !== "undefined" && navigator.locks
    ? navigator.locks.request("uma-profile-backup-write", task)
    : task(),
})

export const localBackup = Object.assign(controller, {
  listen() {
    const onChange = (event: Event) => controller.changed((event as CustomEvent<string>).detail)
    window.addEventListener(STORAGE_CHANGE_EVENT, onChange)
    let channel: BroadcastChannel | undefined
    try {
      channel = new BroadcastChannel(STORAGE_CHANGE_CHANNEL)
      channel.onmessage = (event: MessageEvent<unknown>) => {
        if (typeof event.data === "string") controller.changed(event.data)
      }
    } catch { /* Cross-tab notifications are optional. */ }
    // Do not rely on unload: browsers need not finish asynchronous file writes.
    const flush = () => {
      if (document.visibilityState === "hidden" && controller.getSnapshot().phase === "pending") void controller.saveNow()
    }
    document.addEventListener("visibilitychange", flush)
    return () => {
      window.removeEventListener(STORAGE_CHANGE_EVENT, onChange)
      document.removeEventListener("visibilitychange", flush)
      channel?.close()
    }
  },
})
