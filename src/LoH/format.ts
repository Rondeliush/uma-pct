import { formatOrdinal } from "../formatting"
import type { LoHPlacement } from "./types"

export const formatLoHNumber = (value: number) => value.toLocaleString("en-US")
export const formatLoHPlacement = (place: LoHPlacement) => place === "6+" ? "6th+" : formatOrdinal(place)
