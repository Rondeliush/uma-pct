import type { LoH } from "./types"

type Props = { event: LoH; onEdit: () => void; onNotes: () => void; onDelete: () => void; compact?: boolean }

export default function LoHCardActions({ event, onEdit, onNotes, onDelete, compact = false }: Props) {
  const size = compact ? "h-8 w-8 text-sm" : "h-9 w-9 text-base"
  const base = `flex shrink-0 items-center justify-center rounded-lg border transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300 ${size}`
  return <>
    <button type="button" onClick={click => { click.stopPropagation(); onEdit() }} className={`${base} border-rose-900/70 bg-gray-950/60 text-gray-400 hover:border-rose-500 hover:bg-rose-950 hover:text-white`} title="Edit LoH" aria-label={`Edit LOH${event.number}`}>✏️</button>
    <button type="button" onClick={click => { click.stopPropagation(); onNotes() }} className={`${base} ${event.notes?.trim() ? "border-rose-400 bg-rose-500/25 text-rose-100 shadow-[0_0_10px_rgba(244,63,94,0.45)] hover:bg-rose-500/35" : "border-rose-900/70 bg-gray-950/60 text-gray-500 hover:border-rose-500 hover:bg-rose-950 hover:text-white"}`} title={event.notes?.trim() ? "View Notes" : "Add Notes"} aria-label={`Notes for LOH${event.number}`}>📝</button>
    <button type="button" onClick={click => { click.stopPropagation(); onDelete() }} className={`${base} border-red-950/70 bg-gray-950/60 text-red-400 hover:border-red-500 hover:bg-red-950 hover:text-red-200`} title="Delete LoH" aria-label={`Delete LOH${event.number}`}>🗑️</button>
  </>
}
