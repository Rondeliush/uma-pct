import {
  openDatabase,
  STORE_NAME,
  setStoredValue,
} from "../storage/indexedDB"

export type Profile = {
  id: string
  name: string
  createdAt: string
  sourceProfileId?: string
}

const PROFILES_STORAGE_KEY = "profiles"

export async function loadProfiles(): Promise<
  Profile[]
> {
  // Retire old account links atomically, without touching any tracker data.
  const database = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite")
    const store = transaction.objectStore(STORE_NAME)
    const request = store.get(PROFILES_STORAGE_KEY)
    let profiles: Profile[] = []
    let failure: unknown
    request.onsuccess = () => {
      try {
        const stored = request.result
        if (stored === undefined) return
        if (!Array.isArray(stored)) throw new Error("Could not read the local profile list.")
        profiles = stored.map((profile) => {
          const local = { ...profile }
          delete local.cloudOwnerUserId
          return local
        })
        if (stored.some((profile) => "cloudOwnerUserId" in profile)) {
          store.put(profiles, PROFILES_STORAGE_KEY)
        }
      } catch (error) { failure = error; transaction.abort() }
    }
    transaction.oncomplete = () => { database.close(); resolve(profiles) }
    transaction.onabort = () => { database.close(); reject(failure ?? transaction.error) }
  })
}

export async function saveProfiles(
  profiles: Profile[]
) {
  await setStoredValue(
    PROFILES_STORAGE_KEY,
    profiles
  )
}
export function createProfileId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`
}


export async function createProfile(
  name: string,
  sourceProfileId?: string
): Promise<Profile> {
  const profiles = await loadProfiles()

  const id = createProfileId()

  const profile: Profile = {
    id,
    name: name.trim(),
    createdAt: new Date().toISOString(),
    sourceProfileId:
      sourceProfileId ?? id,
  }

  await saveProfiles([
    ...profiles,
    profile,
  ])

  return profile
}

export async function renameProfile(
  profileId: string,
  newName: string
): Promise<Profile[]> {
  const profiles = await loadProfiles()

  const trimmedName = newName.trim()

  if (trimmedName === "") {
    return profiles
  }

  const updatedProfiles = profiles.map(
    (profile) =>
      profile.id === profileId
        ? {
            ...profile,
            name: trimmedName,
          }
        : profile
  )

  await saveProfiles(updatedProfiles)

  return updatedProfiles
}

export async function deleteProfile(
  profileId: string
): Promise<Profile[]> {
  const profiles = await loadProfiles()

  const updatedProfiles =
    profiles.filter(
      (profile) =>
        profile.id !== profileId
    )

  await saveProfiles(updatedProfiles)

  return updatedProfiles
}
