import { formatUmaWinRate } from "../Statistics/umaStatistics"
import { formatLoHNumber } from "../LoH/format"
import type { getHomeCareerStatistics } from "./homeData"
import HomeIcon from "./HomeIcon"

export default function HomeCareerStatistics({ statistics }: { statistics: ReturnType<typeof getHomeCareerStatistics> }) {
  const rows = [
    { kind: "cm", label: "CM", metrics: [
      ["Events", formatLoHNumber(statistics.cm.events)],
      ["Races", formatLoHNumber(statistics.cm.races)],
      ["Win Rate", formatUmaWinRate(statistics.cm.winRate)],
    ] },
    { kind: "loh", label: "LoH", metrics: [
      ["Events", formatLoHNumber(statistics.loh.events)],
      ["Races", formatLoHNumber(statistics.loh.races)],
      ["Raw Points", formatLoHNumber(statistics.loh.rawPoints)],
    ] },
  ]
  return <section className="home-panel home-career-statistics" aria-labelledby="home-career-title">
    <header className="home-panel-heading">
      <h2 id="home-career-title"><HomeIcon name="trophy" />Career Statistics</h2>
    </header>
    <div className="home-career-rows">{rows.map(row => <div key={row.kind} className="home-career-row">
      <h3 data-tone={row.kind}>{row.label}</h3>
      <dl>{row.metrics.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    </div>)}</div>
  </section>
}
