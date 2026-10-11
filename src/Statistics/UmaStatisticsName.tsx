import { useLayoutEffect, useRef } from "react"

/** Keep the base name intact; only a version suffix may wrap to another line. */
export default function UmaStatisticsName({ name }: { name: string }) {
  const nameRef = useRef<HTMLSpanElement>(null)
  const parts = name.match(/^(.*?)\s+(\([^()]*\))$/)
  const base = parts?.[1] ?? name
  const suffix = parts?.[2]

  useLayoutEffect(() => {
    const text = nameRef.current
    if (!text) return
    let disposed = false

    const fitName = () => {
      if (disposed || !text.isConnected) return
      const width = text.getBoundingClientRect().width
      if (width <= 0) return
      text.style.removeProperty("--uma-statistics-name-size")
      const range = document.createRange()
      const widest = Math.max(...Array.from(text.children, (part) => {
        range.selectNodeContents(part)
        return range.getBoundingClientRect().width
      }))
      const size = [1, 0.9, 0.78].find((tier) => widest * tier <= width - 0.5) ?? 0.78
      if (size < 1) text.style.setProperty("--uma-statistics-name-size", `${size}em`)
    }

    fitName()
    const observer = new ResizeObserver(fitName)
    observer.observe(text)
    void document.fonts.ready.then(fitName)
    document.fonts.addEventListener("loadingdone", fitName)
    return () => {
      disposed = true
      observer.disconnect()
      document.fonts.removeEventListener("loadingdone", fitName)
    }
  }, [name])

  return <span ref={nameRef} className="uma-statistics-name"><span>{base}</span>{suffix && <> <span>{suffix}</span></>}</span>
}
