import { useSyncExternalStore } from "react"
import HeaderDesktop from "./HeaderDesktop"
import HeaderMobile from "./HeaderMobile"
import "./Header.css"

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
  isHomeNight: boolean
  onToggleHomeNight: () => void
 hasNewChangelog: boolean
 
  onPageChange: (
    page: HeaderPage
  ) => void

  newOfficialUmaNames: string[]
  onViewUpdate: () => void

  activeProfileName: string
  onProfilesClick: () => void
}

export type ThemedHeaderProps = HeaderProps & {
  navTheme: "home" | "cm" | "loh"
  isScrolled: boolean
}

const getIsScrolled = () => window.scrollY > 96

const subscribeToScroll = (onScroll: () => void) => {
  window.addEventListener("scroll", onScroll, { passive: true })
  return () => window.removeEventListener("scroll", onScroll)
}

function Header(
  props: HeaderProps
) {
  const isMobile = useIsMobile()
  const isScrolled = useSyncExternalStore(subscribeToScroll, getIsScrolled)
  const navTheme = props.activePage === "cms" ? "cm" : props.activePage === "loh" ? "loh" : "home"

  if (isMobile) {
    return (
      <HeaderMobile {...props} navTheme={navTheme} isScrolled={isScrolled} />
    )
  }

  return (
    <HeaderDesktop {...props} navTheme={navTheme} isScrolled={isScrolled} />
  )
}

export default Header
