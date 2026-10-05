import UmaDatabaseIcon from "./UmaDatabaseIcon"

export type StatusFilter = "active" | "archived" | "all"
export type ViewMode = "grid" | "list"
export type SortOrder =
  | "name-az"
  | "name-za"
  | "most-versions"
  | "fewest-versions"

type Props = {
  searchText: string
  onSearchChange: (value: string) => void
  statusFilter: StatusFilter
  onStatusChange: (value: StatusFilter) => void
  statusCounts: Record<StatusFilter, number>
  showOfficial: boolean
  showCustom: boolean
  onToggleOfficial: () => void
  onToggleCustom: () => void
  characterCount: number
  versionCount: number
  viewMode: ViewMode
  onViewChange: (value: ViewMode) => void
  sortOrder: SortOrder
  onSortChange: (value: SortOrder) => void
  onAddUma: () => void
}

export default function UmaDatabaseToolbar({
  searchText,
  onSearchChange,
  statusFilter,
  onStatusChange,
  statusCounts,
  showOfficial,
  showCustom,
  onToggleOfficial,
  onToggleCustom,
  characterCount,
  versionCount,
  viewMode,
  onViewChange,
  sortOrder,
  onSortChange,
  onAddUma,
}: Props) {
  return (
    <div
      data-guide="uma-database-toolbar"
      className="rounded-xl border border-sky-300/15 bg-[#071321]/65 p-3 shadow-[0_8px_24px_rgba(0,0,0,0.16)] backdrop-blur-md sm:p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <UmaDatabaseIcon
            name="book"
            className="h-7 w-7 shrink-0 text-cyan-300"
          />
          <div className="min-w-0">
            <h1 className="text-lg font-black tracking-tight text-white sm:text-xl">
              Uma Database
            </h1>
            <p className="mt-0.5 hidden text-xs text-blue-100/60 sm:block">
              Browse and manage all Umas in your database.
            </p>
          </div>
        </div>
        <button
          type="button"
          aria-label="Add Custom Uma"
          onClick={onAddUma}
          className="flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-cyan-400/40 bg-cyan-400/[0.06] px-2.5 text-xs font-bold text-cyan-200 transition hover:border-cyan-300/70 hover:bg-cyan-400/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 sm:px-3"
        >
          <UmaDatabaseIcon name="plus" />
          <span className="sm:hidden">Add Custom</span>
          <span className="hidden sm:inline">Add Custom Uma</span>
        </button>
      </div>

      <div className="relative mt-3">
        <UmaDatabaseIcon
          name="search"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sky-200/55"
        />
        <input
          type="search"
          aria-label="Search Uma"
          value={searchText}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search Uma by name..."
          className="h-10 w-full rounded-lg border border-sky-200/15 bg-black/20 pl-9 pr-10 text-sm text-white outline-none placeholder:text-blue-100/40 focus:border-cyan-400/60"
        />
        {searchText && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => onSearchChange("")}
            className="absolute right-0 top-0 flex h-10 w-10 items-center justify-center rounded-r-lg text-blue-100/60 hover:text-white focus-visible:outline-2 focus-visible:outline-cyan-300"
          >
            <UmaDatabaseIcon name="close" />
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div
          role="group"
          aria-label="Uma status"
          className="flex items-center gap-1.5"
        >
          {(
            [
              ["all", "All"],
              ["active", "Active"],
              ["archived", "Archived"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={statusFilter === value}
              onClick={() => onStatusChange(value)}
              className={`min-h-9 rounded-lg border px-3 text-xs font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 ${statusFilter === value ? "border-sky-300/70 bg-sky-400 text-[#041321]" : "border-sky-200/15 bg-black/10 text-blue-100/70 hover:border-sky-300/40 hover:text-white"}`}
            >
              {label}
              <span className="ml-1 hidden text-[10px] opacity-75 sm:inline">
                ({statusCounts[value]})
              </span>
            </button>
          ))}
        </div>

        {/* Source filtering retains the existing Active-view behavior. */}
        {statusFilter === "active" && (
          <div
            role="group"
            aria-label="Uma source"
            className="flex items-center gap-1.5"
          >
            {(
              [
                ["Official", showOfficial, onToggleOfficial],
                ["Custom", showCustom, onToggleCustom],
              ] as const
            ).map(([label, checked, onToggle]) => (
              <button
                key={label}
                type="button"
                aria-pressed={checked}
                onClick={onToggle}
                className={`flex min-h-9 items-center gap-2 rounded-lg border px-2.5 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 ${checked ? (label === "Official" ? "border-emerald-300/25 bg-emerald-400/[0.06] text-emerald-200" : "border-sky-300/25 bg-sky-400/[0.06] text-sky-200") : "border-sky-200/10 text-blue-100/45 hover:text-white"}`}
              >
                <span
                  className={`flex h-3.5 w-3.5 items-center justify-center rounded-sm border ${checked ? (label === "Official" ? "border-emerald-300 bg-emerald-300 text-[#041321]" : "border-sky-300 bg-sky-300 text-[#041321]") : "border-current"}`}
                >
                  {checked && (
                    <UmaDatabaseIcon name="check" className="h-3 w-3" />
                  )}
                </span>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p role="status" className="text-[11px] text-blue-100/60">
          {characterCount} {characterCount === 1 ? "character" : "characters"}
          <span className="px-1.5 text-blue-100/30">·</span>
          {versionCount} {versionCount === 1 ? "version" : "versions"}
        </p>
        <div className="flex items-center gap-2">
          <select
            aria-label="Sort characters"
            value={sortOrder}
            onChange={(event) => onSortChange(event.target.value as SortOrder)}
            className="h-10 rounded-lg border border-sky-200/15 bg-[#081321] px-2 text-[11px] font-medium text-blue-100/70 outline-none focus:border-cyan-300/60"
          >
            <option value="name-az">Name A–Z</option>
            <option value="name-za">Name Z–A</option>
            <option value="most-versions">Most Versions</option>
            <option value="fewest-versions">Fewest Versions</option>
          </select>
          <div
            role="group"
            aria-label="Character view"
            className="flex rounded-lg border border-sky-200/15 bg-black/10 p-0.5 md:hidden"
          >
            {(["grid", "list"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-label={`${mode === "grid" ? "Grid" : "List"} view`}
                aria-pressed={viewMode === mode}
                onClick={() => onViewChange(mode)}
                className={`flex h-9 w-9 items-center justify-center rounded-md transition focus-visible:outline-2 focus-visible:outline-cyan-300 ${viewMode === mode ? "bg-cyan-400/15 text-cyan-300" : "text-blue-100/50 hover:bg-white/5 hover:text-white"}`}
              >
                <UmaDatabaseIcon name={mode} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
