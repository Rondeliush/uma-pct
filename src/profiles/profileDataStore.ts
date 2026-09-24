import {
  deleteStoredValue,
  getStoredValue,
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

export type ProfileData = {
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
    await getStoredValue<ProfileData>(
      getProfileDataKey(profileId)
    )

  return data ?? null
}

export async function saveProfileData(
  profileId: string,
  data: ProfileData
) {
  await setStoredValue(
    getProfileDataKey(profileId),
    data
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
  const previousUpdate =
    profileUpdateQueues.get(profileId) ??
    Promise.resolve()

  const nextUpdate = previousUpdate
    .catch(() => {
      // Pozwalamy kolejnym zapisom działać,
      // nawet jeśli poprzedni zapis się nie udał.
    })
    .then(async () => {
      const currentData =
        await loadProfileData(profileId)

      if (!currentData) {
        throw new Error(
          `Profile data not found: ${profileId}`
        )
      }

      const updatedData =
        updater(currentData)

      await saveProfileData(
        profileId,
        updatedData
      )
    })

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

  return {
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
  }
}

export async function deleteProfileData(
  profileId: string
): Promise<void> {
  await deleteStoredValue(
    getProfileDataKey(profileId)
  )

  profileUpdateQueues.delete(profileId)
}