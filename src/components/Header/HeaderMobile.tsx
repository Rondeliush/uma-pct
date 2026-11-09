import {
  useEffect,
  useRef,
  useState,
} from "react"

import UpdateNotification from "../UpdateNotification"

import type { HeaderProps, ThemedHeaderProps } from "./Header"
import PwaInstallMobile from "../../pwa/PwaInstallMobile"
import HeaderBrand from "./HeaderBrand"

function HeaderMobile({
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

 const navClass = (
  active: boolean,
  widthClass = "flex-1"
) =>
  `app-nav-tab relative flex min-w-0 ${widthClass} items-center justify-center text-xs font-black transition ${active ? "app-nav-tab-active" : ""}`

  const navigate = (
    page: HeaderProps["activePage"]
  ) => {
    onPageChange(page)
    setIsMoreOpen(false)
  }

  const isMorePage =
    activePage === "autoRunTimer" ||
    activePage === "umaDatabase" ||
    activePage === "settings" ||
    activePage === "about" ||
    activePage === "changelog"

  return (
  <>
    {/* BRAND */}
    <header data-nav-theme={navTheme} className="app-header-brand">
      <div className="app-header-brand-inner"><HeaderBrand isHomeNight={isHomeNight} onToggleHomeNight={onToggleHomeNight} /></div>
    </header>
    <div className="app-header-mobile-install" data-nav-theme={navTheme}><PwaInstallMobile /></div>
      {/* STICKY NAVIGATION + UPDATE */}
        <div
          ref={moreMenuRef}
          data-app-sticky-header
          data-nav-theme={navTheme}
          data-scrolled={isScrolled}
          className="app-header-floating app-header-floating-mobile sticky top-0 z-50 w-full"
        >

        {/* MOBILE NAV */}
        <nav className="app-header-nav" aria-label="Main navigation">

          <div className="app-nav-items">

            {/* HOME */}
            <button
              type="button"
              onClick={() =>
                navigate("home")
              }
              className={navClass(
                activePage === "home",
                "w-11 shrink-0"
                )}
              aria-label="Home"
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

            {/* CM */}
            <button
              type="button"
              onClick={() =>
                navigate("cms")
              }
              className={navClass(
                activePage === "cms"
              )}
            >
              CM
            </button>

            {/* LEAGUE OF HEROES */}
            <button
            type="button"
            onClick={() => navigate("loh")}
            aria-label="League of Heroes"
            className={navClass(activePage === "loh")}
            >
            LoH
            </button>

            {/* STATISTICS */}
            <button
              type="button"
              onClick={() =>
                navigate("statistics")
              }
              className={navClass(
                activePage === "statistics"
              )}
            >
              Stats
            </button>

            {/* MORE */}
            <div className="app-nav-more relative flex min-w-0 flex-1">
              <button
                type="button"
                onClick={() =>
                  setIsMoreOpen(
                    (current) =>
                      !current
                  )
                }
                aria-expanded={isMoreOpen}
                aria-haspopup="true"
                className={navClass(
                  isMoreOpen ||
                    isMorePage
                )}
              >
                <span>More</span>

                {newOfficialUmaNames.length >
                  0 && (
                  <span className="app-nav-new-dot ml-1 h-1.5 w-1.5 rounded-full" />
                )}

                {hasNewChangelog && (
                  <span className="app-nav-new-dot ml-1 h-1.5 w-1.5 rounded-full" />
                )}
                <svg
                  viewBox="0 0 24 24"
                  className={`ml-1 h-3 w-3 transition ${
                    isMoreOpen
                      ? "rotate-180"
                      : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
        {isMoreOpen && (
                <div className="app-nav-menu absolute right-0 z-[100] w-72 max-w-[calc(100vw-16px)] overflow-hidden rounded-xl border bg-[#07111f]/98 shadow-2xl backdrop-blur-xl">

                  {/* PROFILE */}
                  <div className="app-nav-divider border-b px-4 py-3">

                    <div className="app-nav-muted text-[9px] font-black uppercase tracking-[0.16em]">
                      Active Profile
                    </div>

                    <div className="mt-1 truncate text-sm font-black text-white">
                      {activeProfileName}
                    </div>

                  </div>

                  {/* AUTORUN */}
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        "autoRunTimer"
                      )
                    }
                    className="app-nav-menu-item flex w-full items-center justify-between px-4 py-3 text-left text-sm font-bold transition"
                  >
                    <span>
                      AutoRun Timer
                    </span>
                  </button>

                  {/* UMA DATABASE */}
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        "umaDatabase"
                      )
                    }
                    className="app-nav-menu-item flex w-full items-center justify-between px-4 py-3 text-left text-sm font-bold transition"
                  >
                    <span>
                      Uma Database
                    </span>

                    {newOfficialUmaNames.length >
                      0 && (
                      <span className="app-nav-new rounded-md px-2 py-0.5 text-[9px] font-black uppercase">
                        New
                      </span>
                    )}

                  </button>


                  <div className="app-nav-divider border-t" />

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
                    onClick={() =>
                      navigate("settings")
                    }
                    className="app-nav-menu-item flex w-full items-center px-4 py-3 text-left text-sm font-bold transition"
                  >
                    Settings
                  </button>

                  {/* CHANGELOG */}
                  <button
                    type="button"
                    onClick={() =>
                      navigate("changelog")
                    }
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
                    onClick={() =>
                      navigate("about")
                    }
                    className="app-nav-menu-item flex w-full items-center px-4 py-3 text-left text-sm font-bold transition"
                  >
                    About
                  </button>

                </div>
              )}


            </div>
          </div>
        </nav>

        <div className="app-header-update-slot">
        <UpdateNotification
          umaNames={
            newOfficialUmaNames
          }
          onViewUpdate={
            onViewUpdate
          }
        />
        </div>
      </div>
      </>
  )
}

export default HeaderMobile
