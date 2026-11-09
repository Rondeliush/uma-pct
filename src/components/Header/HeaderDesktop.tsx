import {
  useEffect,
  useRef,
  useState,
} from "react"
import UpdateNotification from "../UpdateNotification"

import type { ThemedHeaderProps } from "./Header"
import PwaInstallDesktop from "../../pwa/PwaInstallDesktop"
import HeaderBrand from "./HeaderBrand"


function HeaderDesktop({
  activePage,
  onPageChange,
  newOfficialUmaNames,
  onViewUpdate,
  activeProfileName,
  onProfilesClick,
  hasNewChangelog,
  navTheme,
  isScrolled,
  isHomeNight,
  onToggleHomeNight,
}: ThemedHeaderProps) {
  const navButtonClass = (
    page:
      | "home"
      | "cms"
      | "loh"
      | "statistics"
      | "autoRunTimer"
      | "umaDatabase"
      | "settings"
      | "about"
      | "changelog"
  ) =>
    `app-nav-tab relative flex items-center justify-center text-sm font-bold transition ${activePage === page ? "app-nav-tab-active" : ""}`
  const [isMoreOpen, setIsMoreOpen] =
    useState(false)

  const moreMenuRef =
  useRef<HTMLDivElement | null>(null)

useEffect(() => {
  if (!isMoreOpen) {
    return
  }

  const handleClickOutside = (
    event: MouseEvent
  ) => {
    if (
      moreMenuRef.current &&
      !moreMenuRef.current.contains(
        event.target as Node
      )
    ) {
      setIsMoreOpen(false)
    }
  }

  document.addEventListener(
    "mousedown",
    handleClickOutside
  )

  return () => {
    document.removeEventListener(
      "mousedown",
      handleClickOutside
    )
  }
}, [isMoreOpen])

  return (
  <>
      {/* STICKY NAVIGATION + UPDATE */}
        <div data-app-sticky-header data-nav-theme={navTheme} data-scrolled={isScrolled} className="app-header-floating sticky top-0 z-50 w-full">

        <div className="app-header-desktop-row">
          <header className="app-header-brand">
            <div className="app-header-brand-inner"><HeaderBrand isHomeNight={isHomeNight} onToggleHomeNight={onToggleHomeNight} /></div>
          </header>

        {/* NAVIGATION */}
        <nav className="app-header-nav" aria-label="Main navigation">

          <div className="app-nav-items">

            {/* HOME */}
            <button
              type="button"
              onClick={() => onPageChange("home")}
              className={`app-nav-tab app-nav-home relative flex shrink-0 items-center justify-center transition ${activePage === "home" ? "app-nav-tab-active" : ""}`}
              title="Home"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-[18px] w-[18px]"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m3 11 9-8 9 8" />
                <path d="M5 10v10h14V10" />
                <path d="M9 20v-6h6v6" />
              </svg>
            </button>

            {/* CHAMPIONS MEETING */}
            <button
              type="button"
              onClick={() => onPageChange("cms")}
              className={navButtonClass("cms")}
            >
              Champions Meeting
            </button>

            {/* LEAGUE OF HEROES */}
            <button
              type="button"
              onClick={() => onPageChange("loh")}
              className={navButtonClass("loh")}
            >
              League of Heroes
            </button>

            {/* STATISTICS */}
            <button
              type="button"
              onClick={() =>
                onPageChange("statistics")
              }
              className={navButtonClass("statistics")}
            >
              Statistics
            </button>

            {/* AUTORUN TIMER */}
            <button
              type="button"
              onClick={() =>
                onPageChange("autoRunTimer")
              }
              className={navButtonClass(
                "autoRunTimer"
              )}
            >
              AutoRun Timer
            </button>

            {/* UMA DATABASE */}
            <button
              type="button"
              onClick={() =>
                onPageChange("umaDatabase")
              }
              className={`${navButtonClass(
                "umaDatabase"
              )} relative`}
            >
              Uma Database

              {newOfficialUmaNames.length > 0 && (
                <span className="app-nav-new absolute -right-1 -top-1 rounded-md border px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide">
                  New
                </span>
              )}
            </button>
            {/* MORE */}
            <div
              ref={moreMenuRef}
              className="app-nav-more relative"
            >
  <button
    type="button"
    onClick={() =>
      setIsMoreOpen(
        (current) => !current
      )
    }
    aria-expanded={isMoreOpen}
    aria-haspopup="true"
    className={`app-nav-tab relative flex items-center justify-center gap-1.5 text-sm font-bold transition ${isMoreOpen || activePage === "settings" || activePage === "about" || activePage === "changelog" ? "app-nav-tab-active" : ""}`}
  >
    More
    
    {hasNewChangelog && (
    <span className="app-nav-new absolute -right-1 -top-1 rounded-md border px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide">
      New
    </span>
  )}

    <svg
      viewBox="0 0 24 24"
      className={`h-3.5 w-3.5 transition ${
        isMoreOpen
          ? "rotate-180"
          : ""
      }`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  </button>

  {isMoreOpen && (
    <div
        className="app-nav-menu absolute right-0 z-[100] w-56 overflow-hidden rounded-xl border bg-[#07111f]/98 shadow-2xl backdrop-blur-xl"
      >

      {/* ACTIVE PROFILE */}
      <div className="app-nav-divider border-b px-4 py-3">
        <div className="app-nav-muted text-[9px] font-black uppercase tracking-[0.16em]">
          Active Profile
        </div>

        <div className="mt-1 truncate text-sm font-black text-white">
          {activeProfileName}
        </div>
      </div>

      {/* PROFILES */}
      <button
        type="button"
        onClick={() => {
          setIsMoreOpen(false)
          onProfilesClick()
        }}
        className="app-nav-menu-item flex w-full items-center justify-between px-4 py-3 text-left text-sm font-bold transition"
      >
        <span>Profiles</span>
        <span className="app-nav-muted">
          →
        </span>
      </button>

      {/* SETTINGS */}
      <button
        type="button"
        onClick={() => {
          onPageChange("settings")
          setIsMoreOpen(false)
        }}
        className="app-nav-menu-item flex w-full items-center justify-between px-4 py-3 text-sm font-bold transition"
      >
        <span>Settings</span>
      </button>
      {/* CHANGELOG */}
      <button
        type="button"
        onClick={() => {
          onPageChange("changelog")
          setIsMoreOpen(false)
        }}
        className="app-nav-menu-item flex w-full items-center justify-between px-4 py-3 text-left text-sm font-bold transition"
      >
        <span>Changelog</span>

      {hasNewChangelog && (
        <span className="app-nav-new rounded-md px-2 py-0.5 text-[9px] font-black uppercase">
          New
        </span>
      )}
      </button>
            {/* ABOUT */}
      <button
        type="button"
        onClick={() => {
          onPageChange("about")
          setIsMoreOpen(false)
        }}
        className="app-nav-menu-item flex w-full items-center justify-between px-4 py-3 text-sm font-bold transition"
      >
        <span>About</span>
      </button>
    </div>
  )}
</div>

          </div>
        </nav>
        <div className="app-header-install"><PwaInstallDesktop /></div>
        </div>

        {/* UPDATE NOTIFICATION */}

        <div className="app-header-update-slot app-header-desktop-update-slot">
        <UpdateNotification
          umaNames={newOfficialUmaNames}
          onViewUpdate={onViewUpdate}
        />
      </div>
      
      </div>
      </>
  )
}

export default HeaderDesktop
