const eventTypes = {
  cm: { label: "CM", name: "Champions Meeting", accent: "border-sky-400/25 bg-sky-400/[0.08] text-sky-200" },
  loh: { label: "LoH", name: "League of Heroes", accent: "border-rose-400/25 bg-rose-400/[0.08] text-rose-300" },
}

export default function EventTypeBadge({ type }: { type: keyof typeof eventTypes }) {
  const eventType = eventTypes[type]
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded border px-1 py-px align-middle text-[9px] font-bold leading-tight ${eventType.accent}`} data-event-type={type} title={eventType.name}>
      {eventType.label}
    </span>
  )
}
