import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react"
import type { CSSProperties, DragEvent, KeyboardEvent, MouseEvent, PointerEvent } from "react"

const viewportQueries = ["(max-width: 639px)", "(max-width: 1023px)", "(max-width: 1599px)"]

function subscribeToViewport(callback: () => void) {
  const queries = viewportQueries.map((query) => window.matchMedia(query))
  queries.forEach((query) => query.addEventListener("change", callback))
  return () => queries.forEach((query) => query.removeEventListener("change", callback))
}
const getVisibleCards = () => {
  const breakpoint = viewportQueries.findIndex((query) => window.matchMedia(query).matches)
  return breakpoint === -1 ? 6 : breakpoint + 3
}
const swipeThreshold = (step: number) => Math.min(48, Math.max(24, step * 0.28))
const getCardStep = (frame: HTMLDivElement) => {
  const track = frame.querySelector(".uma-performance-carousel-track")
  const card = track?.querySelector(".uma-statistics-performance-card")
  return track && card ? card.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap) : 0
}

type Gesture = {
  pointerId: number
  x: number
  y: number
  startIndex: number
  step: number
  horizontal: boolean
}

export default function useUmaPerformanceSwipe(cardCount: number) {
  const visibleCards = useSyncExternalStore(subscribeToViewport, getVisibleCards, () => 5)
  const [position, setPosition] = useState(0)
  const [drag, setDrag] = useState({ offset: 0, step: 1, active: false })
  const gesture = useRef<Gesture | null>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const attachFrame = useCallback((frame: HTMLDivElement | null) => { frameRef.current = frame }, [])
  const cancelWheel = useRef<(() => void) | null>(null)
  const suppressClickUntil = useRef(0)
  const lastStartIndex = Math.max(0, cardCount - visibleCards)
  const startIndex = Math.min(position, lastStartIndex)
  const fractionalPosition = startIndex - drag.offset / drag.step

  const isVisible = (index: number) => index >= startIndex && index < startIndex + visibleCards
  const cardStyle = (index: number): CSSProperties => {
    const coverage = Math.max(0, Math.min(index + 1, fractionalPosition + visibleCards) - Math.max(index, fractionalPosition))
    return { opacity: 0.85 + coverage * 0.15 }
  }

  useEffect(() => {
    const frame = frameRef.current
    if (!frame || !lastStartIndex) return
    let distance = 0
    let step = 0
    let timer: ReturnType<typeof setTimeout> | undefined
    const cancel = () => {
      clearTimeout(timer)
      timer = undefined
      distance = 0
      step = 0
      setDrag({ offset: 0, step: 1, active: false })
    }
    cancelWheel.current = cancel
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || gesture.current) return
      const x = event.deltaX || (event.shiftKey ? event.deltaY : 0)
      const y = event.shiftKey ? 0 : event.deltaY
      // Keep ordinary vertical wheel/trackpad scrolling native.
      if (!x || Math.abs(x) <= Math.abs(y) * 1.35) return
      event.preventDefault()
      if (!step) step = getCardStep(frame)
      if (!step) return
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? frame.clientWidth : 1
      distance += x * unit
      let offset = Math.max(-step, Math.min(step, -distance))
      if ((startIndex === 0 && offset > 0) || (startIndex === lastStartIndex && offset < 0)) offset *= 0.18
      setDrag({ offset, step, active: true })
      clearTimeout(timer)
      // Treat a trackpad burst and its momentum as one overlapping-window move.
      timer = setTimeout(() => {
        if (Math.abs(distance) >= swipeThreshold(step)) {
          setPosition(Math.max(0, Math.min(lastStartIndex, startIndex + (distance > 0 ? 1 : -1))))
        }
        cancel()
      }, 160)
    }
    frame.addEventListener("wheel", onWheel, { passive: false })
    return () => {
      frame.removeEventListener("wheel", onWheel)
      if (timer !== undefined) cancel()
      cancelWheel.current = null
    }
  }, [startIndex, lastStartIndex, visibleCards])

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!lastStartIndex || !event.isPrimary || event.button !== 0 || gesture.current) return
    cancelWheel.current?.()
    const step = getCardStep(event.currentTarget)
    if (!step) return
    suppressClickUntil.current = 0
    gesture.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, startIndex, step, horizontal: false }
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = gesture.current
    if (!current || current.pointerId !== event.pointerId) return
    const x = event.clientX - current.x
    const y = event.clientY - current.y
    if (!current.horizontal) {
      if (Math.max(Math.abs(x), Math.abs(y)) < 8) return
      // The browser owns vertical and diagonal gestures from their beginning.
      if (Math.abs(x) <= Math.abs(y) * 1.35) {
        gesture.current = null
        return
      }
      current.horizontal = true
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    event.preventDefault()
    let offset = Math.max(-current.step, Math.min(current.step, x))
    if ((current.startIndex === 0 && offset > 0) || (current.startIndex === lastStartIndex && offset < 0)) offset *= 0.18
    setDrag({ offset, step: current.step, active: true })
  }

  const finishGesture = (event: PointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const current = gesture.current
    if (!current || current.pointerId !== event.pointerId) return
    gesture.current = null
    if (current.horizontal) {
      const distance = event.clientX - current.x
      if (!cancelled && Math.abs(distance) >= swipeThreshold(current.step)) {
        setPosition(Math.max(0, Math.min(lastStartIndex, current.startIndex + (distance < 0 ? 1 : -1))))
      }
      setDrag({ offset: 0, step: current.step, active: false })
      // A swipe must not also open the card under the released finger.
      suppressClickUntil.current = Date.now() + 350
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  const onClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (event.detail > 0 && Date.now() < suppressClickUntil.current) {
      event.preventDefault()
      event.stopPropagation()
    }
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return
    event.preventDefault()
    cancelWheel.current?.()
    setPosition(event.key === "Home" ? 0 : event.key === "End" ? lastStartIndex
      : Math.max(0, Math.min(lastStartIndex, startIndex + (event.key === "ArrowRight" ? 1 : -1))))
  }

  return {
    attachFrame, visibleCards, startIndex, lastStartIndex, isDragging: drag.active, isVisible, cardStyle,
    style: { "--uma-performance-visible": visibleCards, "--uma-performance-start": startIndex, "--uma-performance-drag": `${drag.offset}px` } as CSSProperties,
    handlers: {
      onPointerDown, onPointerMove, onClickCapture, onKeyDown,
      onPointerUp: (event: PointerEvent<HTMLDivElement>) => finishGesture(event, false),
      onPointerCancel: (event: PointerEvent<HTMLDivElement>) => finishGesture(event, true),
      onLostPointerCapture: (event: PointerEvent<HTMLDivElement>) => {
        // Ignore capture transferred from the pressed card/image to this region.
        if (event.target === event.currentTarget) finishGesture(event, true)
      },
      onPointerLeave: () => { if (gesture.current && !gesture.current.horizontal) gesture.current = null },
      onDragStart: (event: DragEvent<HTMLDivElement>) => event.preventDefault(),
    },
  }
}
