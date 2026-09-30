import { openDatabase, STORE_NAME } from "../storage/indexedDB"
import { isImportedProfileFile, type ImportedProfileFile } from "../profiles/profileTransfer"
import type { Profile } from "../profiles/profileStore"

// Read the name and complete tracker data from the same committed snapshot.
export async function readProfileBackup(profileId: string): Promise<ImportedProfileFile> {
  const database = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readonly")
    const store = transaction.objectStore(STORE_NAME)
    const profiles = store.get("profiles")
    const data = store.get(`profile:${profileId}:data`)
    transaction.onabort = () => { database.close(); reject(transaction.error) }
    transaction.oncomplete = () => {
      database.close()
      const profile: Profile | undefined = Array.isArray(profiles.result)
        ? profiles.result.find((item: Profile) => item.id === profileId) : undefined
      const backup: unknown = {
        format: "uma-tracker-profile", version: 1,
        profile: { sourceProfileId: profile?.sourceProfileId ?? profile?.id, name: profile?.name },
        data: data.result,
      }
      if (!isImportedProfileFile(backup)) {
        reject(new Error("Profile data is missing or invalid. The backup file was not changed."))
        return
      }
      resolve(backup)
    }
  })
}
