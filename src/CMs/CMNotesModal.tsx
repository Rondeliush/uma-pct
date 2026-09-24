import { useEffect, useState } from "react"
import type { CM } from "../types/types"
import ModalPortal from "../components/ModalPortal"

type CMNotesModalProps = {
  cm: CM
  onClose: () => void
  onSave: (notes: string) => void
}

function CMNotesModal({
  cm,
  onClose,
  onSave,
}: CMNotesModalProps) {
  const [notes, setNotes] = useState(cm.notes ?? "")

  useEffect(() => {
    setNotes(cm.notes ?? "")
  }, [cm])

  const handleSave = () => {
    onSave(notes)
    onClose()
  }

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-200 flex items-center justify-center bg-black/70 px-4"
        onClick={onClose}
      >
        <div
          className="w-full max-w-2xl overflow-hidden rounded-2xl border border-blue-900/70 bg-gray-950 shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          {/* HEADER */}
          <div className="flex items-center justify-between border-b border-blue-950/80 px-6 py-5">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.18em] text-sky-400">
                CM{cm.number} Notes
              </div>

              <div className="mt-1 text-xl font-black text-white">
                {cm.name || "Unnamed CM"}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-lg font-bold text-gray-500 transition hover:bg-gray-800 hover:text-white"
              title="Close"
            >
              ×
            </button>
          </div>

          {/* NOTES */}
          <div className="p-6">
            <label
              htmlFor={`cm-${cm.number}-notes`}
              className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-gray-400"
            >
              Notes
            </label>

            <textarea
              id={`cm-${cm.number}-notes`}
              value={notes}
              onChange={(event) =>
                setNotes(event.target.value)
              }
              placeholder="Write notes about this Champions Meeting..."
              rows={10}
              autoFocus
              className="w-full resize-y rounded-xl border border-blue-900/70 bg-black/30 px-4 py-3 text-sm leading-6 text-gray-200 outline-none transition placeholder:text-gray-600 focus:border-sky-500 focus:ring-1 focus:ring-sky-500/30"
            />
          </div>

          {/* ACTIONS */}
          <div className="flex justify-end gap-3 border-t border-blue-950/80 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-700 px-5 py-2 text-sm font-bold text-gray-300 transition hover:bg-gray-800 hover:text-white"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="rounded-lg border border-sky-500 bg-blue-600 px-5 py-2 text-sm font-black text-white transition hover:bg-blue-500"
            >
              Save Notes
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}

export default CMNotesModal