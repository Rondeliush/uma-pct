import WhatsNewDesktop from "./WhatsNewDesktop"
import WhatsNewMobile from "./WhatsNewMobile"

import { useIsMobile } from "../../../responsive/useIsMobile"

export type WhatsNewProps = {
  version: string
  onOpenChangelog: () => void
  hasNewChangelog: boolean
}

function WhatsNew(
  props: WhatsNewProps
) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <WhatsNewMobile {...props} />
    )
  }

  return (
    <WhatsNewDesktop {...props} />
  )
}

export default WhatsNew