import { useState } from "react"
import { useUmaDatabase } from "../context/UmaDatabaseContext"
import ModalPortal from "../components/ModalPortal"

type AddUmaModalProps = {
  onClose: () => void
}

type AddUmaMode = "character" | "version"

function AddUmaModal({ onClose }: AddUmaModalProps) {
  const {
    characters,
    versions,
    setCustomCharacters,
    setCustomVersions,
    } = useUmaDatabase()

  const [mode, setMode] = useState<AddUmaMode>("character")

  const [characterName, setCharacterName] = useState("")
  const [baseCharacterId, setBaseCharacterId] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [versionName, setVersionName] = useState("")

  const [error, setError] = useState("")

  const createId = (value: string) => {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
  }

  const handleAddUma = () => {
    setError("")

    // NEW CHARACTER
    if (mode === "character") {
      const trimmedName = characterName.trim()

      if (trimmedName === "") {
        setError("Please enter Character Name.")
        return
      }

      const characterAlreadyExists = characters.some(
        (character) =>
          character.name.toLowerCase() === trimmedName.toLowerCase()
      )

      if (characterAlreadyExists) {
        setError("This character already exists.")
        return
      }

      const characterId = createId(trimmedName)
      const versionId = `${characterId}-original`

      setCustomCharacters((current) => [
        ...current,
        {
            id: characterId,
            name: trimmedName,
        },
        ])

      setCustomVersions((current) => [
        ...current,
        {
          id: versionId,
          characterId,
          displayName: trimmedName,
          versionName: "Original",
          archived: false,
        },
      ])

      onClose()
      return
    }

    // NEW VERSION / ALT
    if (mode === "version") {
      if (baseCharacterId === "") {
        setError("Please select Base Character.")
        return
      }

      const trimmedDisplayName = displayName.trim()
      const trimmedVersionName = versionName.trim()

      if (trimmedDisplayName === "") {
        setError("Please enter Display Name.")
        return
      }

      if (trimmedVersionName === "") {
        setError("Please enter Version Name.")
        return
      }

      const versionAlreadyExists = versions.some(
        (version) =>
          version.characterId === baseCharacterId &&
          version.versionName.toLowerCase() ===
            trimmedVersionName.toLowerCase()
      )

      if (versionAlreadyExists) {
        setError("This version already exists for this character.")
        return
      }

      const versionId =
        `${baseCharacterId}-${createId(trimmedVersionName)}`

      setCustomVersions((current) => [
        ...current,
        {
          id: versionId,
          characterId: baseCharacterId,
          displayName: trimmedDisplayName,
          versionName: trimmedVersionName,
          archived: false,
        },
      ])

      onClose()
    }
  }

  return (
  <ModalPortal>
    <div className="fixed inset-0 z-200 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-xl border border-sky-400/15 bg-[#081321] shadow-[0_24px_70px_rgba(0,0,0,0.65)]">

        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
          <div>
            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-sky-300/45">
              Uma Database
            </div>

            <div className="mt-0.5 text-lg font-black text-white">
              Add Custom Uma
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.07] text-blue-100/35 transition hover:bg-white/[0.04] hover:text-white"
            aria-label="Close"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12" />
              <path d="M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4">

          {/* TYPE */}
          <div>
            <div className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-blue-100/30">
              Type
            </div>

            <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-white/[0.08] bg-black/15 p-1">

              <button
                type="button"
                onClick={() => {
                  setMode("character")
                  setError("")
                }}
                className={`relative rounded-md px-4 py-2.5 text-sm font-bold transition ${
                  mode === "character"
                    ? "bg-sky-400/[0.09] text-sky-200"
                    : "text-blue-100/55 hover:bg-white/[0.03] hover:text-white"
                }`}
              >
                New Character

                {mode === "character" && (
                  <span className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.55)]" />
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode("version")
                  setError("")
                }}
                className={`relative rounded-md px-4 py-2.5 text-sm font-bold transition ${
                  mode === "version"
                    ? "bg-sky-400/[0.09] text-sky-200"
                    : "text-blue-100/55 hover:bg-white/[0.03] hover:text-white"
                }`}
              >
                New Version / Alt

                {mode === "version" && (
                  <span className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.55)]" />
                )}
              </button>

            </div>
          </div>

          {/* NEW CHARACTER */}
          {mode === "character" && (
            <div className="mt-5">
              <label className="mb-1.5 block text-xs font-bold text-blue-100/55">
                Character Name
              </label>

              <input
                type="text"
                value={characterName}
                onChange={(e) =>
                  setCharacterName(e.target.value)
                }
                placeholder="Aston Machan"
                className="h-10 w-full rounded-lg border border-white/[0.08] bg-black/20 px-3.5 text-sm font-medium text-white outline-none placeholder:text-blue-100/25 focus:border-sky-400/40 focus:bg-black/25"
              />
            </div>
          )}

          {/* NEW VERSION */}
          {mode === "version" && (
            <div className="mt-5 space-y-4">

              <div>
                <label className="mb-1.5 block text-xs font-bold text-blue-100/55">
                  Base Character
                </label>

                <select
                  value={baseCharacterId}
                  onChange={(e) =>
                    setBaseCharacterId(
                      e.target.value
                    )
                  }
                  className="h-10 w-full rounded-lg border border-white/[0.08] bg-[#0b1727] px-3.5 text-sm font-medium text-white outline-none focus:border-sky-400/40"
                >
                  <option value="">
                    Select Character
                  </option>

                  {characters.map((character) => (
                    <option
                      key={character.id}
                      value={character.id}
                    >
                      {character.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-blue-100/55">
                  Display Name
                </label>

                <input
                  type="text"
                  value={displayName}
                  onChange={(e) =>
                    setDisplayName(e.target.value)
                  }
                  placeholder="Nice Nature (Cheerleader)"
                  className="h-10 w-full rounded-lg border border-white/[0.08] bg-black/20 px-3.5 text-sm font-medium text-white outline-none placeholder:text-blue-100/25 focus:border-sky-400/40 focus:bg-black/25"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-blue-100/55">
                  Version Name
                </label>

                <input
                  type="text"
                  value={versionName}
                  onChange={(e) =>
                    setVersionName(e.target.value)
                  }
                  placeholder="Cheerleader"
                  className="h-10 w-full rounded-lg border border-white/[0.08] bg-black/20 px-3.5 text-sm font-medium text-white outline-none placeholder:text-blue-100/25 focus:border-sky-400/40 focus:bg-black/25"
                />
              </div>

            </div>
          )}

          {/* ERROR */}
          {error && (
            <div className="mt-4 border-l-2 border-red-400/45 bg-red-400/[0.04] px-3 py-2.5 text-xs font-medium text-red-100/70">
              {error}
            </div>
          )}

        </div>

        {/* ACTIONS */}
        <div className="flex justify-end gap-2 border-t border-white/[0.06] px-5 py-3">

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/[0.08] px-4 py-2 text-xs font-bold text-blue-100/55 transition hover:bg-white/[0.04] hover:text-white"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleAddUma}
            className="flex items-center gap-1.5 rounded-lg border border-sky-400/30 bg-sky-400/[0.07] px-4 py-2 text-xs font-bold text-sky-200 transition hover:border-sky-300/50 hover:bg-sky-400/[0.12] hover:text-white"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>

            Add Custom Uma
          </button>

        </div>
      </div>
    </div>
  </ModalPortal>
)
}

export default AddUmaModal