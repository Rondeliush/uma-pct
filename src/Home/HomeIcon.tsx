import { TrackConditionIcon } from "../components/EventIcons"

export type HomeIconName = "lineup" | "heart" | "star" | "crown" | "horse" | "clock" | "trophy" | "arrow" | "back" | "edit" | "route" | "distance" | "surface" | "style" | "bolt" | "book"

export default function HomeIcon({ name, className = "" }: { name: HomeIconName; className?: string }) {
  if (name === "distance") return <TrackConditionIcon kind="distance" className={`home-icon ${className}`} />
  if (name === "lineup") return <span className={`home-icon home-lineup-icon ${className}`} aria-hidden="true">♞</span>
  return <svg viewBox="0 0 24 24" className={`home-icon ${className}`} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name === "heart" ? <path d="M20.8 4.7a5.4 5.4 0 0 0-7.6 0L12 5.9l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21l8.8-8.7a5.4 5.4 0 0 0 0-7.6Z" fill="currentColor" strokeWidth="1" />
      : name === "star" ? <path d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6Z" fill="currentColor" strokeWidth="1" />
      : name === "crown" ? <><path d="m3 6 5 4 4-7 4 7 5-4-2 13H5L3 6Z" fill="currentColor" strokeWidth="1" /><path d="M6 22h12" /></>
      : name === "horse" ? <path d="m8 21 1-7-4-1V9l5-5 2-2 2 4 4 3 2 12H8ZM8 8h.01M12 4l-1 4 5 4" />
      : name === "clock" ? <><circle cx="12" cy="12" r="9" /><path d="M12 6v6l4 2" /></>
      : name === "trophy" ? <><path d="M8 3h8v5a4 4 0 0 1-8 0V3ZM8 5H4v2a4 4 0 0 0 5 4M16 5h4v2a4 4 0 0 1-5 4M12 12v6M8 21h8M9 18h6v3" /></>
      : name === "arrow" ? <path d="M4 12h16m-6-6 6 6-6 6" />
      : name === "back" ? <path d="m15 5-7 7 7 7" />
      : name === "edit" ? <><path d="m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-5-5L4 14v6Z" /><path d="M13 21h8" /></>
      : name === "route" ? <><circle cx="5" cy="5" r="2" /><circle cx="19" cy="19" r="2" /><path d="M5 7v8a4 4 0 0 0 8 0V9a4 4 0 0 1 8 0v8" /></>
      : name === "surface" ? <><path d="m3 7 9 5 9-5-9-5-9 5ZM3 12l9 5 9-5M3 17l9 5 9-5" /></>
      : name === "style" ? <><path d="M4 20h16M6 16l4-5 3 2 5-8M14 5h4v4" /><path d="M5 5h4M7 3v4" /></>
      : name === "bolt" ? <path d="m13 2-9 12h7l-1 8 10-13h-8l1-7Z" fill="currentColor" strokeWidth="1" />
      : <><path d="M12 5v16M3 4l9 2 9-2v15l-9 2-9-2V4Z" /></>}
  </svg>
}
