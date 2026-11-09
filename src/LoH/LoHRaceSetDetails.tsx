import { useUmaDatabase } from "../context/UmaDatabaseContext"
import UmaAvatarImage from "../components/UmaAvatarImage"
import UmaResultPortrait from "../components/UmaResultPortrait"
import ParticipantConfigurationBadges from "../CMs/ParticipantConfigurationBadges"
import { snapshotParticipantConfiguration } from "../CMs/cmParticipantConfiguration"
import { EventChevronIcon } from "../components/EventIcons"
import { getLoHMainStage } from "./progress"
import { formatLoHNumber, formatLoHPlacement } from "./format"
import type { LoH, LoHCalculatedRaceSet } from "./types"
import LoHUmaName from "./components/LoHUmaName"

export function LoHRaceSetSummary({ set, polished = false }: { set: LoHCalculatedRaceSet; polished?: boolean }) {
  return <>
    <span className={`loh-day-set-heading flex min-w-0 flex-wrap gap-x-2 text-sm font-bold text-white ${polished ? "items-center gap-y-1 sm:text-base" : "items-baseline gap-y-0.5"}`}><span className="loh-day-set-number whitespace-nowrap">Set #{set.setNumber}</span>{polished && <span aria-hidden="true" className="loh-day-set-divider h-4 w-px bg-rose-200/30" />}<span className="loh-day-set-races whitespace-nowrap text-xs font-medium text-slate-300">{formatLoHNumber(set.races.length)} Races</span><span className={`loh-day-set-mode ${polished ? `rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${set.ticketUsed ? "border-rose-300/15 bg-rose-300/10 text-rose-200" : "border-violet-300/15 bg-violet-300/15 text-violet-200"}` : "text-[11px] font-semibold uppercase tracking-wider text-slate-400"}`}>{set.ticketUsed ? "Ticket" : "Free"}</span></span>
    <span className={`loh-day-set-conditions col-span-2 row-start-2 text-xs sm:col-span-1 sm:col-start-2 sm:row-start-1 ${polished ? "font-medium text-slate-300" : "text-slate-400"}`}>{set.weather ?? "Weather unknown"} · {set.condition ?? "Condition unknown"}</span>
    <span className={`loh-day-set-score col-start-2 row-start-1 flex items-center gap-2 whitespace-nowrap text-sm font-black tabular-nums sm:col-start-3 ${polished ? "text-rose-300 sm:text-base" : "text-rose-200"}`}>+{formatLoHNumber(set.awardedScore)} PT<span className="h-4 w-4 transition-transform group-open/loh-set:rotate-90"><EventChevronIcon /></span></span>
  </>
}

type Props = { event: LoH; set: LoHCalculatedRaceSet; onEditSet: (id: string) => void; onDeleteSet: (id: string) => void; showcase?: boolean }

