import { useEffect, useState, useSyncExternalStore } from "react"
import type { FocusEvent, RefObject } from "react"

const reducedMotionQuery = "(prefers-reduced-motion: reduce)"
const subscribeMotion = (listener: () => void) => {
  const query = window.matchMedia(reducedMotionQuery)
  query.addEventListener("change", listener)
  return () => query.removeEventListener("change", listener)
}
const subscribeVisibility = (listener: () => void) => {
  document.addEventListener("visibilitychange", listener)
  return () => document.removeEventListener("visibilitychange", listener)
}

/** Stable item IDs keep a normal render from restarting any of Home's three carousels. */
export default function useHomeCarousel(ids: readonly string[], interval: number, enabled = true, progressRef?: RefObject<HTMLElement | null>) {
  const [selected, setSelected] = useState(ids[0] ?? "")
  const [direction, setDirection] = useState<1 | -1>(1)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [restartKey, setRestartKey] = useState(0)
  const reducedMotion = useSyncExternalStore(subscribeMotion, () => window.matchMedia(reducedMotionQuery).matches, () => true)
  const hidden = useSyncExternalStore(subscribeVisibility, () => document.hidden, () => false)
  const index = Math.max(0, ids.indexOf(selected))
  const paused = !enabled || hovered || focused || hidden || reducedMotion

  useEffect(() => {
    if (paused || ids.length <= 1) return
    const progress = progressRef?.current?.animate([{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], { duration: interval, easing: "linear", fill: "forwards" })
    const timeout = window.setTimeout(() => {
      setDirection(1)
      setSelected(ids[(index + 1) % ids.length])
    }, interval)
    return () => { window.clearTimeout(timeout); progress?.cancel() }
  }, [ids, index, interval, paused, restartKey, progressRef])

  const select = (next: number, movement: 1 | -1 = next < index ? -1 : 1) => {
    if (ids.length) { setDirection(movement); setSelected(ids[(next + ids.length) % ids.length]) }
  }
  return { index, direction, select, next: () => select(index + 1, 1), previous: () => select(index - 1, -1), reducedMotion,
    restart: () => setRestartKey(key => key + 1),
    bind: { onMouseEnter: () => setHovered(true), onMouseLeave: () => setHovered(false), onFocusCapture: () => setFocused(true),
      onBlurCapture: (event: FocusEvent<HTMLElement>) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false) } } }
}
