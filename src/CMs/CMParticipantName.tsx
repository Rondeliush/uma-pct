import { useLayoutEffect, useRef } from "react"

export default function CMParticipantName({ name, className }: { name: string; className: string }) {
  const nameRef = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    const text = nameRef.current
    const heading = text?.parentElement
    if (!text || !heading) return

    const fitName = () => {
      if (!text.isConnected) return
      text.style.fontSize = ""
      const baseSize = Number.parseFloat(getComputedStyle(text).fontSize)
      const availableWidth = text.getBoundingClientRect().width
      const range = document.createRange()
      range.selectNodeContents(text)
      const fullWidth = range.getBoundingClientRect().width
      if (availableWidth > 0 && fullWidth > availableWidth + 0.1) {
        const fittedSize = Math.floor(baseSize * (availableWidth - 0.5) / fullWidth * 100) / 100
        text.style.fontSize = `${Math.min(baseSize, Math.max(9, fittedSize))}px`
      }
    }

    fitName()
    const observer = new ResizeObserver(fitName)
    observer.observe(heading)
    heading.querySelectorAll("[data-configuration-badge], svg").forEach((element) => observer.observe(element))
    void document.fonts.ready.then(fitName)
    document.fonts.addEventListener("loadingdone", fitName)
    return () => {
      observer.disconnect()
      document.fonts.removeEventListener("loadingdone", fitName)
    }
  }, [name, className])

  return <span ref={nameRef} className={className} title={name}>{name}</span>
}
