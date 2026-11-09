import { useEffect, useRef, useState } from "react"
import type { HomeTickerFact } from "./homeTickerData"

export default function HomeStatisticsTicker({ facts }: { facts: HomeTickerFact[] }) {
  const viewportRef = useRef<HTMLElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const groupRef = useRef<HTMLDivElement>(null)
  const sequenceRef = useRef<HTMLDivElement>(null)
  const [copies, setCopies] = useState(1)
  const content = JSON.stringify(facts)

  useEffect(() => {
    const viewport = viewportRef.current, track = trackRef.current, group = groupRef.current, sequence = sequenceRef.current
    if (!viewport || !track || !group || !sequence) return
    let cancelled = false
    let fontsReady = document.fonts.status === "loaded"
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)")
    const measure = () => {
      if (cancelled || !fontsReady) return
      const unitWidth = sequence.getBoundingClientRect().width
      if (unitWidth <= 0 || viewport.clientWidth <= 0) return
      const required = motion.matches ? 1 : Math.max(1, Math.ceil(viewport.clientWidth / unitWidth))
      setCopies(previous => previous === required ? previous : required)
      const groupWidth = group.getBoundingClientRect().width
      const speed = parseFloat(getComputedStyle(viewport).getPropertyValue("--home-ticker-speed")) || 36
      track.style.setProperty("--home-ticker-duration", `${groupWidth / speed}s`)
      track.dataset.ready = String(!motion.matches && groupWidth >= viewport.clientWidth)
    }
    const observer = new ResizeObserver(measure)
    observer.observe(viewport)
    observer.observe(sequence)
    observer.observe(group)
    motion.addEventListener("change", measure)
    void document.fonts.ready.then(() => { fontsReady = true; measure() })
    return () => { cancelled = true; observer.disconnect(); motion.removeEventListener("change", measure) }
  }, [content])

  if (!facts.length) return null
  return <section ref={viewportRef} className="home-statistics-ticker" aria-label="Profile statistics" tabIndex={0}>
    <div ref={trackRef} className="home-ticker-track">
      {[0, 1].map(group => <div key={group} ref={group === 0 ? groupRef : undefined} className="home-ticker-group" aria-hidden={group === 1 ? true : undefined}>
        {Array.from({ length: copies }, (_, copy) => <div key={copy} ref={group === 0 && copy === 0 ? sequenceRef : undefined} className="home-ticker-sequence" aria-hidden={copy > 0 ? true : undefined}>
          {facts.map(fact => <span key={fact.id} className="home-ticker-item"><strong>{fact.label}: </strong>{fact.entries.map((entry, index) => `${index + 1}. ${entry.name} — ${entry.value}`).join(", ")}<span className="home-ticker-separator" aria-hidden="true">•</span></span>)}
        </div>)}
      </div>)}
    </div>
  </section>
}
