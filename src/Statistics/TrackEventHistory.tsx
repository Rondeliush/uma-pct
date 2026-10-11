import { useMemo, useState } from "react"
import type { CM } from "../types/types"
import EventTypeBadge from "../components/EventTypeBadge"
import { getTrackEventHistory } from "./trackEventHistoryStatistics"
import { formatUmaWinRate } from "./umaStatistics"
import "./TrackEventHistory.css"

export default function TrackEventHistory({ cms, trackId, onOpenCm }: {
  cms: CM[]
  trackId: string
  onOpenCm: (cmNumber: CM["number"]) => void
}) {
  const [eventType, setEventType] = useState<"all" | "cm" | "loh">("all")
  const events = useMemo(() => getTrackEventHistory(cms, trackId).map((event) => ({ ...event, type: "cm" as const })), [cms, trackId])
  const visibleEvents = events.filter((event) => eventType === "all" || event.type === eventType)
  const emptyMessage = {
    all: "No recorded events for this track yet.",
    cm: "No Champions Meeting events recorded for this track.",
    loh: "No League of Heroes events recorded for this track.",
  }[eventType]
  return (
    <section className="uma-statistics-panel track-event-history" aria-labelledby="track-detail-history-title">
      <div className="uma-statistics-section-heading">
        <h2 id="track-detail-history-title">Event History</h2>
        <div className="uma-event-type-switch track-event-type-filter" role="group" aria-label="Event History event type">
          {(["all", "cm", "loh"] as const).map((type) => <button key={type} type="button" aria-pressed={eventType === type} onClick={() => setEventType(type)}>
            {{ all: "All", cm: "CM", loh: "LoH" }[type]}
          </button>)}
        </div>
      </div>
      {visibleEvents.length > 0 ? <>
        <div className="track-event-columns" aria-hidden="true">
          {["Event", "Distance", "Surface", "Direction", "Condition", "Weather", "Races", "Wins", "Win Rate"].map((label) => <span key={label}>{label}</span>)}
        </div>
        <ol className="uma-detail-events">
          {visibleEvents.map((event) => {
            const name = event.name?.trim() || `Champions Meeting ${event.number}`
            return (
              <li key={event.number} className="track-event-row" data-cm-number={event.number}>
                <button type="button" className="uma-detail-cm-open" aria-label={`Open ${name} (CM ${event.number})`} onClick={() => onOpenCm(event.number)}>
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m9 5 7 7-7 7" /></svg>
                </button>
                <h3>{name}{" "}<EventTypeBadge type={event.type} /></h3>
                <dl className="track-event-course">
                  <div><dt className="sr-only">Distance</dt><dd>{event.distance === null ? "—" : `${event.distance.toLocaleString("en")} m`}</dd></div>
                  <div><dt className="sr-only">Surface</dt><dd>{event.surface ?? "—"}</dd></div>
                  <div><dt className="sr-only">Direction</dt><dd>{event.direction ?? "—"}</dd></div>
                </dl>
                <dl className="track-event-conditions">
                  <div><dt className="sr-only">Condition</dt><dd>{event.condition ?? "—"}</dd></div>
                  <div><dt className="sr-only">Weather</dt><dd>{event.weather ?? "—"}</dd></div>
                </dl>
                <dl className="track-event-results">
                  <div><dt>Races</dt><dd>{event.races.toLocaleString("en")}</dd></div>
                  <div><dt>Wins</dt><dd>{event.wins.toLocaleString("en")}</dd></div>
                  <div><dt><span className="track-event-rate-full">Win Rate</span><span className="track-event-rate-short">WR</span></dt><dd className="uma-statistics-rate">{formatUmaWinRate(event.winRate)}</dd></div>
                </dl>
              </li>
            )
          })}
        </ol>
      </> : <p className="uma-statistics-summary-note" role="status">{emptyMessage}</p>}
    </section>
  )
}