export default function LoHRaceSetDetails({ event, set, onEditSet, onDeleteSet, showcase = false }: Props) {
  const { versions } = useUmaDatabase()
  const editable = !event.completed && getLoHMainStage(event).days[set.day - 1].state === "active"
  return <div className={showcase ? "relative z-10 px-3 pb-4 sm:px-4" : "border-t border-white/[0.05] px-3 pb-4 pt-3"}>
    <div className={showcase ? "grid grid-cols-3 gap-2 sm:gap-3" : "grid grid-cols-3 gap-2"}>
      {set.lineupSnapshot.map((uma, index) => {
        const version = versions.find(item => item.id === uma.umaId)
        const points = set.races.reduce((sum, race) => sum + (race.placements.find(item => item.umaId === uma.umaId)?.rawPoints ?? 0), 0)
        const name = version?.displayName ?? uma.umaId
        return <div key={uma.umaId} data-loh-set-uma-card={showcase ? uma.umaId : undefined} className={showcase ? "loh-set-uma-card relative isolate flex min-w-0 flex-col overflow-hidden rounded-xl border border-rose-300/35 sm:min-h-[148px]" : "min-w-0 text-center"}>
        {showcase ? version?.avatar ? <UmaResultPortrait avatar={version.avatar} name={name}
          viewportClassName="relative mx-auto h-24 w-full overflow-hidden sm:absolute sm:bottom-0 sm:-left-[4%] sm:h-full sm:w-[52%]"
          imageClassName="h-[145px] sm:h-[225px]" /> : <div aria-hidden="true" className="flex h-24 items-center justify-center text-3xl text-rose-100/20 sm:absolute sm:inset-y-0 sm:w-[44%]">?</div>
          : version?.avatar && <UmaAvatarImage avatar={version.avatar} alt="" className="mx-auto h-10 w-10 rounded-lg object-cover" />}
        <div className={showcase ? "relative z-10 flex min-w-0 flex-1 flex-col px-2 pb-3 pt-1 sm:ml-[44%] sm:px-3 sm:py-3" : "contents"}>
        <p className={showcase ? "text-[8px] font-black uppercase tracking-[0.15em] text-amber-200/80 sm:text-[9px]" : "mt-1 text-[9px] font-bold uppercase tracking-wider text-rose-200/50"}>Uma {index + 1}</p>
        <p className={showcase ? "mt-1 min-h-8 text-[11px] font-black leading-tight text-white sm:text-sm" : "mt-1 text-[10px] font-bold leading-4 text-slate-200"}><LoHUmaName name={name} /></p>
        <div data-loh-set-configuration={uma.umaId} className={`mt-2 flex flex-wrap gap-1 ${showcase ? "" : "justify-center"}`}>
          <ParticipantConfigurationBadges configuration={snapshotParticipantConfiguration(uma)} compact />
        </div>
        <p data-loh-set-uma-points={uma.umaId} data-raw-points={points} aria-label={`${name}: ${formatLoHNumber(points)} raw points in this set`} className={showcase ? "mt-auto border-t border-rose-300/25 pt-2 text-xl font-black italic tabular-nums leading-none text-amber-200 sm:text-2xl" : "mt-2 text-sm font-black tabular-nums text-amber-200"}>{formatLoHNumber(points)} <span className="text-[10px] font-bold not-italic text-amber-100/75">PT</span></p>
        </div>
      </div> })}
    </div>
    <p className={`leading-5 ${showcase ? "mb-3 mt-3 text-[11px] text-slate-400" : "mt-4 text-[10px] text-slate-500"}`}>{new Date(set.createdAt).toLocaleString()} · {set.weather ?? "Weather unknown"} · {set.condition ?? "Condition unknown"}</p>
    <div className={showcase ? "loh-set-table-frame min-w-0 overflow-hidden rounded-xl border border-rose-400/40" : "mt-2 min-w-0"}>
      <table data-loh-set-table className={`w-full table-fixed text-center text-xs ${showcase ? "loh-set-result-table" : ""}`}>
        <colgroup><col className="w-[12%]" /><col className="w-[16%]" /><col className="w-[16%]" /><col className="w-[16%]" /><col className="w-[18%]" /><col className="w-[22%]" /></colgroup>
        <thead className={showcase ? "border-b border-rose-300/35 text-[9px] leading-4 text-rose-100 sm:text-xs" : "border-b border-white/[0.07] text-[9px] leading-3 text-slate-400"}><tr><th scope="col" className="px-0.5 py-2">Race</th>{set.lineupSnapshot.map((uma, index) => <th scope="col" key={uma.umaId} className="px-0.5 py-2"><span aria-hidden="true">Uma {index + 1}</span><span className="sr-only">{versions.find(item => item.id === uma.umaId)?.displayName ?? uma.umaId}</span></th>)}<th scope="col" className="px-0.5 py-2">Raw<br />PT</th><th scope="col" className="px-0.5 py-2">Awarded<br />PT</th></tr></thead>
        <tbody className="divide-y divide-white/[0.05]">{set.races.map((race, index) => <tr key={race.id}>
          <th scope="row" className="px-0.5 py-2 text-slate-400">{showcase ? <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-lg border border-white/15 bg-white/[0.045] px-1 text-xs font-bold text-slate-200">{index + 1}</span> : index + 1}</th>
          {set.lineupSnapshot.map(uma => <td key={uma.umaId} className={`px-0.5 py-2 text-white ${showcase ? "font-black italic sm:text-base" : "font-bold"}`}>{formatLoHPlacement(race.placements.find(item => item.umaId === uma.umaId)!.place)}</td>)}
          <td className={`px-0.5 py-2 tabular-nums text-slate-300 ${showcase ? "sm:text-sm" : ""}`}>{formatLoHNumber(race.rawScore)}</td><td className={`px-0.5 py-2 font-bold tabular-nums text-rose-200 ${showcase ? "sm:text-base" : ""}`}>{formatLoHNumber(race.awardedScore)}</td>
        </tr>)}</tbody>
      </table>
    </div>
    <p className={showcase ? "loh-set-total relative mt-4 rounded-xl border border-rose-300/15 py-3 pl-5 pr-3 text-xs leading-5 text-slate-200 sm:text-sm" : "mt-3 text-[11px] text-slate-400"}>Raw total: {formatLoHNumber(set.rawScore)} PT · League Score: {formatLoHNumber(set.scoreBefore)} → {formatLoHNumber(set.scoreAfter)}</p>
    {editable && <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button type="button" onClick={() => onEditSet(set.id)} aria-label={`Edit Race Set ${set.setNumber}`} className={showcase ? "loh-day-action min-h-10 rounded-lg px-4 text-xs font-bold text-rose-50 focus-visible:outline-2 focus-visible:outline-rose-300" : "min-h-10 rounded-lg border border-rose-900/60 px-4 text-xs font-bold text-rose-200 transition hover:border-rose-400 hover:bg-rose-950/40"}>Edit</button>
        <button type="button" onClick={() => onDeleteSet(set.id)} aria-label={`Delete Race Set ${set.setNumber}`} className="min-h-10 rounded-lg border border-red-900/50 px-4 text-xs font-bold text-red-300 transition hover:bg-red-950/40">Delete</button>
    </div>}
  </div>
}
