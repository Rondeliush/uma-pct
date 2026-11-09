import type { UmaStyle } from "../../types/types"

export type UmaFormData = {
  id: string
  name: string
  style: UmaStyle | ""
  ace: boolean
  debuffer: boolean
  autoRun: boolean
}

export function createEmptyUmaFormData(): UmaFormData {
  return { id: "", name: "", style: "Runaway", ace: false, debuffer: false, autoRun: false }
}

export function isValidEventNumber(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0
}
