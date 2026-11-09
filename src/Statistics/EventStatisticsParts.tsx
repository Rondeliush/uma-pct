import { useId, useState } from "react"
import type { ReactNode } from "react"
import HomeIcon from "../Home/HomeIcon"
import type { HomeIconName } from "../Home/HomeIcon"
import { eventCount } from "./eventStatisticsFormat"
import { EventCardSymbol } from "../components/event-card/EventCardBadge"
import { useIsMobile } from "../responsive/useIsMobile"
import type { CMLeague } from "../types/types"

function StatisticsIcon({ name }: { name: HomeIconName }) {
  return name === "crown" || name === "star"
    ? <EventCardSymbol theme={name === "crown" ? "cm" : "loh"} className="event-statistics-symbol" />
    : <HomeIcon name={name} />
}

export function EventStatisticsHeader({ kind, title, action }: { kind: "cm" | "loh"; title: string; action?: ReactNode }) {
  return <header className="event-statistics-header">
    <img src={`${import.meta.env.BASE_URL}Statistic/statistic_uma_background_${kind === "cm" ? "CM" : "LoH"}.png`} alt="" />
    <EventCardSymbol theme={kind} className="event-statistics-symbol" /><h1>{title}</h1>
    {action}
  </header>
}

export function EventStatisticsPanel({ kind, title, hidden = false, children }: {
  kind: "cm" | "loh"; title: string; hidden?: boolean; children: ReactNode
}) {
  const [collapsed, setCollapsed] = useState(false)
  const isMobile = useIsMobile()
  const contentId = useId()
  const expanded = !isMobile || !collapsed
  return <section className="event-statistics-column home-panel" data-tone={kind} hidden={hidden} aria-label={`${title} statistics`}>
    <EventStatisticsHeader kind={kind} title={title} action={isMobile && <button
      type="button" className="event-statistics-collapse" aria-expanded={expanded} aria-controls={contentId}
      aria-label={`${expanded ? "Collapse" : "Expand"} ${title} statistics`} onClick={() => setCollapsed(value => !value)}>
      <span aria-hidden="true">{expanded ? "−" : "+"}</span>
    </button>} />
    <div id={contentId} className="event-statistics-body" hidden={!expanded}>{children}</div>
  </section>
}

export function EventStatisticsCard({ title, icon, action, children, className = "" }: {
  title: string; icon?: HomeIconName; action?: ReactNode; children: ReactNode; className?: string
}) {
  return <section className={`event-statistics-card ${className}`}>
    <header className="event-statistics-card-heading"><h2>{icon && <StatisticsIcon name={icon} />}{title}</h2>{action}</header>
    {children}
  </section>
}

export function EventMetrics({ items, className = "" }: { items: { label: string; value: string; icon: HomeIconName; title?: string }[]; className?: string }) {
  return <dl className={`event-statistics-metrics ${className}`}>{items.map(item => <div key={item.label} title={item.title} data-event-metric={item.label}>
    <StatisticsIcon name={item.icon} /><dt>{item.label}</dt><dd>{item.value}</dd>
  </div>)}</dl>
}

export function EventPlacements({ items }: { items: { label: string; count: number }[] }) {
  return <dl className="event-statistics-placements">{items.map((item, index) => <div key={item.label} data-place={index + 1}>
    <dt>{item.label}</dt><dd>{eventCount(item.count)}</dd>
  </div>)}</dl>
}

export function EventHistory({ kind, filters, children, count, total }: { kind: "CM" | "LoH"; filters: ReactNode; children: ReactNode; count: number; total: number }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return <EventStatisticsCard className="event-statistics-history" title="Event History" icon="clock" action={
    <button type="button" className="event-statistics-filter-toggle" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>Filters</button>
  }>
    <div className="event-statistics-history-content">
      {open && <div id={id} className="event-statistics-filters">{filters}<span aria-live="polite">Showing {count} of {total}</span></div>}
      <div className="event-statistics-history-scroll" role="region" aria-label={`${kind} event history`} tabIndex={0}>{children}</div>
    </div>
  </EventStatisticsCard>
}

export function EventIdentity({ kind, number, name, league, track, surface, distance }: {
  kind: "CM" | "LoH"; number: number; name: string; league?: CMLeague; track: string; surface: string | null; distance: number | null
}) {
  return <div className="event-statistics-identity"><span className="event-statistics-event-id"><EventCardSymbol theme={kind === "CM" ? "cm" : "loh"} className="event-statistics-symbol" /><b>{kind}{number}</b></span>
    <span><span className="event-statistics-identity-heading"><strong>{name || `${kind} #${number}`}</strong>{kind === "CM" && <small className="event-statistics-league" data-league={league} title={league ?? "League not recorded"}>{league === "Graded League" ? "Graded" : league === "Open League" ? "Open" : "Unknown league"}</small>}</span><span className="event-statistics-course">{[track, surface, distance === null ? null : `${distance}m`].filter(Boolean).map((value, index) => <small key={index}>{value}</small>)}</span></span>
  </div>
}
