import { useEffect, useState } from "react"
import { getStoredValue, setStoredValue } from "../storage/indexedDB"
import type { LoHViewMode } from "./overview"

/** Profile-local UI preference; event data and CM's view setting are independent. */
export function useLoHViewMode(profileId: string | null) {
  const [preference, setPreference] = useState<{ profileId: string | null; mode: LoHViewMode } | null>(null)
  useEffect(() => {
    let active = true
    if (profileId) void getStoredValue<LoHViewMode>(`profile:${profileId}:loh:view-mode`).then(value => {
      if (active) setPreference(current => current?.profileId === profileId ? current : { profileId, mode: value === "compact" ? "compact" : "detailed" })
    })
    return () => { active = false }
  }, [profileId])
  const mode = preference?.profileId === profileId ? preference.mode : "detailed"
  function changeMode(next: LoHViewMode) {
    setPreference({ profileId, mode: next })
    if (profileId) void setStoredValue(`profile:${profileId}:loh:view-mode`, next)
  }
  return [mode, changeMode] as const
}
