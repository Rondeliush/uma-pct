type Props = { theme?: "cm" | "loh"; number: number; leagueLabel: string; leagueClassName?: string }

export function EventCardSymbol({ theme, className = "" }: { theme: "cm" | "loh"; className?: string }) {
  return theme === "loh"
    ? <span aria-hidden="true" className={`flex items-center justify-center text-xl leading-none text-rose-300 drop-shadow-[0_0_7px_rgba(244,63,94,0.7)] ${className}`}>★</span>
    : <svg viewBox="0 0 32 24" aria-hidden="true" fill="currentColor" className={`text-sky-300 drop-shadow-[0_0_7px_rgba(125,211,252,0.7)] ${className}`}><path d="M4 19h24l2-12-7 5-7-9-7 9-7-5 2 12Zm2 2h20v2H6v-2Z" /></svg>
}

function Laurel({ right = false, isLoH }: { right?: boolean; isLoH: boolean }) {
  return <svg viewBox="0 0 30 64" aria-hidden="true" fill="currentColor" className={`absolute h-14 w-6 ${right ? "left-full ml-1 -scale-x-100" : "right-full mr-1"} ${isLoH ? "text-rose-400 drop-shadow-[0_0_7px_rgba(244,63,94,0.65)]" : right ? "text-blue-400 drop-shadow-[0_0_7px_rgba(129,140,248,0.65)]" : "text-blue-400 drop-shadow-[0_0_7px_rgba(96,165,250,0.65)]"}`}>
    <ellipse cx="18" cy="54" rx="4" ry="9" transform="rotate(-35 18 54)" />
    <ellipse cx="13" cy="44" rx="4" ry="9" transform="rotate(-28 13 44)" />
    <ellipse cx="11" cy="33" rx="4" ry="9" transform="rotate(-18 11 33)" />
    <ellipse cx="12" cy="22" rx="4" ry="8" transform="rotate(-8 12 22)" />
    <ellipse cx="16" cy="12" rx="4" ry="8" transform="rotate(12 16 12)" />
  </svg>
}

export default function EventCardBadge({ theme = "cm", number, leagueLabel, leagueClassName }: Props) {
  const isLoH = theme === "loh"
  return <div className={`relative flex items-center justify-center overflow-hidden ${isLoH ? "col-start-1 row-start-1 row-span-3 sm:row-span-2 xl:row-span-1" : ""}`}>
    <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${isLoH ? "from-rose-950/80 via-rose-950/70 to-pink-950/80" : "from-blue-950/80 via-indigo-950/70 to-violet-950/80"}`} />
    <div className={`pointer-events-none absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl ${isLoH ? "bg-rose-500/10" : "bg-blue-500/10"}`} />
    <div className="relative z-10 flex flex-col items-center">
      <div className={`mb-1 text-[9px] font-black uppercase tracking-[0.18em] ${leagueClassName ?? "text-rose-300"}`}>{leagueLabel}</div>
      <EventCardSymbol theme={theme} className="mb-0.5 h-5 w-7" />
      <div className={`text-lg font-black tracking-wide ${isLoH ? "text-rose-200" : "text-blue-200"}`}>{isLoH ? "LOH" : "CM"}</div>
      <div className="relative mt-[-2px] flex items-center justify-center">
        <Laurel isLoH={isLoH} />
        <div className={`font-black leading-none tracking-tight text-white ${isLoH ? "drop-shadow-[0_0_8px_rgba(244,63,94,0.45)]" : "drop-shadow-[0_0_8px_rgba(96,165,250,0.45)]"} ${String(number).length <= 2 ? "text-5xl" : String(number).length === 3 ? "text-4xl" : String(number).length === 4 ? "text-3xl" : "text-2xl"}`}>{number}</div>
        <Laurel isLoH={isLoH} right />
      </div>
    </div>
    <div className={`pointer-events-none absolute right-0 top-1/2 h-[68%] w-px -translate-y-1/2 bg-gradient-to-b from-transparent to-transparent ${isLoH ? "via-rose-400/80 shadow-[0_0_6px_rgba(244,63,94,0.65)]" : "via-sky-400/80 shadow-[0_0_6px_rgba(56,189,248,0.65)]"}`} />
  </div>
}
