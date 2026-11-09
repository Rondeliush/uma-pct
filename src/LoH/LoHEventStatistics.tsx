import { useMemo, useState } from "react"
import HomeIcon from "../Home/HomeIcon"
import { formatUmaWinRate } from "../Statistics/umaStatistics"
import { EventHistory, EventIdentity, EventMetrics, EventPlacements, EventStatisticsCard, EventStatisticsPanel } from "../Statistics/EventStatisticsParts"
import { eventCount } from "../Statistics/eventStatisticsFormat"
import { filterLoHEventHistory, getLoHEventStatistics } from "./eventStatistics"
import type { LoHEventRecord } from "./eventStatistics"
import type { LoH } from "./types"
import { LOH_ENTRY_PLACEMENTS } from "./scoring"
import { formatLoHPlacement } from "./format"

function LoHHistory({ rows, onOpen }: { rows: LoHEventRecord[]; onOpen: (number: number) => void }) {
  const [search, setSearch] = useState("")
  const [tier, setTier] = useState("all")
  const [status, setStatus] = useState("all")
  const visible = filterLoHEventHistory(rows, search, tier, status)
  const tiers = [...new Set(rows.map(row => row.leagueRank.split(" ")[0]))]
  return <EventHistory kind="LoH" count={visible.length} total={rows.length} filters={<>
    <input aria-label="Search LoH events" placeholder="Search event or racecourse…" value={search} onChange={event => setSearch(event.target.value)} />
    <select aria-label="LoH history rank" value={tier} onChange={event => setTier(event.target.value)}><option value="all">All ranks</option>{tiers.map(value => <option key={value}>{value}</option>)}</select>
    <select aria-label="LoH history status" value={status} onChange={event => setStatus(event.target.value)}><option value="all">All events</option><option value="completed">Completed</option><option value="active">In progress</option><option value="top96">Top #96</option></select>
    <button type="button" onClick={() => { setSearch(""); setTier("all"); setStatus("all") }}>Reset</button>
  </>}>
    <table><thead><tr><th scope="col">Event</th><th scope="col">Sets</th><th scope="col">Races</th><th scope="col">Raw PT</th><th scope="col">Overall Rank</th><th scope="col">League Rank</th><th scope="col">Extra Stage</th><th scope="col"><span className="sr-only">Open event</span></th></tr></thead>
      <tbody>{visible.map(row => <tr key={row.event.id} data-loh-number={row.event.number}>
        <th scope="row"><EventIdentity kind="LoH" number={row.event.number} name={row.event.name} track={row.event.racecourse} surface={row.event.surface} distance={row.event.distance} /></th>
        <td>{eventCount(row.sets)}</td><td>{eventCount(row.races)}</td><td className="event-statistics-accent">{eventCount(row.rawPoints)}</td>
        <td>{row.mainStageComplete && row.event.overallRank !== null ? `#${eventCount(row.event.overallRank)}` : "—"}</td>
        <td><span className="event-statistics-badge">{row.leagueRank}</span></td>
        <td><span className={row.extraStageOutcome === "winner" ? "event-statistics-gold" : ""}>{row.extraStageOutcome === "winner" ? "Winner" : row.extraStageOutcome === "participated" ? "Participated" : row.qualified ? "Qualified" : "—"}</span></td>
        <td><button type="button" className="event-statistics-open" aria-label={`Open LoH${row.event.number}: ${row.event.name}`} onClick={() => onOpen(row.event.number)}><HomeIcon name="arrow" /></button></td>
      </tr>)}{!visible.length && <tr><td colSpan={8} className="event-statistics-empty">{rows.length ? "No LoH events match these filters." : "No League of Heroes events recorded yet."}</td></tr>}</tbody>
    </table>
  </EventHistory>
}

export default function LoHEventStatistics({ lohs, onOpen, hidden = false }: { lohs: LoH[]; onOpen: (number: number) => void; hidden?: boolean }) {
  const data = useMemo(() => getLoHEventStatistics(lohs), [lohs])
  return <EventStatisticsPanel kind="loh" title="League of Heroes" hidden={hidden}>
      <EventMetrics items={[
        { label: "LoH Events", value: eventCount(data.totals.events), icon: "star" },
        { label: "Total Races", value: eventCount(data.totals.races), icon: "route" },
        { label: "Race Wins", value: eventCount(data.totals.wins), icon: "trophy" },
        { label: "Win Rate", value: formatUmaWinRate(data.totals.winRate), icon: "style" },
      ]} />
      <div className="event-statistics-summary event-statistics-loh-results">
        <div className="event-statistics-pair event-statistics-loh-summary">
          <div className="event-statistics-loh-overview">
            <EventMetrics className="event-statistics-raw" items={[
              { label: "Total Raw Points", value: eventCount(data.totals.rawPoints), icon: "star", title: "Main Stage raw points before the Bronze cap; Extra Stage adds no raw points" },
              { label: "Top #96 Qualifications", value: eventCount(data.top96), icon: "star", title: "Confirmed Main Stage Top #96 finishes" },
            ]} />
            <EventStatisticsCard title="League Ranks" icon="star" className="event-statistics-loh-ranks">
              <dl className="event-statistics-ranks">{data.ranks.map(row => <div key={row.tier}><dt>{row.tier}</dt><dd>{eventCount(row.count)}</dd></div>)}</dl>
            </EventStatisticsCard>
          </div>
          <EventStatisticsCard title="Event Highlights" icon="star">
            <dl className="event-statistics-highlights">
              <div><dt>Best Overall Rank</dt><dd>{data.bestRank ? `#${eventCount(data.bestRank.event.overallRank)}` : "—"}{data.bestRank && <button type="button" onClick={() => onOpen(data.bestRank!.event.number)}>LoH #{data.bestRank.event.number}</button>}</dd></div>
              <div><dt>Most Raw Points in One LoH</dt><dd>{data.mostRawPoints ? eventCount(data.mostRawPoints.rawPoints) : "—"}{data.mostRawPoints && <button type="button" onClick={() => onOpen(data.mostRawPoints!.event.number)}>LoH #{data.mostRawPoints.event.number}</button>}</dd></div>
              <div><dt>Extra Stage Wins</dt><dd>{eventCount(data.extraStageWins)}</dd></div>
            </dl>
          </EventStatisticsCard>
        </div>
        <EventStatisticsCard title="Placement Results" className="event-statistics-loh-placements">
          <EventPlacements items={LOH_ENTRY_PLACEMENTS.map((place, index) => ({ label: formatLoHPlacement(place), count: data.placements[index] }))} />
          {data.unresolvedExtraStagePlacements > 0 && <p className="event-statistics-note">Extra Stage 4th+ (exact place unknown): {eventCount(data.unresolvedExtraStagePlacements)}</p>}
        </EventStatisticsCard>
      </div>
      <LoHHistory rows={data.rows} onOpen={onOpen} />
  </EventStatisticsPanel>
}
