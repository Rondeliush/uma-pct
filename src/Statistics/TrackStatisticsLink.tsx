import type { ReactNode } from "react"
import { getTrackStatisticsHref } from "./trackStatisticsRoute"

export default function TrackStatisticsLink({ trackId, onOpenTrack, children, className, label }: {
  trackId: string
  onOpenTrack: (trackId: string) => void
  children: ReactNode
  className?: string
  label: string
}) {
  return <a href={getTrackStatisticsHref(trackId)} className={className} aria-label={label} onClick={(event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    onOpenTrack(trackId)
  }}>{children}</a>
}
