import { useEffect, useRef, useState } from "react"
import type { ReactNode } from "react"

export default function UmaPerformanceGrid({ entryCount, children }: { entryCount: number; children: ReactNode }) {
  const gridRef = useRef<HTMLDivElement>(null)
  const [placeholderCount, setPlaceholderCount] = useState(0)

  useEffect(() => {
    const grid = gridRef.current
    if (!grid) return
    const updatePlaceholders = () => {
      // Read the existing CSS grid so fillers follow its responsive columns.
      const columns = getComputedStyle(grid).gridTemplateColumns.trim().split(/\s+/).length
      const canFill = entryCount > 0 && window.matchMedia("(min-width: 640px)").matches
      setPlaceholderCount(canFill ? (columns - entryCount % columns) % columns : 0)
    }
    const observer = new ResizeObserver(updatePlaceholders)
    observer.observe(grid)
    window.addEventListener("resize", updatePlaceholders)
    return () => {
      observer.disconnect()
      window.removeEventListener("resize", updatePlaceholders)
    }
  }, [entryCount])

  return (
    <div ref={gridRef} className="uma-statistics-performance-grid">
      {children}
      {Array.from({ length: placeholderCount }, (_, index) => (
        <div key={`placeholder-${index}`} className="uma-statistics-performance-placeholder" aria-hidden="true" />
      ))}
    </div>
  )
}
