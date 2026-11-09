import { formatLoHNumber } from "./format"
import { getLoHOverviewStats } from "./overview"
import type { LoH } from "./types"
import LoHRaceFlagGraphic from "./components/LoHRaceFlagGraphic"

const icons = [
  <path d="m32 5 8 17 19 3-14 13 3 19-16-9-17 9 3-19L4 25l20-3L32 5Z" />,
  <LoHRaceFlagGraphic />,
  <path d="M20 8h24v8h10v7c0 9-6 16-15 18-1 5-3 8-5 10h10v5H20v-5h10c-2-2-4-5-5-10-9-2-15-9-15-18v-7h10V8Zm0 13h-5v2c0 6 3 10 9 12-2-4-3-9-4-14Zm24 0c-1 5-2 10-4 14 6-2 9-6 9-12v-2h-5Z" />,
  <g fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><circle cx="30" cy="34" r="20" /><circle cx="30" cy="34" r="12" /><circle cx="30" cy="34" r="4" fill="currentColor" stroke="none" /><path d="M31 33 49 15" /><path d="M43 15h6v6" /></g>,
]

export default function LoHOverviewStats({ events }: { events: LoH[] }) {
  const stats = getLoHOverviewStats(events)
  const cards = [
    { label: "LoH Events", value: formatLoHNumber(stats.events), color: "text-rose-400", border: "border-rose-900/60" },
    { label: "Race Wins", value: formatLoHNumber(stats.wins), color: "text-pink-400", border: "border-pink-900/60", title: "Wins recorded in Main Stage races" },
    { label: "Top #96 Finishes", value: formatLoHNumber(stats.top96Finishes), color: "text-red-300", border: "border-red-900/60", title: "LoH events with a confirmed final Main Stage rank from #1 to #96" },
    { label: "Average PT", value: formatLoHNumber(Number(stats.averagePoints.toFixed(2))), color: "text-rose-300", border: "border-rose-900/60", title: "Average League Score per LoH event, including ongoing events" },
  ]
  return <section aria-label="LoH overview statistics" className="mx-auto grid w-full max-w-[1050px] grid-cols-2 gap-2 xl:grid-cols-4 xl:gap-3">
    {cards.map((card, index) => <div key={card.label} data-loh-overview-stat={card.label} title={card.title} className={`relative overflow-hidden rounded-xl border bg-gray-950/75 p-4 shadow-xl md:rounded-2xl md:px-5 md:py-5 ${card.border} ${card.color}`}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-current to-transparent" />
      <p className="relative z-10 text-[10px] font-black uppercase tracking-[0.14em] md:text-xs md:tracking-[0.18em]">{card.label}</p>
      <p className="relative z-10 mt-1 text-2xl font-black tabular-nums text-white md:mt-2 md:text-3xl">{card.value}</p>
      <svg viewBox="0 0 64 64" fill="currentColor" aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 hidden h-16 w-16 -translate-y-1/2 opacity-20 md:block">{icons[index]}</svg>
    </div>)}
  </section>
}
