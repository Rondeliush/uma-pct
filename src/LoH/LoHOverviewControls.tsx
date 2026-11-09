import { getLoHPageNumbers } from "./overview"
import type { LoHSortMode, LoHViewMode } from "./overview"

type Props = { onAdd: () => void; filtersOpen: boolean; onToggleFilters: () => void; filterCount: number; sort: LoHSortMode; onSort: (sort: LoHSortMode) => void; page: number; totalPages: number; onPage: (page: number) => void; view: LoHViewMode; onView: (mode: LoHViewMode) => void; mobile?: boolean }

export function LoHPagination({ page, totalPages, onPage, mobile = false }: Pick<Props, "page" | "totalPages" | "onPage" | "mobile">) {
  if (mobile) {
    const button = "flex h-9 w-9 items-center justify-center rounded-lg border border-rose-950 bg-gray-900 text-gray-300 disabled:cursor-not-allowed disabled:opacity-30"
    return <nav aria-label="LoH pagination" className="flex items-center justify-center gap-2">
      <button type="button" aria-label="Previous LoH page" disabled={page === 1} onClick={() => onPage(page - 1)} className={button}>←</button>
      <span aria-live="polite" className="min-w-16 text-center text-sm font-bold text-gray-300">{page} / {totalPages}</span>
      <button type="button" aria-label="Next LoH page" disabled={page === totalPages} onClick={() => onPage(page + 1)} className={button}>→</button>
    </nav>
  }
  const button = "flex h-9 w-9 items-center justify-center rounded-lg border border-rose-950 bg-gray-900/90 text-sm font-bold text-gray-300 transition hover:border-rose-700 hover:bg-rose-950/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
  return <nav aria-label="LoH pagination" className="flex max-w-full items-center justify-center gap-1 rounded-xl border border-rose-950/70 bg-black/20 p-1">
    <button type="button" aria-label="Previous LoH page" disabled={page === 1} onClick={() => onPage(page - 1)} className={button}>←</button>
    {getLoHPageNumbers(page, totalPages).map((value, index) => value === "gap" ? <span key={`gap-${index}`} className="px-1 text-xs text-slate-500">…</span>
      : <button key={value} type="button" aria-label={`LoH page ${value}`} aria-current={value === page ? "page" : undefined} onClick={() => onPage(value)} className={`flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-sm font-bold transition ${value === page ? "border-rose-400 bg-rose-600 text-white shadow-lg shadow-rose-950/60" : "border-transparent text-gray-400 hover:border-rose-900 hover:bg-rose-950/40 hover:text-white"}`}>{value}</button>)}
    <button type="button" aria-label="Next LoH page" disabled={page === totalPages} onClick={() => onPage(page + 1)} className={button}>→</button>
  </nav>
}

export default function LoHOverviewControls({ onAdd, filtersOpen, onToggleFilters, filterCount, sort, onSort, page, totalPages, onPage, view, onView, mobile = false }: Props) {
  return <section aria-label="LoH overview controls" className={mobile ? "grid gap-2" : "grid items-center gap-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]"}>
    <div className={mobile ? "grid grid-cols-2 gap-2" : "flex flex-wrap items-center justify-self-start gap-2"}>
      <button type="button" onClick={onAdd} className="inline-flex items-center justify-center rounded-xl border border-rose-500/70 bg-gradient-to-b from-rose-950/95 to-slate-950/95 px-5 py-3 text-base font-bold text-rose-200 shadow-[0_0_12px_rgba(244,63,94,0.10),inset_0_1px_0_rgba(255,255,255,0.05)] transition hover:border-rose-300 hover:from-rose-900 hover:to-rose-950 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300">Add LoH</button>
      <button type="button" onClick={onToggleFilters} aria-expanded={filtersOpen} aria-controls="loh-overview-filters" className={`h-10 rounded-lg border text-sm font-semibold transition ${mobile ? "px-3" : "px-4"} ${filtersOpen ? `border-rose-400 bg-rose-600 text-white ${mobile ? "" : "shadow-lg shadow-rose-950/50"}` : mobile ? "border-rose-800/70 bg-gray-900 text-gray-300" : "border-rose-800/70 bg-gray-900 text-gray-300 hover:border-rose-500 hover:bg-rose-950 hover:text-white"}`}>
        ☰ Filters{filterCount > 0 && <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-100 px-1 text-xs font-black text-rose-950">{filterCount}</span>}
      </button>
      <select aria-label="Sort League of Heroes events" value={sort} onChange={change => onSort(change.target.value as LoHSortMode)} className={`col-span-2 h-10 min-w-0 rounded-lg border border-rose-800/70 bg-gray-900 px-3 text-sm font-semibold text-gray-300 outline-none hover:border-rose-500 focus:border-rose-400 ${mobile ? "w-full" : "transition hover:bg-rose-950"}`}>
        <option value="number-desc">LoH Number ↓</option><option value="number-asc">LoH Number ↑</option><option value="added-desc">Recently Added</option><option value="added-asc">Oldest Added</option><option value="score-desc">League Score ↓</option><option value="score-asc">League Score ↑</option><option value="rank-asc">Overall Rank ↑</option>
      </select>
    </div>
    <div className="order-3 justify-self-center lg:order-none"><LoHPagination page={page} totalPages={totalPages} onPage={onPage} mobile={mobile} /></div>
    <div className={mobile ? "" : "flex items-center gap-3 lg:justify-self-end"}>{!mobile && <span className="hidden text-sm font-semibold text-gray-500 sm:inline">View:</span>}<div role="group" aria-label="LoH view mode" className={mobile ? "flex w-full rounded-xl border border-rose-950 bg-gray-900/90 p-1" : "flex rounded-xl border border-rose-950 bg-gray-900/90 p-1"}>
      {(["detailed", "compact"] as const).map(mode => <button key={mode} type="button" aria-pressed={view === mode} onClick={() => onView(mode)} className={`rounded-lg py-2 text-sm font-bold transition ${mobile ? "flex-1 px-3" : "px-4"} ${view === mode ? `bg-rose-600 text-white ${mobile ? "" : "shadow-lg shadow-rose-950/50"}` : `text-gray-400 hover:text-white ${mobile ? "" : "hover:bg-rose-950/40"}`}`}>{mode === "detailed" ? "Detailed" : "Compact"}</button>)}
    </div></div>
  </section>
}
