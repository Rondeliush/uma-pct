import { cloneElement, createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useRef, useState } from "react"
import type { HTMLAttributes, ReactElement, ReactNode } from "react"
import { createPortal } from "react-dom"
import "./BadgeTooltip.css"

type Explanation = { title: string; description?: string; note?: string }
type ActiveTooltip = Explanation & { id: string; anchor: HTMLButtonElement; pinned: boolean }
type TooltipContext = {
  active: ActiveTooltip | null
  tooltipId: string
  show: (tooltip: Omit<ActiveTooltip, "pinned">) => void
  toggle: (tooltip: Omit<ActiveTooltip, "pinned">) => void
  dismiss: (id?: string) => void
  leave: (id: string) => void
  hold: () => void
}

const Context = createContext<TooltipContext | null>(null)

/** One explanation at a time, shared by all badges in this group. */
export function BadgeTooltipGroup({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<ActiveTooltip | null>(null)
  const tooltipId = useId()
  const panel = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hold = useCallback(() => {
    if (closeTimer.current !== null) clearTimeout(closeTimer.current)
    closeTimer.current = null
  }, [])
  const dismiss = useCallback((id?: string) => {
    hold()
    setActive((current) => !id || current?.id === id ? null : current)
  }, [hold])
  const show = useCallback((tooltip: Omit<ActiveTooltip, "pinned">) => {
    hold()
    setActive((current) => ({ ...tooltip, pinned: current?.id === tooltip.id && current.pinned }))
  }, [hold])
  const toggle = useCallback((tooltip: Omit<ActiveTooltip, "pinned">) => {
    hold()
    setActive((current) => current?.id === tooltip.id && current.pinned ? null : { ...tooltip, pinned: true })
  }, [hold])
  const leave = useCallback((id: string) => {
    hold()
    closeTimer.current = setTimeout(() => {
      setActive((current) => current?.id === id && !current.pinned
        && !(document.activeElement === current.anchor && current.anchor.matches(":focus-visible")) ? null : current)
    }, 150)
  }, [hold])

  useEffect(() => hold, [hold])
  useEffect(() => {
    if (!active) return
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !active.anchor.contains(event.target) && !panel.current?.contains(event.target)) dismiss()
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        dismiss()
        event.stopPropagation()
      }
    }
    document.addEventListener("pointerdown", outside, true)
    document.addEventListener("keydown", escape, true)
    return () => {
      document.removeEventListener("pointerdown", outside, true)
      document.removeEventListener("keydown", escape, true)
    }
  }, [active, dismiss])

  useLayoutEffect(() => {
    if (!active || !panel.current) return
    const tooltip = panel.current
    const position = () => {
      const anchor = active.anchor.getBoundingClientRect()
      const bounds = tooltip.getBoundingClientRect()
      const viewport = window.visualViewport
      const leftEdge = (viewport?.offsetLeft ?? 0) + 8
      const topEdge = (viewport?.offsetTop ?? 0) + 8
      const rightEdge = leftEdge + (viewport?.width ?? window.innerWidth) - 16
      const bottomEdge = topEdge + (viewport?.height ?? window.innerHeight) - 16
      const above = anchor.top - bounds.height - 8
      tooltip.style.left = `${Math.max(leftEdge, Math.min(anchor.left + (anchor.width - bounds.width) / 2, rightEdge - bounds.width))}px`
      tooltip.style.top = `${Math.max(topEdge, Math.min(above >= topEdge ? above : anchor.bottom + 8, bottomEdge - bounds.height))}px`
    }
    position()
    window.addEventListener("resize", position)
    window.addEventListener("scroll", position, true)
    window.visualViewport?.addEventListener("resize", position)
    window.visualViewport?.addEventListener("scroll", position)
    return () => {
      window.removeEventListener("resize", position)
      window.removeEventListener("scroll", position, true)
      window.visualViewport?.removeEventListener("resize", position)
      window.visualViewport?.removeEventListener("scroll", position)
    }
  }, [active])

  return <Context.Provider value={{ active, tooltipId, show, toggle, dismiss, leave, hold }}>
    {children}
    {active && createPortal(
      <div ref={panel} id={tooltipId} role="tooltip" className="badge-tooltip" style={active.description ? undefined : { width: "max-content" }} onPointerEnter={hold} onPointerLeave={() => leave(active.id)}>
        <strong>{active.title}</strong>
        {active.description && <p>{active.description}</p>}
        {active.note && <p>{active.note}</p>}
      </div>, document.body,
    )}
  </Context.Provider>
}

/** Leaves the existing badge's appearance intact and adds a button trigger. */
export default function BadgeTooltip({ title, description, note, label, onAction, children }: Explanation & { label?: string; onAction?: () => void; children: ReactElement<HTMLAttributes<HTMLElement>> }) {
  const context = useContext(Context)
  const id = useId()
  const dismiss = context?.dismiss
  useEffect(() => () => dismiss?.(id), [dismiss, id])
  if (!context) throw new Error("BadgeTooltip requires a BadgeTooltipGroup")
  const open = context.active?.id === id
  const content = (anchor: HTMLButtonElement) => ({ id, anchor, title, description, note })
  const canShow = () => !onAction || window.matchMedia("(hover: hover)").matches
  return <button type="button" className="badge-tooltip-trigger" aria-label={label ?? children.props["aria-label"] ?? title}
    aria-describedby={open ? context.tooltipId : undefined} aria-expanded={onAction ? undefined : open} data-badge-tooltip={title}
    onPointerEnter={(event) => { if (event.pointerType === "mouse" && canShow()) context.show(content(event.currentTarget)) }}
    onPointerLeave={(event) => { if (event.pointerType === "mouse") context.leave(id) }}
    onFocus={(event) => { if (event.currentTarget.matches(":focus-visible") && canShow()) context.show(content(event.currentTarget)) }}
    onBlur={() => context.dismiss(id)}
    onClick={(event) => { event.stopPropagation(); if (onAction) { context.dismiss(id); onAction() } else context.toggle(content(event.currentTarget)) }}>
    {typeof children.type === "string" ? cloneElement(children, { title: undefined }) : children}
  </button>
}
