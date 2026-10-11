import { useLayoutEffect, useRef } from "react"
import type { UmaStatisticsEntry } from "./umaStatistics"

export function useUmaComparisonStickyHeader(slots: (UmaStatisticsEntry | null)[], pinned = true) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLSpanElement>(null)
  const headerRowRef = useRef<HTMLTableRowElement>(null)

  useLayoutEffect(() => {
    const container = containerRef.current
    const sentinel = sentinelRef.current
    const row = headerRowRef.current
    if (!container || !sentinel || !row) return
    if (!pinned) {
      container.dataset.compact = "false"
      return () => { delete container.dataset.compact }
    }

    let compact = false
    let offset = -1
    let width = -1
    let appHeader: Element | null = null
    let intersectionObserver: IntersectionObserver | undefined
    let frame = 0

    const setCompact = (next: boolean) => {
      compact = next
      container.dataset.compact = String(next)
    }
    const measureFullHeader = () => {
      // Preserve the original row's space so compacting cannot move the data
      // or the sentinel and repeatedly toggle the sticky state.
      container.dataset.compact = "false"
      container.style.setProperty("--uma-comparison-full-header-height", `${row.getBoundingClientRect().height}px`)
      container.dataset.compact = String(compact)
    }
    const update = () => {
      const nextHeader = document.querySelector("[data-app-sticky-header]")
      if (nextHeader !== appHeader) {
        if (appHeader) resizeObserver.unobserve(appHeader)
        appHeader = nextHeader
        if (appHeader) resizeObserver.observe(appHeader)
      }
      const nextOffset = appHeader?.getBoundingClientRect().height ?? 0
      if (nextOffset !== offset) {
        offset = nextOffset
        container.style.setProperty("--uma-comparison-sticky-top", `${offset}px`)
        intersectionObserver?.disconnect()
        // Include the page below the viewport so fast scrolls cannot skip the sentinel.
        intersectionObserver = new IntersectionObserver(([entry]) => {
          setCompact(entry.boundingClientRect.height > 0 && entry.boundingClientRect.top < offset)
        }, { rootMargin: `-${offset}px 0px ${document.documentElement.scrollHeight}px 0px`, threshold: [0, 1] })
        intersectionObserver.observe(sentinel)
      }
      const nextWidth = container.getBoundingClientRect().width
      if (nextWidth > 0 && (nextWidth !== width || !compact)) {
        width = nextWidth
        measureFullHeader()
      }
      setCompact(nextWidth > 0 && sentinel.getBoundingClientRect().top < offset)
    }
    const resizeObserver = new ResizeObserver(update)
    const onResize = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(update)
    }

    setCompact(false)
    resizeObserver.observe(container)
    update()
    window.addEventListener("resize", onResize)
    return () => {
      intersectionObserver?.disconnect()
      resizeObserver.disconnect()
      cancelAnimationFrame(frame)
      window.removeEventListener("resize", onResize)
      delete container.dataset.compact
    }
  }, [slots, pinned])

  return { containerRef, sentinelRef, headerRowRef }
}
