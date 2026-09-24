import { createContext, useContext } from "react"
import type { Dispatch, SetStateAction } from "react"
import type { UmaCharacter, UmaVersion } from "../types/types"

export type UmaDatabaseContextValue = {
  // Finalna lista widoczna dla aplikacji
  characters: UmaCharacter[]
  versions: UmaVersion[]
  newOfficialVersions: UmaVersion[]
  markOfficialVersionsAsSeen: (ids: string[]) => void
  
  // Dane dodane przez użytkownika
  customCharacters: UmaCharacter[]
  customVersions: UmaVersion[]
  

  setCustomCharacters: Dispatch<SetStateAction<UmaCharacter[]>>
  setCustomVersions: Dispatch<SetStateAction<UmaVersion[]>>

  archivedVersionIds: string[]

  archiveVersion: (id: string) => void
  unarchiveVersion: (id: string) => void

  // Pomocnicze sprawdzanie źródła
  isCustomCharacter: (id: string) => boolean
  isCustomVersion: (id: string) => boolean

  // Czy dla customa istnieje już oficjalny odpowiednik o tym samym ID
  hasOfficialCharacterMatch: (id: string) => boolean
  hasOfficialVersionMatch: (id: string) => boolean
}

export const UmaDatabaseContext =
  createContext<UmaDatabaseContextValue | null>(null)

export function useUmaDatabase() {
  const context = useContext(UmaDatabaseContext)

  if (!context) {
    throw new Error(
      "useUmaDatabase must be used inside UmaDatabaseProvider"
    )
  }

  return context
}