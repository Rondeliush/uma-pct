import type { ReactNode } from "react"
import "./RankingBadge.css"

type Props = {
  children: ReactNode
  medal?: "gold" | "silver" | "bronze"
  className?: string
}

export default function RankingBadge({ children, medal, className = "" }: Props) {
  return <span className={`ranking-badge ${className}`.trim()} data-medal={medal}>{children}</span>
}
