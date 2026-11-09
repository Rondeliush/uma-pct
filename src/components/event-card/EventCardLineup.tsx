import type { ReactNode } from "react"

export default function EventCardLineup({ theme = "cm", children }: { theme?: "cm" | "loh"; children: ReactNode }) {
  const isLoH = theme === "loh"
  return <div className={`relative flex min-w-0 flex-col justify-center px-4 py-3 ${isLoH ? "col-start-2 row-start-2 sm:col-span-2 sm:col-start-2 xl:col-start-3 xl:col-span-1 xl:row-start-1" : ""}`}>
    <div className={`pointer-events-none absolute left-0 top-1/2 h-[68%] w-px -translate-y-1/2 bg-gradient-to-b from-transparent to-transparent ${isLoH ? "via-rose-400/80 shadow-[0_0_6px_rgba(244,63,94,0.65)]" : "via-sky-400/80 shadow-[0_0_6px_rgba(56,189,248,0.65)]"}`} />
    <div className={`mx-auto flex items-center justify-center gap-3 ${isLoH ? "w-full max-w-[510px] xl:w-auto xl:max-w-none" : ""}`}>
      <div className="flex h-[150px] shrink-0 items-center justify-center">
        <div className={`rotate-180 [writing-mode:vertical-rl] text-sm font-black uppercase tracking-[0.22em] text-gray-300 ${isLoH ? "whitespace-nowrap drop-shadow-[0_0_5px_rgba(244,63,94,0.25)]" : "drop-shadow-[0_0_5px_rgba(125,211,252,0.25)]"}`}>Team Lineup</div>
      </div>
      <div className={isLoH ? "grid min-w-0 flex-1 grid-cols-3 items-center gap-2 xl:flex xl:flex-none xl:gap-3" : "flex items-center gap-3"}>{children}</div>
    </div>
  </div>
}
