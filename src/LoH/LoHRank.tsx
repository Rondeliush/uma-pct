import type { LoHLeagueRank } from "./ranks"

const tierColors = {
  BRONZE: "text-orange-300",
  SILVER: "text-slate-200",
  GOLD: "text-yellow-300",
  PLATINUM: "text-violet-200",
}

const levelStars = { I: 1, II: 2, III: 3, IV: 4 }

type Props = { rank: LoHLeagueRank; size?: "compact" | "large" | "hero" }

export default function LoHRank({ rank, size = "compact" }: Props) {
  const [tier, level] = rank.split(" ") as [keyof typeof tierColors, keyof typeof levelStars]
  return (
    <div data-loh-rank={rank} className={`flex flex-col items-center gap-1 font-black ${tierColors[tier]}`}>
      <span className={`whitespace-nowrap ${size === "hero" ? "text-3xl sm:text-4xl" : size === "large" ? "text-2xl sm:text-3xl" : "text-xs"}`}>{tier} {level}</span>
      <span aria-hidden="true" className={`leading-none tracking-[0.05em] ${size === "hero" ? "text-2xl" : size === "large" ? "text-xl" : "text-sm"}`}>{"★".repeat(levelStars[level])}</span>
    </div>
  )
}
