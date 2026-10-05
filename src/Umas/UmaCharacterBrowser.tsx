import UmaAvatarImage from "../components/UmaAvatarImage"
import type { UmaCharacter, UmaVersion } from "../types/types"
import UmaDatabaseIcon from "./UmaDatabaseIcon"
import type { ViewMode } from "./UmaDatabaseToolbar"

export type CharacterEntry = {
  character: UmaCharacter
  versions: UmaVersion[]
  custom: boolean
}

type Props = {
  entries: CharacterEntry[]
  selectedCharacterId: string | null
  viewMode: ViewMode
  onSelect: (id: string) => void
  onResetFilters: () => void
}

export default function UmaCharacterBrowser({
  entries,
  selectedCharacterId,
  viewMode,
  onSelect,
  onResetFilters,
}: Props) {
  if (entries.length === 0) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center px-5 py-12 text-center">
        <UmaDatabaseIcon
          name="search"
          className="mb-4 h-8 w-8 text-sky-200/30"
        />
        <h2 className="text-base font-bold text-white">No Umas found</h2>
        <p className="mt-2 text-sm text-blue-100/55">
          Try another name or adjust your filters.
        </p>
        <button
          type="button"
          onClick={onResetFilters}
          className="mt-5 min-h-10 rounded-lg border border-sky-300/25 bg-sky-400/10 px-4 text-xs font-bold text-sky-200 hover:bg-sky-400/20 focus-visible:outline-2 focus-visible:outline-cyan-300"
        >
          Reset filters
        </button>
      </div>
    )
  }

  return (
    <div
      aria-label="Uma characters"
      className={
        viewMode === "grid"
          ? "grid grid-cols-2 gap-2.5 p-3 min-[480px]:grid-cols-3 sm:grid-cols-4 sm:gap-3 sm:p-4 md:grid-cols-5 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7"
          : "space-y-1.5 p-3 sm:p-4"
      }
    >
      {entries.map(({ character, versions, custom }) => {
        const selected = selectedCharacterId === character.id
        const avatar = versions.find((version) => version.avatar)?.avatar
        const archived = versions.every((version) => version.archived)
        return (
          <button
            key={character.id}
            type="button"
            onClick={() => onSelect(character.id)}
            aria-pressed={selected}
            aria-label={`${character.name}, ${versions.length} ${versions.length === 1 ? "version" : "versions"}`}
            title={character.name}
            className={`group min-w-0 overflow-hidden rounded-lg border text-left transition duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 motion-reduce:transition-none ${viewMode === "grid" ? "flex flex-col motion-safe:hover:-translate-y-0.5" : "flex w-full items-center gap-3 p-2"} ${selected ? "border-cyan-400 bg-[#0b2131] shadow-[0_0_12px_rgba(34,211,238,0.16)]" : "border-sky-200/15 bg-[#081523] hover:border-sky-300/40 hover:bg-[#102234]"}`}
          >
            <div
              className={`relative flex shrink-0 items-center justify-center overflow-hidden bg-sky-300/[0.05] ${viewMode === "grid" ? "aspect-square w-full sm:aspect-[4/3]" : "h-14 w-14 rounded-md"}`}
            >
              {avatar ? (
                <UmaAvatarImage
                  avatar={avatar}
                  alt=""
                  loading="lazy"
                  className={`h-full w-full object-cover object-top ${archived ? "opacity-60 saturate-50" : ""}`}
                />
              ) : (
                <span className="text-3xl font-black text-sky-200/30">
                  {character.name.charAt(0).toUpperCase()}
                </span>
              )}
              {custom && (
                <span
                  title="Custom character"
                  className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-violet-300/50 bg-[#101329]/90 text-xs font-bold text-violet-200"
                  aria-label="Custom character"
                >
                  C
                </span>
              )}
              {archived && (
                <span
                  title="Archived"
                  className="absolute bottom-1.5 right-1.5 rounded-md border border-amber-300/20 bg-[#07111f]/90 p-1 text-amber-200"
                >
                  <UmaDatabaseIcon name="archive" className="h-3 w-3" />
                </span>
              )}
            </div>
            <div
              className={`min-w-0 ${viewMode === "grid" ? "w-full px-1.5 py-2.5 text-center" : "flex-1"}`}
            >
              <div
                className={`truncate text-xs font-bold ${selected ? "text-cyan-100" : "text-white/90"}`}
              >
                {character.name}
              </div>
              <div
                className={`mt-1 text-[11px] ${selected ? "text-cyan-300" : "text-blue-100/55"}`}
              >
                {versions.length}{" "}
                {versions.length === 1 ? "version" : "versions"}
              </div>
            </div>
            {viewMode === "list" && (
              <UmaDatabaseIcon
                name="chevron"
                className={`mr-1 h-4 w-4 shrink-0 ${selected ? "text-cyan-300" : "text-blue-100/40"}`}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
