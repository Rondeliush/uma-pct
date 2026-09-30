import { isImportedProfileFile, type ImportedProfileFile } from "../profiles/profileTransfer"

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
    if (await handle.requestPermission({ mode: "readwrite" }) !== "granted") {
      throw new DOMException("File access was not granted. The file was not changed.", "NotAllowedError")
    }
    return handle
  }
  if (!pickerWindow.showDirectoryPicker) throw new Error("This browser cannot safely create a backup in a selected folder.")
  const folder = await pickerWindow.showDirectoryPicker({ mode: "readwrite" })
  // getFileHandle(create: true) preserves an existing file. A save picker can
  // truncate it before we get a chance to inspect its profile identity.
  return folder.getFileHandle(suggestedName, { create: true })
}

export function withBackupFileLock(task: () => Promise<void>): Promise<void> {
  return typeof navigator !== "undefined" && navigator.locks
    ? navigator.locks.request("uma-profile-backup-write", task)
    : task()
}

export async function assertBackupFileOwner(handle: BackupFile, sourceProfileId: string) {
  const text = await (await handle.getFile()).text()
  if (text.length === 0) return // getFileHandle creates an empty file for a new path.
  let existing: unknown
  try { existing = JSON.parse(text) } catch { /* Reject unrecognized content below. */ }
  if (!isImportedProfileFile(existing)) {
    throw new Error("This file is not a valid profile backup. Choose a new file. Nothing was overwritten.")
  }
  if (existing.profile.sourceProfileId !== sourceProfileId) {
    throw new Error(`This backup belongs to profile "${existing.profile.name}". Choose a different file. Nothing was overwritten.`)
  }
}

// Call under withBackupFileLock. Re-read the destination immediately before
// writing: its contents may have changed since selection or the previous save.
export async function writeProfileBackupFile(
  handle: BackupFile,
  backup: ImportedProfileFile,
  canWrite: () => boolean = () => true,
): Promise<boolean> {
  if (!isImportedProfileFile(backup)) throw new Error("Profile data is invalid. Nothing was overwritten.")
  const json = JSON.stringify(backup, null, 2)
  await assertBackupFileOwner(handle, backup.profile.sourceProfileId)
  if (!canWrite()) return false
  const stream = await handle.createWritable()
  try {
    if (!canWrite()) { await stream.abort(); return false }
    await stream.write(json)
    await stream.close()
    return true
  } catch (error) {
    try { await stream.abort() } catch { /* Keep the original write error. */ }
    throw error
  }
}
