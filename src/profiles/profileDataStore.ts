import {
  deleteStoredValue,
  migrateStoredValue,
  setStoredValue,
} from "../storage/indexedDB"

import type {
  CM,
  LoH,
  UmaCharacter,
  UmaVersion,
} from "../types/types"

import {
  loadCmsFromStore,
  loadLohsFromStore,
  loadFavoriteUmaIdFromStore,
  loadCmViewModeFromStore,
  loadCustomUmaDatabaseFromStore,
  loadSeenOfficialVersionIdsFromStore,
} from "../storage/appStore"

import { umaVersions } from "../data/umaData"
import { migrateProfileData, PROFILE_DATA_VERSION } from "./profileDataMigration"

export type ProfileData = {
  dataVersion?: number
  cms: CM[]
  lohs: LoH[]

  customUmaDatabase: {
    customCharacters: UmaCharacter[]
    customVersions: UmaVersion[]
    archivedVersionIds: string[]
  }

  favoriteUmaId: string

  cmViewMode: "detailed" | "compact"

  seenOfficialVersionIds: string[]
  onboardingCompleted?: boolean
  cmLineupGuideCompleted?: boolean
  umaComparisonSlots?: (string | null)[]
}

function getProfileDataKey(
  profileId: string
) {
  return `profile:${profileId}:data`
}

export function createEmptyProfileData(
  currentOfficialVersionIds: string[]
): ProfileData {
  return {
    dataVersion: PROFILE_DATA_VERSION,
    cms: [],
    lohs: [],

    customUmaDatabase: {
      customCharacters: [],
      customVersions: [],
      archivedVersionIds: [],
    },

    favoriteUmaId: "",

    cmViewMode: "detailed",

    seenOfficialVersionIds: [
      ...currentOfficialVersionIds,
    ],

    onboardingCompleted: false,
    cmLineupGuideCompleted: false,
  }
}

export async function loadProfileData(
  profileId: string
): Promise<ProfileData | null> {
  const data =
    await migrateStoredValue<ProfileData>(
      getProfileDataKey(profileId), migrateProfileData,
    )

  return data ?? null
}

export async function saveProfileData(
  profileId: string,
  data: ProfileData
) {
  await setStoredValue(
    getProfileDataKey(profileId),
    migrateProfileData(data)
  )
}

const profileUpdateQueues = new Map<
  string,
  Promise<void>
>()

export function updateProfileData(
  profileId: string,
  updater: (
    currentData: ProfileData
  ) => ProfileData
): Promise<void> {
  return withProfileDataUpdateQueue(profileId, async () => {
    const currentData = await loadProfileData(profileId)
    if (!currentData) throw new Error(`Profile data not found: ${profileId}`)
    await saveProfileData(profileId, updater(currentData))
  })
}

// Serialize confirmed restores with existing in-flight profile updates.
export function withProfileDataUpdateQueue(profileId: string, task: () => Promise<void>): Promise<void> {
  const previousUpdate =
    profileUpdateQueues.get(profileId) ??
    Promise.resolve()

  const nextUpdate = previousUpdate
    .catch(() => {
      // Pozwalamy kolejnym zapisom działać,
      // nawet jeśli poprzedni zapis się nie udał.
    })
    .then(task)

  profileUpdateQueues.set(
    profileId,
    nextUpdate
  )

  return nextUpdate
}

export async function initializeProfileData(
  profileId: string,
  currentOfficialVersionIds: string[]
): Promise<ProfileData> {
  const existingData =
    await loadProfileData(profileId)

  if (existingData) {
    return existingData
  }

  const newData = createEmptyProfileData(
    currentOfficialVersionIds
  )

  await saveProfileData(
    profileId,
    newData
  )

  return newData
}

export async function loadLegacyProfileData(): Promise<ProfileData> {
  const [
    cms,
    lohs,
    favoriteUmaId,
    cmViewMode,
    customUmaDatabase,
    seenOfficialVersionIds,
  ] = await Promise.all([
    loadCmsFromStore(),
    loadLohsFromStore(),
    loadFavoriteUmaIdFromStore(),
    loadCmViewModeFromStore(),
    loadCustomUmaDatabaseFromStore(),
    loadSeenOfficialVersionIdsFromStore(),
  ])

  return migrateProfileData({
    cms,
    lohs,

    customUmaDatabase:
      customUmaDatabase ?? {
        customCharacters: [],
        customVersions: [],
        archivedVersionIds: [],
      },

    favoriteUmaId,

    cmViewMode:
      cmViewMode ?? "detailed",

    seenOfficialVersionIds:
      seenOfficialVersionIds ??
      umaVersions.map(
        (version) => version.id
      ),
  })
}

export async function deleteProfileData(
  profileId: string
): Promise<void> {
  await deleteStoredValue(
    getProfileDataKey(profileId)
  )

  profileUpdateQueues.delete(profileId)
}
