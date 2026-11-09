import { useLayoutEffect, useRef } from "react"

/** Fit complete names to their available width without splitting or truncating them. */
export default function LoHUmaName({ name, className = "" }: { name: string; className?: string }) {
  const nameRef = useRef<HTMLSpanElement>(null)
  const variantAt = name.lastIndexOf(" (")
  const hasVariant = variantAt > 0 && name.endsWith(")")
  const base = hasVariant ? name.slice(0, variantAt) : name
  const variant = hasVariant ? name.slice(variantAt + 1) : null

  useLayoutEffect(() => {
    const container = nameRef.current
    if (!container) return
    let lastWidth = -1
    let resizeFrame: number | null = null

    const fitName = () => {
      if (!container.isConnected) return
      lastWidth = container.getBoundingClientRect().width
      for (const line of container.querySelectorAll<HTMLElement>("[data-loh-name-line]")) {
        line.style.fontSize = ""
        const availableWidth = line.getBoundingClientRect().width
        if (availableWidth <= 0) continue
        const baseSize = Number.parseFloat(getComputedStyle(line).fontSize)
        const range = document.createRange()
        range.selectNodeContents(line)
        const fullWidth = range.getBoundingClientRect().width
        if (fullWidth > availableWidth + 0.1) {
          const fittedSize = Math.floor(baseSize * Math.max(0, availableWidth - 0.5) / fullWidth * 100) / 100
          line.style.fontSize = `${Math.min(baseSize, Math.max(1, fittedSize))}px`
        }
      }
    }

    fitName()
    const observer = new ResizeObserver(() => {
      // Font fitting changes height; only a width change needs another measurement.
      if (container.getBoundingClientRect().width !== lastWidth && resizeFrame === null) {
        resizeFrame = requestAnimationFrame(() => { resizeFrame = null; fitName() })
      }
    })
    observer.observe(container)
    void document.fonts.ready.then(fitName)
    document.fonts.addEventListener("loadingdone", fitName)
    window.addEventListener("resize", fitName)
    return () => {
      observer.disconnect()
      if (resizeFrame !== null) cancelAnimationFrame(resizeFrame)
      document.fonts.removeEventListener("loadingdone", fitName)
      window.removeEventListener("resize", fitName)
    }
  }, [name, className])

  return <span ref={nameRef} data-loh-uma-name={name} className={`block ${className}`}>
    <span data-loh-name-line className="block whitespace-nowrap">{base}</span>
    {variant && <> <span data-loh-name-line className="block whitespace-nowrap">{variant}</span></>}
  </span>
}
