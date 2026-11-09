import { useState } from "react"
import type { ReactNode } from "react"

type Props = {
  slideId: string
  direction: 1 | -1
  reducedMotion: boolean
  guide?: string
  renderSlide: (id: string, current: boolean) => ReactNode
}

/** Keep the departing slide just long enough for a continuous horizontal transition. */
export default function HomeCarouselTransition({ slideId, direction, reducedMotion, guide, renderSlide }: Props) {
  const [frame, setFrame] = useState({ id: slideId, previous: null as string | null, animated: false })
  if (frame.id !== slideId) {
    setFrame({ id: slideId, previous: reducedMotion ? null : frame.id, animated: !reducedMotion })
  } else if (reducedMotion && frame.animated) {
    setFrame({ id: slideId, previous: null, animated: false })
  }

  return <div className="home-carousel-window" data-guide={guide} data-direction={direction === 1 ? "forward" : "backward"}>
    {!reducedMotion && frame.previous !== null && <div key={`out-${frame.previous}`} className="home-carousel-departing" aria-hidden="true" inert>{renderSlide(frame.previous, false)}</div>}
    <div key={slideId} className="home-carousel-current" data-animated={frame.animated && !reducedMotion} onAnimationEnd={event => {
      if (event.target === event.currentTarget) setFrame(current => current.id === slideId ? { ...current, previous: null, animated: false } : current)
    }}>{renderSlide(slideId, true)}</div>
  </div>
}
