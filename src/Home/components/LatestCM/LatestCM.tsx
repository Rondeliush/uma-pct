import type { CM } from "../../../types/types"

import { useIsMobile } from "../../../responsive/useIsMobile"

import LatestCMDesktop from "./LatestCMDesktop"
import LatestCMMobile from "./LatestCMMobile"

export type LatestCMProps = {
  latestCm: CM | null
  latestTrackImage: string | null
  latestDisplayedLineup: string[]
  latestWinRate: number | null
  latestWinCount: number
  latestRaceCount: number
  onOpenCm: (cmNumber: number) => void
}

function LatestCM(
  props: LatestCMProps
) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <LatestCMMobile {...props} />
    )
  }

  return (
    <LatestCMDesktop {...props} />
  )
}

export default LatestCM