import { getStoredValue, setStoredValue } from "../storage/indexedDB"
import { getAppStoreKey } from "../storage/appStore"
import type { LoH } from "./types"

export async function loadLohsFromStore(): Promise<LoH[]> {
  return (
    (await getStoredValue<LoH[]>(
      getAppStoreKey("lohs")
    )) ?? []
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
