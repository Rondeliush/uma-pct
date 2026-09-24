import { useEffect, useState } from "react"
import type { ReactNode } from "react"




import type {
  UmaCharacter,
  UmaVersion,
} from "../types/types"

import {
  umaCharacters,
  umaVersions,
} from "../data/umaData"


import { UmaDatabaseContext } from "./UmaDatabaseContext"

import {
  loadCustomUmaDatabaseFromStore,
  loadSeenOfficialVersionIdsFromStore,
  saveCustomUmaDatabaseToStore,
  saveSeenOfficialVersionIdsToStore,
} from "../storage/appStore"

import {
  loadProfileData,
  updateProfileData,
} from "../profiles/profileDataStore"

type UmaDatabaseProviderProps = {
  children: ReactNode
  profileId?: string | null
}

type SavedCustomUmaDatabase = {
  customCharacters: UmaCharacter[]
  customVersions: UmaVersion[]
  archivedVersionIds: string[]
}

function UmaDatabaseProvider({
  children,
  profileId = null,
}: UmaDatabaseProviderProps) {
const officialCharacters = umaCharacters
const officialVersions = umaVersions

  const [
    customCharacters,
    setCustomCharacters,
  ] = useState<UmaCharacter[]>([])

  const [
    customVersions,
    setCustomVersions,
  ] = useState<UmaVersion[]>([])

  const [
    archivedVersionIds,
    setArchivedVersionIds,
  ] = useState<string[]>([])

  const [
    seenOfficialVersionIds,
    setSeenOfficialVersionIds,
  ] = useState<string[]>([])

  const [
    isDatabaseStoreReady,
    setIsDatabaseStoreReady,
  ] = useState(false)

  const [
    loadedProfileId,
    setLoadedProfileId,
  ] = useState<
    string | null | undefined
  >(undefined)

  useEffect(() => {
    let cancelled = false

    const loadDatabase = async () => {
      setIsDatabaseStoreReady(false)
      setLoadedProfileId(undefined)

      if (profileId) {
        const profileData =
          await loadProfileData(profileId)

        if (
          cancelled ||
          !profileData
        ) {
          return
        }

        setCustomCharacters(
          profileData.customUmaDatabase
            .customCharacters
        )

        setCustomVersions(
          profileData.customUmaDatabase
            .customVersions
        )

        setArchivedVersionIds(
          profileData.customUmaDatabase
            .archivedVersionIds
        )

        setSeenOfficialVersionIds(
          profileData.seenOfficialVersionIds
        )

        setLoadedProfileId(profileId)
        setIsDatabaseStoreReady(true)

        return
      }

      const [
        storedDatabase,
        storedSeenOfficialVersionIds,
      ] = await Promise.all([
        loadCustomUmaDatabaseFromStore(),
        loadSeenOfficialVersionIdsFromStore(),
      ])

      if (cancelled) {
        return
      }

      if (storedDatabase) {
        setCustomCharacters(
          storedDatabase.customCharacters
        )

        setCustomVersions(
          storedDatabase.customVersions
        )

        setArchivedVersionIds(
          storedDatabase.archivedVersionIds
        )
      } else {
        const emptyDatabase: SavedCustomUmaDatabase = {
          customCharacters: [],
          customVersions: [],
          archivedVersionIds: [],
        }

        setCustomCharacters([])
        setCustomVersions([])
        setArchivedVersionIds([])

        await saveCustomUmaDatabaseToStore(
          emptyDatabase
        )
      }

      if (
        storedSeenOfficialVersionIds !== null
      ) {
        setSeenOfficialVersionIds(
          storedSeenOfficialVersionIds
        )
      } else {
       const currentOfficialVersionIds =
        officialVersions.map(
          (version) => version.id
        )

        setSeenOfficialVersionIds(
          currentOfficialVersionIds
        )

        await saveSeenOfficialVersionIdsToStore(
          currentOfficialVersionIds
        )
      }

      if (!cancelled) {
        setLoadedProfileId(null)
        setIsDatabaseStoreReady(true)
      }
    }

    void loadDatabase()

    return () => {
      cancelled = true
    }
  }, [profileId])

  // Finalna lista postaci używana przez aplikację.
  //
  // Jeśli Custom i Official mają to samo ID,
  // na razie pokazujemy Custom.
  // Official pozostaje dostępny jako potencjalny cel Merge.
  const characters: UmaCharacter[] = [
    ...officialCharacters.filter(
      (officialCharacter) =>
        !customCharacters.some(
          (customCharacter) =>
            customCharacter.id ===
            officialCharacter.id
        )
    ),
    ...customCharacters,
  ]

  // Łączymy oficjalne i customowe wersje.
  const mergedVersions: UmaVersion[] = [
    ...officialVersions.filter(
      (officialVersion) =>
        !customVersions.some(
          (customVersion) =>
            customVersion.id ===
            officialVersion.id
        )
    ),
    ...customVersions,
  ]

  // archived nie jest modyfikowane w umaData.ts.
  // Jest nakładane jako ustawienie użytkownika.
  const versions: UmaVersion[] =
    mergedVersions.map((version) => ({
      ...version,
      archived:
        archivedVersionIds.includes(
          version.id
        ),
    }))

  const isCustomCharacter = (
    id: string
  ) => {
    return customCharacters.some(
      (character) =>
        character.id === id
    )
  }

  const isCustomVersion = (
    id: string
  ) => {
    return customVersions.some(
      (version) =>
        version.id === id
    )
  }

  const hasOfficialCharacterMatch = (
    id: string
  ) => {
    return officialCharacters.some(
      (character) =>
        character.id === id
    )
  }

  const hasOfficialVersionMatch = (
    id: string
  ) => {
    return officialVersions.some(
      (version) =>
        version.id === id
    )
  }

  const archiveVersion = (
    id: string
  ) => {
    const isCustom =
      customVersions.some(
        (version) =>
          version.id === id
      )

    if (!isCustom) {
      return
    }

    setArchivedVersionIds(
      (current) =>
        current.includes(id)
          ? current
          : [...current, id]
    )
  }

  const unarchiveVersion = (
    id: string
  ) => {
    setArchivedVersionIds(
      (current) =>
        current.filter(
          (versionId) =>
            versionId !== id
        )
    )
  }

  const newOfficialVersions =
    officialVersions.filter(
      (version) =>
        !seenOfficialVersionIds.includes(
          version.id
        )
  )

  const markOfficialVersionsAsSeen = (
    ids: string[]
  ) => {
    setSeenOfficialVersionIds(
      (current) => [
        ...new Set([
          ...current,
          ...ids,
        ]),
      ]
    )
  }

  useEffect(() => {
    if (
      !isDatabaseStoreReady ||
      loadedProfileId !== profileId
    ) {
      return
    }

    if (profileId) {
      void updateProfileData(
        profileId,
        (currentData) => ({
          ...currentData,

          seenOfficialVersionIds: [
            ...seenOfficialVersionIds,
          ],
        })
      )

      return
    }

    void saveSeenOfficialVersionIdsToStore(
      seenOfficialVersionIds
    )
  }, [
    seenOfficialVersionIds,
    isDatabaseStoreReady,
    profileId,
    loadedProfileId,
  ])

  useEffect(() => {
    if (
      !isDatabaseStoreReady ||
      loadedProfileId !== profileId
    ) {
      return
    }

    const database: SavedCustomUmaDatabase = {
      customCharacters,
      customVersions,
      archivedVersionIds,
    }

    if (profileId) {
      void updateProfileData(
        profileId,
        (currentData) => ({
          ...currentData,
          customUmaDatabase: database,
        })
      )

      return
    }

    void saveCustomUmaDatabaseToStore(
      database
    )
  }, [
    customCharacters,
    customVersions,
    archivedVersionIds,
    isDatabaseStoreReady,
    profileId,
    loadedProfileId,
  ])

  return (
    <UmaDatabaseContext.Provider
      value={{
        characters,
        versions,
        newOfficialVersions,
        markOfficialVersionsAsSeen,

        customCharacters,
        customVersions,

        setCustomCharacters,
        setCustomVersions,

        archivedVersionIds,
        archiveVersion,
        unarchiveVersion,

        isCustomCharacter,
        isCustomVersion,

        hasOfficialCharacterMatch,
        hasOfficialVersionMatch,
      }}
    >
      {children}
    </UmaDatabaseContext.Provider>
  )
}

export default UmaDatabaseProvider