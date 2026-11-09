import { useId, useState } from "react"
import type { LoH } from "./types"
import LoHModalFrame from "./LoHModalFrame"

type Props = { event: LoH; onClose: () => void; onSave: (notes: string) => void }

export default function LoHNotesModal({ event, onClose, onSave }: Props) {
  const [notes, setNotes] = useState(event.notes ?? "")
  const fieldId = useId()

  return <LoHModalFrame title={`LOH${event.number} Notes`} onClose={onClose} variant="notes">
    <div className="w-full">
      <div className="flex items-center justify-between border-b border-rose-950/80 px-6 py-5">
        <div className="min-w-0">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-rose-400">LOH{event.number} Notes</div>
          <div className="mt-1 break-words text-xl font-black text-white">{event.name || `League of Heroes #${event.number}`}</div>
        </div>
        <button type="button" onClick={onClose} aria-label={`Close LOH${event.number} Notes`} title="Close"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg font-bold text-gray-500 transition hover:bg-gray-800 hover:text-white">&times;</button>
      </div>
      <div className="p-6">
        <label htmlFor={fieldId} className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-gray-400">Notes</label>
        <textarea id={fieldId} value={notes} onChange={change => setNotes(change.target.value)}
          placeholder="Write notes about this League of Heroes..." rows={10} autoFocus
          className="w-full resize-y rounded-xl border border-rose-900/70 bg-black/30 px-4 py-3 text-sm leading-6 text-gray-200 outline-none transition placeholder:text-gray-600 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30" />
      </div>
      <div className="flex justify-end gap-3 border-t border-rose-950/80 px-6 py-4">
        <button type="button" onClick={onClose} className="rounded-lg border border-gray-700 px-5 py-2 text-sm font-bold text-gray-300 transition hover:bg-gray-800 hover:text-white">Cancel</button>
        <button type="button" onClick={() => { onSave(notes); onClose() }} className="rounded-lg border border-rose-500 bg-rose-600 px-5 py-2 text-sm font-black text-white transition hover:bg-rose-500">Save Notes</button>
      </div>
    </div>
  </LoHModalFrame>
}
