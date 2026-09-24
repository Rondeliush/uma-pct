import {
  getStoredValue,
  setStoredValue,
} from "./indexedDB"

import type {
  CM,
  LoH,
  UmaCharacter,
  UmaVersion,
} from "../types/types"

const APP_STORE_PREFIX = "app:"

function getAppStoreKey(key: string) {
  return `${APP_STORE_PREFIX}${key}`
}

export async function loadCmsFromStore(): Promise<CM[]> {
  return (
    (await getStoredValue<CM[]>(
      getAppStoreKey("cms")
    )) ?? []
  )
}

export async function loadLohsFromStore(): Promise<LoH[]> {
  return (
    (await getStoredValue<LoH[]>(
      getAppStoreKey("lohs")
    )) ?? []
  )
}

export async function saveCmsToStore(
  cms: CM[]
) {
  await setStoredValue(
    getAppStoreKey("cms"),
    cms
  )
}

export async function saveLohsToStore(
  lohs: LoH[]
) {
  await setStoredValue(
    getAppStoreKey("lohs"),
    lohs
  )
}

export async function loadFavoriteUmaIdFromStore(): Promise<string> {
  return (
    (await getStoredValue<string>(
      getAppStoreKey("favoriteUmaId")
    )) ?? ""
  )
}

export async function saveFavoriteUmaIdToStore(
  favoriteUmaId: string
) {
  await setStoredValue(
    getAppStoreKey("favoriteUmaId"),
    favoriteUmaId
  )
}

export async function loadCmViewModeFromStore(): Promise<
  "detailed" | "compact" | null
> {
  const savedMode =
    await getStoredValue<string>(
      getAppStoreKey("cmViewMode")
    )

  if (
    savedMode === "detailed" ||
    savedMode === "compact"
  ) {
    return savedMode
  }

  return null
}

export async function saveCmViewModeToStore(
  cmViewMode: "detailed" | "compact"
) {
  await setStoredValue(
    getAppStoreKey("cmViewMode"),
    cmViewMode
  )
}

export type SavedCustomUmaDatabase = {
  customCharacters: UmaCharacter[]
  customVersions: UmaVersion[]
  archivedVersionIds: string[]
}

export async function loadCustomUmaDatabaseFromStore(): Promise<
  SavedCustomUmaDatabase | null
> {
  const savedDatabase =
    await getStoredValue<SavedCustomUmaDatabase>(
      getAppStoreKey("customUmaDatabase")
    )

  if (!savedDatabase) {
    return null
  }

  if (
    !Array.isArray(
      savedDatabase.customCharacters
    ) ||
    !Array.isArray(
      savedDatabase.customVersions
    ) ||
    !Array.isArray(
      savedDatabase.archivedVersionIds
    )
  ) {
    return null
  }

  return savedDatabase
}

export async function saveCustomUmaDatabaseToStore(
  database: SavedCustomUmaDatabase
) {
  await setStoredValue(
    getAppStoreKey("customUmaDatabase"),
    database
  )
}

export async function loadSeenOfficialVersionIdsFromStore(): Promise<
  string[] | null
> {
  const savedIds =
    await getStoredValue<unknown>(
      getAppStoreKey(
        "seenOfficialVersionIds"
      )
    )

  if (
    !Array.isArray(savedIds) ||
    !savedIds.every(
      (id) => typeof id === "string"
    )
  ) {
    return null
  }

  return savedIds
}

export async function saveSeenOfficialVersionIdsToStore(
  ids: string[]
) {
  await setStoredValue(
    getAppStoreKey(
      "seenOfficialVersionIds"
    ),
    ids
  )
}