import { useState } from "react"

type CreateProfileModalProps = {
  onCreate: (name: string) => void
  onClose: () => void
}

function CreateProfileModal({
  onCreate,
  onClose,
}: CreateProfileModalProps) {
  const [name, setName] = useState("")

  const trimmedName = name.trim()

  const handleCreate = () => {
    if (trimmedName === "") {
      return
    }

    onCreate(trimmedName)
  }

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-violet-300/20 bg-[#07111f] shadow-2xl">

        <div className="border-b border-white/[0.07] px-6 py-5">
          <div className="text-[10px] font-black uppercase tracking-[0.20em] text-violet-300/50">
            Trainer Profile
          </div>

          <div className="mt-1 text-xl font-black text-white">
            Create Profile
          </div>

          <div className="mt-1 text-sm text-blue-100/35">
            Enter a name for this trainer.
          </div>
        </div>

        <div className="px-6 py-5">
          <label className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-100/35">
            Profile Name
          </label>

          <input
            autoFocus
            type="text"
            value={name}
            maxLength={32}
            onChange={(event) =>
              setName(event.target.value)
            }
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                trimmedName !== ""
              ) {
                handleCreate()
              }

              if (event.key === "Escape") {
                onClose()
              }
            }}
            placeholder="Trainer name..."
            className="mt-2 h-11 w-full rounded-lg border border-violet-300/15 bg-[#030811] px-3 text-sm font-semibold text-white outline-none placeholder:text-blue-100/20 focus:border-violet-300/40"
          />

          <div className="mt-2 text-right text-[10px] text-blue-100/20">
            {name.length} / 32
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-white/[0.07] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/[0.08] px-4 py-2 text-xs font-bold text-blue-100/50 transition hover:border-white/[0.15] hover:text-white"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={trimmedName === ""}
            onClick={handleCreate}
            className="rounded-lg border border-violet-300/25 bg-violet-400/[0.10] px-4 py-2 text-xs font-black text-violet-200 transition hover:border-violet-300/45 hover:bg-violet-400/[0.16] disabled:cursor-not-allowed disabled:opacity-30"
          >
            Create Profile
          </button>
        </div>

      </div>
    </div>
  )
}

export default CreateProfileModal