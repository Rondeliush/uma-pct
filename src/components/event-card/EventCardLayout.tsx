import type { ReactNode } from "react"

type Props = { theme?: "cm" | "loh"; onOpen: () => void; children: ReactNode }

export default function EventCardLayout({ theme = "cm", onOpen, children }: Props) {
  const isLoH = theme === "loh"
  return (
    <div
      data-guide={isLoH ? undefined : "cm-card"}
      data-event-card={theme}
      onClick={onOpen}
      className={`relative cursor-pointer overflow-hidden rounded-xl border bg-gray-950/90 transition-[transform,background-color,box-shadow,border-color] duration-200 ease-out group-hover:-translate-y-1 group-hover:scale-[1.01] group-hover:bg-gray-900/95 ${isLoH
        ? "loh-card-sweep border-rose-400/50 shadow-[0_0_14px_rgba(244,63,94,0.18),0_0_30px_rgba(190,24,93,0.10)] group-hover:border-rose-300/70 group-hover:shadow-[0_0_20px_rgba(244,63,94,0.28),0_0_42px_rgba(190,24,93,0.18)]"
        : "cm-card-sweep border-sky-400/50 shadow-[0_0_14px_rgba(56,189,248,0.18),0_0_30px_rgba(37,99,235,0.10)] group-hover:border-sky-300/70 group-hover:shadow-[0_0_20px_rgba(56,189,248,0.28),0_0_42px_rgba(37,99,235,0.18)]"}`}
    >
      <div className={`pointer-events-none absolute inset-0 rounded-xl ${isLoH ? "shadow-[inset_0_0_12px_rgba(244,63,94,0.08)]" : "shadow-[inset_0_0_12px_rgba(56,189,248,0.08)]"}`} />
      <div className={`grid min-h-[150px] ${isLoH
        ? "grid-cols-[72px_minmax(0,1fr)_44px] sm:grid-cols-[100px_minmax(0,1fr)_140px_48px] xl:grid-cols-[140px_480px_minmax(0,1fr)_120px_52px]"
        : "grid-cols-[140px_480px_minmax(0,1fr)_120px_52px]"}`}>
        {children}
      </div>
    </div>
  )
}
