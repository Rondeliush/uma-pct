import type { HomeEvent } from "./homeData"
import { getHomeEventResult, getHomeEventTitle } from "./homeData"
import HomeIcon from "./HomeIcon"

export default function HomeRecentResults({ results, onOpen, onViewAll }: { results: HomeEvent[]; onOpen: (item: HomeEvent) => void; onViewAll: () => void }) {
  return <section className="home-panel home-recent" aria-labelledby="home-recent-title">
    <header className="home-panel-heading"><h2 id="home-recent-title"><HomeIcon name="clock" />Recent Results</h2><button type="button" className="home-text-link" onClick={onViewAll}>View All<HomeIcon name="arrow" /></button></header>
    {results.length ? <ol>{results.map(item => <li key={`${item.kind}-${item.event.number}`}><button type="button" className="home-result-row" onClick={() => onOpen(item)} aria-label={`Open ${getHomeEventTitle(item)}`}>
      <span className="home-event-badge" data-tone={item.kind}>{item.kind === "cm" ? "CM" : "LoH"}</span><HomeIcon name="trophy" className="home-result-trophy" /><span className="home-result-copy"><strong>{getHomeEventTitle(item)}</strong><span className="home-result-details" data-tone={item.kind}>{getHomeEventResult(item).split(" · ").map((part, index) => <span key={index}>{part}</span>)}</span></span>
      {item.completedAt !== null ? <time dateTime={new Date(item.completedAt).toISOString()}>{new Date(item.completedAt).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })}</time> : <small>Date not recorded</small>}<HomeIcon name="arrow" />
    </button></li>)}</ol> : <div className="home-secondary-empty"><HomeIcon name="trophy" /><p>Your completed CM and LoH results will appear here.</p></div>}
  </section>
}
