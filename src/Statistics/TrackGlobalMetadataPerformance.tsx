import { useMemo } from "react"
import type { CM } from "../types/types"
import { UmaDetailPerformanceTable } from "./UmaDistancePerformance"
import { getGlobalTrackMetadataPerformance } from "./trackMetadataStatistics"

export default function TrackGlobalMetadataPerformance({ cms }: { cms: CM[] }) {
  const performance = useMemo(() => getGlobalTrackMetadataPerformance(cms), [cms])
  const cards = [
    { id: "condition", title: "Ground Condition", label: "Condition", metadata: "ground condition", ...performance.conditions },
    { id: "weather", title: "Weather", label: "Weather", metadata: "weather", ...performance.weather },
    { id: "season", title: "Season", label: "Season", metadata: "season", ...performance.seasons },
    { id: "direction", title: "Direction", label: "Direction", metadata: "direction", ...performance.directions },
  ]
  return (
    <div className="uma-statistics-summary-grid track-statistics-breakdowns">
      {cards.map((card) => (
        <section key={card.id} className="uma-statistics-panel" aria-labelledby={`track-statistics-${card.id}-title`}>
          <div className="uma-statistics-section-heading"><h2 id={`track-statistics-${card.id}-title`}>{card.title} Performance</h2></div>
          <UmaDetailPerformanceTable label={card.label} rows={card.rows} />
          {!card.rows.some((row) => row.races > 0) && card.unknownRaces === 0 && <p className="uma-statistics-summary-note">No recorded round races yet.</p>}
          {card.unknownRaces > 0 && <p className="uma-statistics-summary-note">{card.unknownRaces.toLocaleString("en")} races have no valid recorded {card.metadata} and are excluded here.</p>}
        </section>
      ))}
    </div>
  )
}
