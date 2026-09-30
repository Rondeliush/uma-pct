import type { ProfileData } from "./profileDataStore"
import type { UmaVersion } from "../types/types"

export function getProfileAvatar(data: ProfileData | null, officialVersions: UmaVersion[]) {
  if (!data?.favoriteUmaId) return null
  return data.customUmaDatabase.customVersions.find((version) => version.id === data.favoriteUmaId)
    ?? officialVersions.find((version) => version.id === data.favoriteUmaId)
    ?? null
}
