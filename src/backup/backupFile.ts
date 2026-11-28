import { isImportedProfileFile, type ImportedProfileFile } from "../profiles/profileTransfer"
import { getTrustedBackupSourceIds, type Profile } from "../profiles/profileStore"
import { backupStep, markBackupStep, withBackupDeadline } from "./backupOperation"

export type BackupFile = {
  name: string
  queryPermission(options: { mode: "readwrite" }): Promise<PermissionState>
  requestPermission(options: { mode: "readwrite" }): Promise<PermissionState>
  getFile(): Promise<{ text(): Promise<string> }>
  createWritable(): Promise<{
    write(data: string): Promise<void>
    close(): Promise<void>
    abort(): Promise<void>
  }>
}

type PickerWindow = Window & {
  showOpenFilePicker?: (options: {
    multiple: false
    types: { description: string; accept: Record<string, string[]> }[]
  }) => Promise<BackupFile[]>
  showDirectoryPicker?: (options: { mode: "readwrite" }) => Promise<{
    getFileHandle(name: string, options: { create: true }): Promise<BackupFile>
  }>
}

export type BackupDestination = "folder" | "existing"

export function supportsAutomaticBackup() {
  if (typeof window === "undefined") return false
  const pickerWindow = window as PickerWindow
  return typeof pickerWindow.showDirectoryPicker === "function" && typeof pickerWindow.showOpenFilePicker === "function"
}

// Call directly from a click, before reading IndexedDB or awaiting other work.
export async function chooseBackupFile(suggestedName: string, destination: BackupDestination = "folder"): Promise<BackupFile> {
  const pickerWindow = window as PickerWindow
  if (destination === "existing") {
    if (!pickerWindow.showOpenFilePicker) throw new Error("This browser cannot safely select an existing backup file.")
    const [handle] = await pickerWindow.showOpenFilePicker({
      multiple: false,
      types: [{ description: "UmaPCT profile backup", accept: { "application/json": [".json"] } }],
    })
    if (!handle) throw new DOMException("No file selected.", "AbortError")
    // The open picker restores user activation, allowing this permission request.
    if (await withBackupDeadline(signal => backupStep(signal, "requesting file permission", () => handle.requestPermission({ mode: "readwrite" }))) !== "granted") {
      throw new DOMException("File access was not granted. The file was not changed.", "NotAllowedError")
    }
    return handle
  }
  if (!pickerWindow.showDirectoryPicker) throw new Error("This browser cannot safely create a backup in a selected folder.")
  const folder = await pickerWindow.showDirectoryPicker({ mode: "readwrite" })
  // getFileHandle(create: true) preserves an existing file. A save picker can
  // truncate it before we get a chance to inspect its profile identity.
  return withBackupDeadline(signal => backupStep(signal, "opening the selected backup file", () => folder.getFileHandle(suggestedName, { create: true })))
}

let fallbackQueue: Promise<void> = Promise.resolve()

export function withBackupFileLock(task: (signal: AbortSignal) => Promise<void>, signal?: AbortSignal): Promise<void> {
  if (!signal) return withBackupDeadline(next => withBackupFileLock(task, next))
  return backupStep(signal, "waiting for the backup file lock", () => {
    if (typeof navigator !== "undefined" && navigator.locks) {
      return navigator.locks.request("uma-profile-backup-write", { signal }, () => {
        signal.throwIfAborted()
        return task(signal)
      })
    }
    // Keep the physical lock until an already-started close() really settles.
    // A later writer must never overtake a commit whose result is still unknown.
    const work = fallbackQueue.then(() => { signal.throwIfAborted(); return task(signal) })
    fallbackQueue = work.catch(() => {})
    return work
  })
}

