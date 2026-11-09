import type { LoH, LoHLogEntry } from "./types"

export function getLoHCompletionLog(event: LoH): Omit<LoHLogEntry, "timestamp"> {
  return {
    id: `${event.id}-completed`, type: "completed", message: "LoH completed.",
    details: [event.extraStage?.result ? "Extra Stage completed." : "Main Stage completed without Extra Stage."],
  }
}

/** Older completed events have no recorded completion date; do not invent one or rewrite history. */
export function getLoHChangeLogEntries(event: LoH): (Omit<LoHLogEntry, "timestamp"> & { timestamp: string | null })[] {
  return event.completed && !event.log.some(entry => entry.type === "completed")
    ? [...event.log, { ...getLoHCompletionLog(event), timestamp: null }]
    : event.log
}
