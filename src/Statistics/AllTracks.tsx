import { useRef, useState } from "react"
import type { CSSProperties, PointerEvent } from "react"
import { trackImages } from "../data/trackData"
import type { TrackImageEntry } from "../data/trackData"
import UmaDatabaseIcon from "../Umas/UmaDatabaseIcon"
import TrackStatisticsLink from "./TrackStatisticsLink"
import "./UmaPerformanceList.css"
import "./AllTracks.css"

type TrackViewMode = "gallery" | "grid" | "list"
const TRACK_VIEW_STORAGE_KEY = "track-statistics-all-tracks-view"

function TrackCatalogCard({ track, onOpenTrack }: { track: TrackImageEntry; onOpenTrack: (trackId: string) => void }) {
  return (
    <li className="track-catalog-card" data-track-id={track.id}>
      <TrackStatisticsLink trackId={track.id} onOpenTrack={onOpenTrack} className="track-catalog-link" label={`Open ${track.name} statistics`}>
        <img src={track.image} alt="" loading="lazy" decoding="async" />
        <h3>{track.name}</h3>
      </TrackStatisticsLink>
    </li>
  )
}

export default function AllTracks({ onOpenTrack }: { onOpenTrack: (trackId: string) => void }) {
  const galleryDrag = useRef<{ pointerId: number; x: number; y: number; scrollLeft: number; dragging: boolean } | null>(null)
  const suppressClickUntil = useRef(0)
  const [viewMode, setViewMode] = useState<TrackViewMode>(() => {
    try {
      const saved = localStorage.getItem(TRACK_VIEW_STORAGE_KEY)
      if (saved === "gallery" || saved === "grid" || saved === "list") return saved
    } catch {
      // Use the default when browser storage is unavailable.
    }
    return "gallery"
  })

  const selectView = (view: TrackViewMode) => {
    setViewMode(view)
    try {
      localStorage.setItem(TRACK_VIEW_STORAGE_KEY, view)
    } catch {
      // The selection still works for this visit without browser storage.
    }
  }

  const startGalleryDrag = (event: PointerEvent<HTMLUListElement>) => {
    if (viewMode !== "gallery" || event.pointerType !== "mouse" || !event.isPrimary || event.button !== 0) return
    if (event.currentTarget.scrollWidth <= event.currentTarget.clientWidth) return
    suppressClickUntil.current = 0
    galleryDrag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, scrollLeft: event.currentTarget.scrollLeft, dragging: false }
  }

  const moveGalleryDrag = (event: PointerEvent<HTMLUListElement>) => {
    const drag = galleryDrag.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const x = event.clientX - drag.x
    const y = event.clientY - drag.y
    if (!drag.dragging) {
      if (Math.max(Math.abs(x), Math.abs(y)) < 6) return
      if (Math.abs(x) <= Math.abs(y) * 1.35) { galleryDrag.current = null; return }
      drag.dragging = true
      event.currentTarget.setPointerCapture(event.pointerId)
      event.currentTarget.dataset.dragging = ""
      event.currentTarget.style.scrollSnapType = "none"
    }
    event.preventDefault()
    event.currentTarget.scrollTo({ left: drag.scrollLeft - x, behavior: "instant" })
  }

  const finishGalleryDrag = (event: PointerEvent<HTMLUListElement>) => {
    const drag = galleryDrag.current
    if (!drag || drag.pointerId !== event.pointerId) return
    galleryDrag.current = null
    if (drag.dragging) {
      suppressClickUntil.current = Date.now() + 350
      delete event.currentTarget.dataset.dragging
      event.currentTarget.style.removeProperty("scroll-snap-type")
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  return (
    <section className="track-catalog" aria-labelledby="track-catalog-title">
      <div className="uma-statistics-all-header track-catalog-header">
        <h2 id="track-catalog-title" className="uma-statistics-eyebrow">
          All Tracks <span aria-label={`${trackImages.length} racetracks`}>{trackImages.length}</span>
        </h2>
        <div className="uma-performance-view-switch" role="group" aria-label="All Tracks presentation">
          {(["gallery", "grid", "list"] as const).map((view) => (
            <button key={view} type="button" aria-pressed={viewMode === view} aria-controls="track-catalog-items" onClick={() => selectView(view)}>
              <UmaDatabaseIcon name={view === "gallery" ? "image" : view} />
              {view === "gallery" ? "Gallery" : view === "grid" ? "Grid" : "List"}
            </button>
          ))}
        </div>
      </div>
      <ul
        id="track-catalog-items"
        className="track-catalog-items"
        data-view={viewMode}
        style={{ "--track-count": trackImages.length } as CSSProperties}
        aria-label={viewMode === "gallery" ? "Track gallery" : "All racetracks"}
        tabIndex={viewMode === "gallery" ? 0 : undefined}
        onPointerDown={startGalleryDrag}
        onPointerMove={moveGalleryDrag}
        onPointerUp={finishGalleryDrag}
        onPointerCancel={finishGalleryDrag}
        onLostPointerCapture={(event) => { if (event.target === event.currentTarget) finishGalleryDrag(event) }}
        onPointerLeave={() => { if (galleryDrag.current && !galleryDrag.current.dragging) galleryDrag.current = null }}
        onDragStart={(event) => { if (viewMode === "gallery") event.preventDefault() }}
        onClickCapture={(event) => {
          if (event.detail > 0 && Date.now() < suppressClickUntil.current) { event.preventDefault(); event.stopPropagation() }
        }}
      >
        {trackImages.map((track) => <TrackCatalogCard key={track.id} track={track} onOpenTrack={onOpenTrack} />)}
      </ul>
    </section>
  )
}