export async function readBackupFile(handle: BackupFile, signal?: AbortSignal): Promise<ImportedProfileFile | null> {
  const file = await backupStep(signal, "reading the backup file", () => handle.getFile())
  const text = await backupStep(signal, "reading the backup contents", () => file.text())
  if (text.length === 0) return null // getFileHandle creates an empty file for a new path.
  let existing: unknown
  try { existing = JSON.parse(text) } catch { /* Reject unrecognized content below. */ }
  if (!isImportedProfileFile(existing)) {
    throw new Error("This file is not a valid profile backup. Choose a new file. Nothing was overwritten.")
  }
  return existing
}

export async function assertBackupFileOwner(handle: BackupFile, sourceProfileId: string, signal?: AbortSignal) {
  const existing = await readBackupFile(handle, signal)
  if (!existing) return
  if (existing.profile.sourceProfileId !== sourceProfileId) {
    throw new Error(`This backup belongs to profile "${existing.profile.name}". Choose a different file. Nothing was overwritten.`)
  }
}

export function canRelinkBackupFile(profile: Profile, backup: ImportedProfileFile): boolean {
  return getTrustedBackupSourceIds(profile).includes(backup.profile.sourceProfileId) &&
    backup.profile.sourceProfileId !== (profile.sourceProfileId ?? profile.id)
}

// Call under withBackupFileLock. Re-read the destination immediately before
// writing: its contents may have changed since selection or the previous save.
export async function writeProfileBackupFile(
  handle: BackupFile,
  backup: ImportedProfileFile,
  canWrite: () => boolean = () => true,
  signal?: AbortSignal,
): Promise<boolean> {
  if (!isImportedProfileFile(backup)) throw new Error("Profile data is invalid. Nothing was overwritten.")
  const json = JSON.stringify(backup, null, 2)
  await assertBackupFileOwner(handle, backup.profile.sourceProfileId, signal)
  return commitBackupFile(handle, json, canWrite, signal)
}

// Only the explicit relink confirmation uses this path. Normal saves and exports
// still require the file's owner to match the current profile exactly.
export async function relinkProfileBackupFile(
  handle: BackupFile,
  backup: ImportedProfileFile,
  profile: Profile,
  canWrite: () => boolean = () => true,
  signal?: AbortSignal,
): Promise<boolean> {
  if (!isImportedProfileFile(backup) || backup.profile.sourceProfileId !== (profile.sourceProfileId ?? profile.id)) {
    throw new Error("The profile identity changed. Reopen the profile before linking a backup.")
  }
  const existing = await readBackupFile(handle, signal)
  if (!existing || !canRelinkBackupFile(profile, existing)) {
    throw new Error("The selected backup changed or belongs to another profile. Select the file again. Nothing was overwritten.")
  }
  return commitBackupFile(handle, JSON.stringify(backup, null, 2), canWrite, signal)
}

async function commitBackupFile(handle: BackupFile, json: string, canWrite: () => boolean, signal?: AbortSignal): Promise<boolean> {
  if (!canWrite()) return false
  const stream = await backupStep(signal, "opening the backup writer", () => handle.createWritable().then(stream => {
    if (signal?.aborted) {
      void stream.abort().catch(() => {})
      signal.throwIfAborted()
    }
    return stream
  }))
  let aborted = false
  const discard = () => {
    if (aborted) return
    aborted = true
    try { void stream.abort().catch(() => {}) } catch { /* Preserve the original save error. */ }
  }
  const abort = () => { discard() }
  signal?.addEventListener("abort", abort, { once: true })
  try {
    if (!canWrite()) { abort(); return false }
    await backupStep(signal, "writing the backup file", () => stream.write(json))
    if (!canWrite()) { abort(); return false }
    markBackupStep(signal, "committing the backup file")
    // close() is the commit point. Retain the lock until it really settles,
    // even if the browser ignores the abort after the public operation times out.
    await stream.close()
    signal?.throwIfAborted()
    return true
  } catch (error) {
    // A stalled abort must not hide the write error or block the save queue.
    discard()
    throw error
  } finally { signal?.removeEventListener("abort", abort) }
}
