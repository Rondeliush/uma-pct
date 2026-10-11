type Props = {
  title: string
  titleId: string
  subtitle?: string
  note?: string
}

const eventTypes = [
  { id: "cm", label: "CM", available: true },
  { id: "loh", label: "LoH", available: false },
] as const

export default function UmaEventPanelHeader({ title, titleId, subtitle, note }: Props) {
  const currentEventType = "cm"

  return (
    <div className="uma-statistics-section-heading uma-event-panel-heading">
      <h2 id={titleId}>{title}</h2>
      <div className="uma-event-type-switch" role="group" aria-label={`${title} event type`} data-event-type={currentEventType}>
        {eventTypes.map((eventType) => (
          <button
            key={eventType.id}
            type="button"
            aria-pressed={eventType.id === currentEventType}
            disabled={!eventType.available}
            title={eventType.available ? undefined : "League of Heroes statistics coming later."}
          >
            {eventType.label}
            {!eventType.available && <span className="uma-event-type-soon">SOON</span>}
          </button>
        ))}
      </div>
      {(subtitle || note) && (
        <div className="uma-event-panel-description">
          {subtitle && <p>{subtitle}</p>}
          {note && <span className="uma-statistics-muted">{note}</span>}
        </div>
      )}
    </div>
  )
}
