import { UmaDetailPerformanceTable } from "./UmaDistancePerformance"
import type { TrackOverviewMetadata } from "./trackOverviewStatistics"

export default function TrackGlobalMetadataPerformance({ performance }: { performance: TrackOverviewMetadata }) {
  const cards = [
    { id: "condition", title: "Ground Condition", label: "Condition", metadata: "ground condition", ...performance.conditions },
    { id: "season", title: "Season", label: "Season", metadata: "season", ...performance.seasons },
    { id: "direction", title: "Direction", label: "Direction", metadata: "direction", ...performance.directions },
    { id: "weather", title: "Weather", label: "Weather", metadata: "weather", ...performance.weather },
  ] as const
  return <div className="track-conditions-grid">{cards.map(card => <section key={card.id} className="track-condition-group" aria-label={`${card.title} performance`}>
    <UmaDetailPerformanceTable label={card.label} rows={card.rows.filter(row => row.label !== "Yielding")} />
    {card.unknownRaces > 0 && <p className="uma-statistics-summary-note">{card.unknownRaces.toLocaleString("en")} races have no valid recorded {card.metadata} and are excluded here.</p>}
  </section>)}</div>
}
