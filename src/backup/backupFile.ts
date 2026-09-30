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
  showSaveFilePicker?: (options: {
    suggestedName: string
    types: { description: string; accept: Record<string, string[]> }[]
  }) => Promise<BackupFile>
}

export function supportsAutomaticBackup() {
  return typeof window !== "undefined" && typeof (window as PickerWindow).showSaveFilePicker === "function"
}

// Call directly from a click, before reading IndexedDB or awaiting other work.
export function chooseBackupFile(suggestedName: string): Promise<BackupFile> {
  const pickerWindow = window as PickerWindow
  if (!pickerWindow.showSaveFilePicker) throw new Error("This browser does not support automatic file backups. Use Profiles → Export Profile instead.")
  return pickerWindow.showSaveFilePicker({
    suggestedName,
    types: [{ description: "UmaPCT profile backup", accept: { "application/json": [".json"] } }],
  })
}

export function withBackupFileLock(task: () => Promise<void>): Promise<void> {
  return typeof navigator !== "undefined" && navigator.locks
    ? navigator.locks.request("uma-profile-backup-write", task)
    : task()
}

export async function assertBackupFileOwner(handle: BackupFile, sourceProfileId: string) {
  const text = await (await handle.getFile()).text()
  if (text.length === 0) return // The picker creates an empty file for a new path.
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
