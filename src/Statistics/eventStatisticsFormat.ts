import { formatLoHNumber } from "../LoH/format"

export const eventCount = (value: number | null) => value === null ? "—" : formatLoHNumber(value)
