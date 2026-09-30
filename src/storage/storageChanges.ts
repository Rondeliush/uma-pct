export const STORAGE_CHANGE_EVENT = "uma-storage-changed"
export const STORAGE_CHANGE_CHANNEL = "uma-storage-changes"

// Emit only after a successful transaction, so backups never read pending writes.
export function notifyStorageChanged(key: string) {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(STORAGE_CHANGE_EVENT, { detail: key }))
  if (typeof BroadcastChannel !== "undefined") {
    try {
      const channel = new BroadcastChannel(STORAGE_CHANGE_CHANNEL)
      channel.postMessage(key)
      channel.close()
    } catch { /* The local event still reaches this tab. */ }
  }
}
