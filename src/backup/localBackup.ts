import { getStoredValue, setStoredValue, deleteStoredValue } from "../storage/indexedDB"
import { STORAGE_CHANGE_CHANNEL, STORAGE_CHANGE_EVENT } from "../storage/storageChanges"
import { LocalBackupController, type BackupConfig } from "./LocalBackupController"
import { readProfileBackup } from "./profileBackup"
import { chooseBackupFile, withBackupFileLock } from "./backupFile"
export { supportsAutomaticBackup } from "./backupFile"

const controller = new LocalBackupController({
  readConfig: (id) => getStoredValue<BackupConfig>(`backup:profile:${id}`),
  writeConfig: (id, value) => value
    ? setStoredValue(`backup:profile:${id}`, value)
    : deleteStoredValue(`backup:profile:${id}`),
  readBackup: readProfileBackup,
  pickFile: chooseBackupFile,
  withLock: withBackupFileLock,
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
