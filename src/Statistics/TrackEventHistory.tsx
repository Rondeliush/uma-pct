import { useMemo, useState } from "react"
import type { CM } from "../types/types"
import type { LoH } from "../LoH/types"
import EventTypeBadge from "../components/EventTypeBadge"
import { getIndividualTrackHistory } from "./trackIndividualStatistics"
import type { IndividualTrackHistoryRow } from "./trackIndividualStatistics"
import { formatUmaWinRate } from "./umaStatistics"
import HomeIcon from "../Home/HomeIcon"
import "./TrackEventHistory.css"

export default function TrackEventHistory({ cms, lohs, trackId, onOpenCm, onOpenLoH }: {
  cms: CM[]
  lohs: LoH[]
  trackId: string
  onOpenCm: (cmNumber: CM["number"]) => void
  onOpenLoH: (number: number) => void
}) {
  const [eventType, setEventType] = useState<"all" | "cm" | "loh">("all")
  const events = useMemo(() => getIndividualTrackHistory(cms, lohs, trackId), [cms, lohs, trackId])
  const visibleEvents = events.filter((event) => eventType === "all" || event.type === eventType)
  const emptyMessage = {
    all: "No recorded events for this track yet.",
    cm: "No Champions Meeting events recorded for this track.",
    loh: "No League of Heroes events recorded for this track.",
  }[eventType]
  const open = (event: IndividualTrackHistoryRow) => event.type === "cm" ? onOpenCm(event.number) : onOpenLoH(event.number)
  return (
    <section className="uma-statistics-panel track-event-history" aria-labelledby="track-detail-history-title">
      <div className="uma-statistics-section-heading">
        <h2 id="track-detail-history-title"><HomeIcon name="clock" />Event History</h2>
        <div className="track-stats-scope track-event-type-filter" role="group" aria-label="Event History event type">
          {(["all", "cm", "loh"] as const).map((type) => <button key={type} type="button" aria-pressed={eventType === type} onClick={() => setEventType(type)}>
            {{ all: "All", cm: "CM", loh: "LoH" }[type]}
          </button>)}
        </div>
      </div>
      <div className="track-detail-history-scroll" role="region" aria-label="Track event history" tabIndex={0}>
        {visibleEvents.length > 0 ? <table className="uma-statistics-distance-table track-detail-history-table">
          <thead><tr>{["Event", "Distance", "Surface", "Direction", "Condition", "Weather", "Races", "Wins", "Win Rate"].map(label => <th key={label} scope="col">{label}</th>)}<th scope="col"><span className="sr-only">Open event</span></th></tr></thead>
          <tbody>
          {visibleEvents.map((event) => {
            const kind = event.type === "cm" ? "CM" : "LoH"
            const name = event.name?.trim() || `${kind} #${event.number}`
            return (
              <tr key={event.key} data-event-type={event.type} data-event-number={event.number} onClick={() => open(event)}>
                <th scope="row"><strong>{name}</strong><span className="track-history-event-meta"><EventTypeBadge type={event.type} /><span>{kind}{event.number}</span>{event.league && <small>{event.league === "Graded League" ? "Graded" : "Open"}</small>}</span></th>
                <td>{event.distance === null ? "\u2014" : `${event.distance}m`}</td><td>{event.surface ?? "\u2014"}</td><td>{event.direction ?? "\u2014"}</td><td>{event.condition ?? "\u2014"}</td><td>{event.weather ?? "\u2014"}</td>
                <td>{event.races.toLocaleString("en")}</td><td className="track-statistics-wins">{event.wins.toLocaleString("en")}</td><td className="uma-statistics-rate">{formatUmaWinRate(event.winRate)}</td>
                <td><button type="button" className="track-history-open" aria-label={`Open ${name} (${kind} ${event.number})`} onClick={change => { change.stopPropagation(); open(event) }}>
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m9 5 7 7-7 7" /></svg>
                </button></td>
              </tr>
            )
          })}
          </tbody>
        </table> : <p className="uma-statistics-summary-note" role="status">{emptyMessage}</p>}
      </div>
    </section>
  )
}
