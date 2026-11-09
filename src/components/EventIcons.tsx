import { cloneElement } from "react"
/** Existing CM and Track Information icons, with unchanged paths. */
const conditionIcons = {
  racecourse: (<svg viewBox="0 0 64 40" className="h-8 w-9" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="
                        M16 6
                        H48
                        C55 6 60 11.5 60 20
                        C60 28.5 55 34 48 34
                        H16
                        C9 34 4 28.5 4 20
                        C4 11.5 9 6 16 6
                        Z
                      "/>

    <path d="
                        M18 13
                        H46
                        C50.8 13 54 15.8 54 20
                        C54 24.2 50.8 27 46 27
                        H18
                        C13.2 27 10 24.2 10 20
                        C10 15.8 13.2 13 18 13
                        Z
                      "/>

    <path d="M47 6v7" />
    <path d="M47 27v7" />
  </svg>),
  surface: (<svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m3 7 9 5 9-5-9-5-9 5Z" />
    <path d="m3 12 9 5 9-5" />
    <path d="m3 17 9 5 9-5" />
  </svg>),
  distance: (<svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M8 3 5 21" />
    <path d="M16 3 19 21" />

    <path d="M12 4v3" />
    <path d="M12 10v4" />
    <path d="M12 17v3" />
  </svg>),
  length: (<svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 12h18" />
    <path d="m7 8-4 4 4 4" />
    <path d="m17 8 4 4-4 4" />
  </svg>),
  direction: (<svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 18c0-6 3-10 10-10h4" />
    <path d="m15 4 4 4-4 4" />
  </svg>),
  weather: (<svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4" />

    <path d="M12 2v2" />
    <path d="M12 20v2" />
    <path d="M2 12h2" />
    <path d="M20 12h2" />

    <path d="m4.9 4.9 1.5 1.5" />
    <path d="m17.6 17.6 1.5 1.5" />
    <path d="m19.1 4.9-1.5 1.5" />
    <path d="m6.4 17.6-1.5 1.5" />
  </svg>),
  season: (<svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3.5" y="5" width="17" height="15" rx="2.5" />

    <path d="M3.5 9h17" />
    <path d="M8 3v4" />
    <path d="M16 3v4" />

    <circle cx="8" cy="13" r="1.2" fill="currentColor" stroke="none" />

    <circle cx="16" cy="13" r="1.2" fill="currentColor" stroke="none" />

    <circle cx="8" cy="17" r="1.2" fill="currentColor" stroke="none" />

    <circle cx="16" cy="17" r="1.2" fill="currentColor" stroke="none" />
  </svg>),
  condition: (<svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 19h18" />
    <path d="m5 19 5-9 3 4 2-3 4 8" />
  </svg>),
}
export type TrackConditionKind = keyof typeof conditionIcons

export function TrackConditionIcon({ kind, className }: {
  kind: TrackConditionKind
  className?: string
}) {
  return className ? cloneElement(conditionIcons[kind], { className }) : conditionIcons[kind]
}

export function EventChevronIcon({ className = "h-4 w-4" }: {
  className?: string
}) {
  return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m9 5 7 7-7 7" />
  </svg>
}
