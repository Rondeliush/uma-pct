import type { CMFinalPlacement } from "../types/types"
import RankingBadge from "../components/RankingBadge"
import { CM_FINAL_PLACEMENT_LABELS } from "./cmFinalPlacements"
import "./CMFinalPlacementBadge.css"

type Props = {
  placement: CMFinalPlacement | null | undefined
  location: "lineup" | "hero" | "card" | "compact-card"
}

export default function CMFinalPlacementBadge({ placement, location }: Props) {
  if (!placement || (placement === "first" && location !== "card" && location !== "compact-card")) return null
  return (
    <RankingBadge className={`cm-final-placement-badge cm-final-placement-badge--${location}`}
      medal={placement === "first" ? "gold" : placement === "second" ? "silver" : placement === "third" ? "bronze" : undefined}>
      {CM_FINAL_PLACEMENT_LABELS[placement]}
    </RankingBadge>
  )
}
