import { useState } from "react"
import type { LoH, LoHLogEntry } from "./types"
import LoHRaceHistory from "./LoHRaceHistory"
import { useUmaDatabase } from "../context/UmaDatabaseContext"
import { getLoHChangeLogEntries } from "./changeLog"

type Props = { event: LoH; initialDay?: number | null; onEditSet: (id: string) => void; onDeleteSet: (id: string) => void }

const logStyles = {
  created: { accent: "text-rose-300", dot: "border-rose-300/40 bg-rose-400/10", detail: "border-rose-300/15" },
  lineupUpdated: { accent: "text-rose-300", dot: "border-rose-300/40 bg-rose-400/10", detail: "border-rose-300/15" },
  eventUpdated: { accent: "text-blue-300", dot: "border-blue-300/40 bg-blue-400/10", detail: "border-blue-300/15" },
  raceSetSaved: { accent: "text-emerald-300", dot: "border-emerald-300/40 bg-emerald-400/10", detail: "border-emerald-300/15" },
  raceSetEdited: { accent: "text-amber-300", dot: "border-amber-300/40 bg-amber-400/10", detail: "border-amber-300/15" },
  leagueRankUpdated: { accent: "text-violet-300", dot: "border-violet-300/40 bg-violet-400/10", detail: "border-violet-300/15" },
  raceSetDeleted: { accent: "text-red-300", dot: "border-red-300/45 bg-red-400/10", detail: "border-red-300/15" },
  completed: { accent: "text-emerald-300", dot: "border-emerald-300/45 bg-emerald-400/10", detail: "border-emerald-300/15" },
} satisfies Record<LoHLogEntry["type"], { accent: string; dot: string; detail: string }>

function LogIcon({ type }: { type: LoHLogEntry["type"] }) {
  return <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {type === "raceSetSaved" ? <><path d="M5 19V5" /><path d="M5 6h11l-2 4 2 4H5" /></>
      : type === "raceSetEdited" || type === "eventUpdated" ? <><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" /></>
      : type === "leagueRankUpdated" ? <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /><path d="M12 2v3M22 12h-3M12 22v-3M2 12h3" /></>
      : type === "lineupUpdated" ? <><circle cx="9" cy="8" r="3" /><path d="M3.5 18c.8-3.2 2.6-5 5.5-5s4.7 1.8 5.5 5" /><circle cx="17" cy="9" r="2.5" /><path d="M15.5 14c2.8 0 4.5 1.3 5 4" /></>
      : type === "raceSetDeleted" ? <><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" /></>
      : type === "completed" ? <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></>
      : <path d="M12 5v14M5 12h14" />}
  </svg>
}

export default function LoHLog({ event, initialDay = null, onEditSet, onDeleteSet }: Props) {
  const { versions } = useUmaDatabase()
  const [activeTab, setActiveTab] = useState<"changes" | "races">(initialDay === null ? "changes" : "races")
  const [selectedDay, setSelectedDay] = useState(initialDay)
  const entries = getLoHChangeLogEntries(event)

  function detailText(detail: string) {
    for (const prefix of ["Removed: ", "Added: "]) if (detail.startsWith(prefix)) {
      const id = detail.slice(prefix.length)
      return `${prefix}${versions.find(version => version.id === id)?.displayName ?? id}`
    }
    return detail
  }

  return (
    <div className="px-5 py-5">
      <div className="mx-auto flex max-w-[460px] border-b border-white/[0.07]" aria-label="Event log views">
        {([{ id: "changes", label: "Change Log" }, { id: "races", label: "Race History" }] as const).map(tab => <button key={tab.id} type="button" aria-pressed={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} className={`relative flex h-10 flex-1 items-center justify-center text-sm font-bold transition ${activeTab === tab.id ? "text-rose-200" : "text-blue-100/40 hover:text-blue-100/75"}`}>
          {tab.label}
          {activeTab === tab.id && <span className="absolute bottom-0 left-1/2 h-0.5 w-20 -translate-x-1/2 bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.35)]" />}
        </button>)}
      </div>
      {activeTab === "races" ? <div className="mt-4 space-y-5">
        {selectedDay !== null && <div className="flex items-center justify-between text-xs"><p className="font-bold text-rose-200">Day {selectedDay}</p><button type="button" onClick={() => setSelectedDay(null)} className="min-h-10 rounded-lg border border-rose-900/60 px-3 font-bold text-rose-200 hover:border-rose-400">All days</button></div>}
        <LoHRaceHistory event={event} day={selectedDay} onEditSet={onEditSet} onDeleteSet={onDeleteSet} />
      </div> : entries.length === 0 ? <p className="mt-4 py-10 text-center text-sm font-medium text-blue-100/30">No change log was recorded for this event.</p> : <ol aria-label="Change log entries" className="loh-scrollbar mt-4 max-h-[55vh] space-y-1 overflow-y-auto pr-2">
        {entries.map(entry => {
          const style = logStyles[entry.type]
          return <li key={entry.id} data-loh-log-type={entry.type} className="group relative flex gap-3 border-b border-white/[0.045] px-1 py-3 transition last:border-b-0 hover:bg-white/[0.018]">
            <div className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${style.dot} ${style.accent}`}><LogIcon type={entry.type} /></div>
            <div className="min-w-0 flex-1 pb-1">
              <div className="flex flex-col items-start justify-between gap-1 sm:flex-row sm:gap-4">
                <p className={`text-sm font-black [overflow-wrap:anywhere] ${style.accent}`}>{entry.message}</p>
                {entry.timestamp === null
                  ? <span className="shrink-0 pt-0.5 text-[10px] font-medium text-blue-100/25">Date not recorded</span>
                  : <time dateTime={entry.timestamp} className="shrink-0 pt-0.5 text-[10px] font-medium text-blue-100/25">{new Date(entry.timestamp).toLocaleString()}</time>}
              </div>
              {!!entry.details?.length && <div className={`mt-2 space-y-1 border-l pl-3 text-xs font-medium text-blue-100/45 [overflow-wrap:anywhere] ${style.detail}`}>
                {entry.details.map((detail, index) => <p key={index}>{detailText(detail)}</p>)}
              </div>}
            </div>
          </li>
        })}
      </ol>}
    </div>
  )
}
