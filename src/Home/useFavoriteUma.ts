import { useEffect, useState } from "react"
import { loadProfileData, updateProfileData } from "../profiles/profileDataStore"
import { loadFavoriteUmaIdFromStore, saveFavoriteUmaIdToStore } from "../storage/appStore"

export default function useFavoriteUma(profileId: string | null) {
  const [loaded, setLoaded] = useState<{ profile: string | null | undefined; id: string }>({ profile: undefined, id: "" })
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const id = profileId ? (await loadProfileData(profileId))?.favoriteUmaId ?? "" : await loadFavoriteUmaIdFromStore()
      if (!cancelled) setLoaded({ profile: profileId, id })
    })()
    return () => { cancelled = true }
  }, [profileId])
  const ready = loaded.profile === profileId
  const change = async (id: string) => {
    if (!ready) return
    if (profileId) await updateProfileData(profileId, current => ({ ...current, favoriteUmaId: id }))
    else await saveFavoriteUmaIdToStore(id)
    setLoaded({ profile: profileId, id })
  }
  return { id: ready ? loaded.id : "", ready, change }
}
