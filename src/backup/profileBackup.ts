import { openDatabase, STORE_NAME } from "../storage/indexedDB"
import { isImportedProfileFile, type ImportedProfileFile } from "../profiles/profileTransfer"
import { migrateProfileData } from "../profiles/profileDataMigration"
import type { Profile } from "../profiles/profileStore"
import { backupStep, withBackupDeadline } from "./backupOperation"

// Read the name and complete tracker data from the same committed snapshot.
export async function readProfileBackup(profileId: string, parent?: AbortSignal): Promise<ImportedProfileFile> {
  return withBackupDeadline(async signal => {
    const database = await backupStep(signal, "opening local profile storage", () => openDatabase().then(database => {
      if (signal.aborted) { database.close(); signal.throwIfAborted() }
      return database
    }))
    return new Promise<ImportedProfileFile>((resolve, reject) => {
      try {
        const transaction = database.transaction(STORE_NAME, "readonly")
        const store = transaction.objectStore(STORE_NAME)
        const profiles = store.get("profiles")
        const data = store.get(`profile:${profileId}:data`)
        const finish = () => { signal.removeEventListener("abort", cancel); database.close() }
        const cancel = () => {
          try { transaction.abort() } catch { /* The transaction may already have ended. */ }
          finish()
          reject(signal.reason)
        }
        signal.addEventListener("abort", cancel, { once: true })
        transaction.onabort = () => { finish(); reject(signal.aborted ? signal.reason : transaction.error) }
        transaction.oncomplete = () => {
          finish()
          try {
            signal.throwIfAborted()
            const profile: Profile | undefined = Array.isArray(profiles.result)
              ? profiles.result.find((item: Profile) => item.id === profileId) : undefined
            const backup: unknown = {
              format: "uma-tracker-profile", version: 1,
              profile: { sourceProfileId: profile?.sourceProfileId ?? profile?.id, name: profile?.name },
              data: data.result,
            }
            if (!isImportedProfileFile(backup)) {
              throw new Error("Profile data is missing or invalid. The backup file was not changed.")
            }
            backup.data = migrateProfileData(backup.data)
            resolve(backup)
          } catch (error) { reject(error) }
        }
      } catch (error) {
        database.close()
        reject(error)
      }
    })
  }, undefined, parent)
}
