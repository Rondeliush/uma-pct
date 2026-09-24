import type {
  UmaCharacter,
  UmaVersion,
} from "../types/types"

import database from "./uma-database.json"

type BuiltInUmaDatabase = {
  latestAddedVersionIds: string[]
  characters: UmaCharacter[]
  versions: UmaVersion[]
}

const builtInUmaDatabase =
  database as BuiltInUmaDatabase

export const umaCharacters =
  builtInUmaDatabase.characters

export const umaVersions =
  builtInUmaDatabase.versions

export const latestAddedUmaVersions =
  builtInUmaDatabase.versions.filter(
    (version) =>
      builtInUmaDatabase.latestAddedVersionIds.includes(
        version.id
      )
  )