import HeaderDesktop from "./HeaderDesktop"
import HeaderMobile from "./HeaderMobile"

import { useIsMobile } from "../../responsive/useIsMobile"

export type HeaderPage =
  | "home"
  | "cms"
  | "loh"
  | "statistics"
  | "autoRunTimer"
  | "umaDatabase"
  | "settings"
  | "about"
  | "changelog"

export type HeaderProps = {
  activePage: HeaderPage
 hasNewChangelog: boolean
 
  onPageChange: (
    page: HeaderPage
  ) => void

  newOfficialUmaNames: string[]
  onViewUpdate: () => void

  activeProfileName: string
  onProfilesClick: () => void
}

function Header(
  props: HeaderProps
) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <HeaderMobile {...props} />
    )
  }

  return (
    <HeaderDesktop {...props} />
  )
}

export default Header