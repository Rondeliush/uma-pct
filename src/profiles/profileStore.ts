import {
  getStoredValue,
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
  const profiles =
    await getStoredValue<Profile[]>(
      PROFILES_STORAGE_KEY
    )

  if (!Array.isArray(profiles)) {
    return []
  }

  return profiles
}

export async function saveProfiles(
  profiles: Profile[]
) {
  await setStoredValue(
    PROFILES_STORAGE_KEY,
    profiles
  )
}

export async function createProfile(
  name: string,
  sourceProfileId?: string
): Promise<Profile> {
  const profiles = await loadProfiles()

  const id = crypto.randomUUID()

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