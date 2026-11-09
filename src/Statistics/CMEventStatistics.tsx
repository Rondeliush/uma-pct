import { useMemo, useState } from "react"
import type { CM } from "../types/types"
import HomeIcon from "../Home/HomeIcon"
import { formatUmaWinRate } from "./umaStatistics"
import { withWinRate } from "./trackStatistics"
import { filterCMEventHistory, getCMEventStatistics, getCMLeagueSummary } from "./eventStatistics"
import type { CMEventRecord } from "./eventStatistics"
import { EventHistory, EventIdentity, EventMetrics, EventPlacements, EventStatisticsCard, EventStatisticsPanel } from "./EventStatisticsParts"
import { eventCount } from "./eventStatisticsFormat"

function CMFinalStatistics({ data }: { data: ReturnType<typeof getCMLeagueSummary> }) {
  return <EventStatisticsCard title="Final">
    <table className="event-statistics-finals" aria-label="CM final participation and wins">
      <thead><tr><th scope="col">Final Type</th><th scope="col">Participated</th><th scope="col">Won</th><th scope="col">Win Rate</th></tr></thead>
      <tbody>{data.finals.filter(row => row.label !== "Eliminated").map(row => <tr key={row.label}>
        <th scope="row"><span className="event-statistics-badge" data-final={row.label}>{row.label}</span></th>
        <td>{eventCount(row.participated)}</td><td className={row.won === null ? "" : "event-statistics-gold"}>{eventCount(row.won)}</td>
        <td className="event-statistics-final-rate">{formatUmaWinRate(row.won === null ? null : withWinRate({ races: row.participated, wins: row.won }).winRate)}</td>
      </tr>)}</tbody>
    </table>
  </EventStatisticsCard>
}

function CMHistory({ rows, onOpen }: { rows: CMEventRecord[]; onOpen: (number: number) => void }) {
  const [search, setSearch] = useState("")
  const [league, setLeague] = useState("all")
  const [finalType, setFinalType] = useState("all")
  const visible = filterCMEventHistory(rows, search, league, finalType)
  return <EventHistory kind="CM" count={visible.length} total={rows.length} filters={<>
    <input aria-label="Search CM events" placeholder="Search event or racecourse…" value={search} onChange={event => setSearch(event.target.value)} />
    <select aria-label="CM history league" value={league} onChange={event => setLeague(event.target.value)}><option value="all">All leagues</option><option>Graded League</option><option>Open League</option></select>
    <select aria-label="CM history final" value={finalType} onChange={event => setFinalType(event.target.value)}><option value="all">All finals</option><option>Final A</option><option>Final B</option><option>Eliminated</option><option>Not qualified yet</option></select>
    <button type="button" onClick={() => { setSearch(""); setLeague("all"); setFinalType("all") }}>Reset</button>
  </>}>
    <table><thead><tr><th scope="col">Event</th><th scope="col">Races</th><th scope="col">Wins</th><th scope="col">WR</th><th scope="col">Final Type</th><th scope="col">Result</th><th scope="col"><span className="sr-only">Open event</span></th></tr></thead>
      <tbody>{visible.map(row => <tr key={row.event.number} data-cm-number={row.event.number}>
        <th scope="row"><EventIdentity kind="CM" number={row.event.number} name={row.event.name} league={row.event.league} track={row.event.track} surface={row.event.surface} distance={row.event.distance} /></th>
        <td>{eventCount(row.races)}</td><td>{eventCount(row.wins)}</td><td className="event-statistics-accent">{formatUmaWinRate(row.winRate)}</td>
        <td><span className="event-statistics-badge" data-final={row.finalType}>{row.finalType === "Not qualified yet" ? "Pending" : row.finalType}</span></td>
        <td className={row.event.finalPlace === "1st" ? "event-statistics-gold" : ""}>{row.finalRecorded ? row.event.finalPlace : row.event.phase === "eliminated" ? "Eliminated" : "—"}</td>
        <td><button type="button" className="event-statistics-open" aria-label={`Open CM${row.event.number}: ${row.event.name}`} onClick={() => onOpen(row.event.number)}><HomeIcon name="arrow" /></button></td>
      </tr>)}{!visible.length && <tr><td colSpan={7} className="event-statistics-empty">{rows.length ? "No CM events match these filters." : "No Champions Meeting events recorded yet."}</td></tr>}</tbody>
    </table>
  </EventHistory>
}

export default function CMEventStatistics({ cms, onOpen, hidden = false }: { cms: CM[]; onOpen: (number: number) => void; hidden?: boolean }) {
  const data = useMemo(() => getCMEventStatistics(cms), [cms])
  const [league, setLeague] = useState("all")
  const leagueSummary = useMemo(() => getCMLeagueSummary(data.rows, league), [data.rows, league])
  return <EventStatisticsPanel kind="cm" title="Champions Meeting" hidden={hidden}>
      <EventMetrics items={[
        { label: "CM Events", value: eventCount(data.totals.events), icon: "crown" },
        { label: "Total Races", value: eventCount(data.totals.races), icon: "route" },
        { label: "Race Wins", value: eventCount(data.totals.wins), icon: "trophy" },
        { label: "Win Rate", value: formatUmaWinRate(data.totals.winRate), icon: "style" },
      ]} />
      <div className="event-statistics-summary event-statistics-cm-summary">
        <EventStatisticsCard title="Final Results Overall" icon="crown" action={<select aria-label="Final results league" value={league} onChange={event => setLeague(event.target.value)}><option value="all">All leagues</option><option value="Graded League">Graded</option><option value="Open League">Open</option></select>}>
          <EventPlacements items={leagueSummary.placements} />
        </EventStatisticsCard>
        <EventStatisticsCard title="Round 2" className="event-statistics-progression">
          <EventPlacements items={leagueSummary.groups.map(row => ({ label: `Group ${row.group}`, count: row.events }))} />
        </EventStatisticsCard>
        <EventStatisticsCard title="Event Highlights" icon="crown">
          <dl className="event-statistics-highlights">{[
            { label: "Highest Event WR", value: formatUmaWinRate(data.bestWinRate?.winRate ?? null), row: data.bestWinRate },
            { label: "Most Wins in One CM", value: data.mostWins ? eventCount(data.mostWins.wins) : "—", row: data.mostWins },
          ].map(item => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}{item.row && <button type="button" onClick={() => onOpen(item.row!.event.number)}>CM #{item.row.event.number}</button>}</dd></div>)}</dl>
        </EventStatisticsCard>
        <CMFinalStatistics data={leagueSummary} />
      </div>
      <CMHistory rows={data.rows} onOpen={onOpen} />
  </EventStatisticsPanel>
}
