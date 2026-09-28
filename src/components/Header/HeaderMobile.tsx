import {
  useEffect,
  useRef,
  useState,
} from "react"

import UpdateNotification from "../UpdateNotification"

import type { HeaderProps } from "./Header"

function HeaderMobile({
  activePage,
  onPageChange,
  newOfficialUmaNames,
  onViewUpdate,
  activeProfileName,
  onProfilesClick,
  hasNewChangelog,
}: HeaderProps) {
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
  `relative flex h-11 min-w-0 ${widthClass} items-center justify-center rounded-lg border-b-2 px-2 text-xs font-black transition ${
    active
      ? "border-sky-400 bg-sky-400/[0.08] text-white"
      : "border-transparent text-blue-100/50"
  }`

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
    <header className="relative overflow-hidden border-b border-white/[0.06] bg-[#040914]">
        <div className="pointer-events-none absolute left-1/2 top-0 h-20 w-72 -translate-x-1/2 rounded-full bg-blue-500/[0.07] blur-3xl" />

        <div className="relative flex min-h-[70px] items-center justify-center px-3 py-3">
          <div className="min-w-0 text-center">

            <div className="text-[12px] font-black uppercase tracking-[0.18em] text-sky-200">
              Umamusume
            </div>

            <div className="mt-1 text-[17px] font-black leading-tight tracking-tight text-white">
              Personal Competitive Tracker
            </div>

          </div>
        </div>
      </header>
      {/* STICKY NAVIGATION + UPDATE */}
        <div
          ref={moreMenuRef}
          className="sticky top-0 z-50 w-full"
        >

        {/* MOBILE NAV */}
        <nav className="border-b border-sky-400/[0.10] bg-[#081221]/95 shadow-[0_8px_24px_rgba(0,0,0,0.22)] backdrop-blur-xl">

          <div className="flex h-12 w-full items-center gap-1 px-2">

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
            disabled
            className="relative flex h-11 min-w-0 flex-1 cursor-not-allowed items-center justify-center rounded-lg border-b-2 border-transparent px-1 text-xs font-black text-blue-100/25"
            >
            LoH

            <span className="absolute right-0.5 top-0.5 rounded bg-blue-100/[0.06] px-1 text-[6px] font-black uppercase tracking-wide text-blue-100/25">
                Soon
            </span>
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
            <div className="relative flex min-w-0 flex-1">
              <button
                type="button"
                onClick={() =>
                  setIsMoreOpen(
                    (current) =>
                      !current
                  )
                }
                className={navClass(
                  isMoreOpen ||
                    isMorePage
                )}
              >
                <span>More</span>

                {newOfficialUmaNames.length >
                  0 && (
                  <span className="ml-1 h-1.5 w-1.5 rounded-full bg-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.8)]" />
                )}

                {hasNewChangelog && (
                  <span className="ml-1 h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
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

            </div>
          </div>
        </nav>

        <UpdateNotification
          umaNames={
            newOfficialUmaNames
          }
          onViewUpdate={
            onViewUpdate
          }
        />
        {isMoreOpen && (
                <div className="absolute right-0 top-[calc(100%+6px)] z-[100] w-72 max-w-[calc(100vw-16px)] overflow-hidden rounded-xl border border-violet-300/15 bg-[#07111f]/98 shadow-2xl backdrop-blur-xl">

                  {/* PROFILE */}
                  <div className="border-b border-white/[0.07] px-4 py-3">

                    <div className="text-[9px] font-black uppercase tracking-[0.16em] text-blue-100/25">
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
                    className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-bold text-blue-100/65 transition hover:bg-white/[0.04] hover:text-white"
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
                    className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-bold text-blue-100/65 transition hover:bg-white/[0.04] hover:text-white"
                  >
                    <span>
                      Uma Database
                    </span>

                    {newOfficialUmaNames.length >
                      0 && (
                      <span className="rounded-md bg-sky-400 px-2 py-0.5 text-[9px] font-black uppercase text-slate-950">
                        New
                      </span>
                    )}
                  </button>


                  <div className="border-t border-white/[0.07]" />

                  {/* PROFILES */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreOpen(false)
                      onProfilesClick()
                    }}
                    className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-bold text-blue-100/65 transition hover:bg-white/[0.04] hover:text-white"
                  >
                    <span>Profiles</span>
                    <span className="text-blue-100/25">
                      →
                    </span>
                  </button>

                  {/* SETTINGS */}
                  <button
                    type="button"
                    onClick={() =>
                      navigate("settings")
                    }
                    className="flex w-full items-center px-4 py-3 text-left text-sm font-bold text-blue-100/65 transition hover:bg-white/[0.04] hover:text-white"
                  >
                    Settings
                  </button>

                  {/* CHANGELOG */}
                  <button
                    type="button"
                    onClick={() =>
                      navigate("changelog")
                    }
                    className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-bold text-blue-100/65 transition hover:bg-white/[0.04] hover:text-white"
                  >
                    <span>Changelog</span>

                    {hasNewChangelog && (
                      <span className="rounded-md bg-emerald-400 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-950">
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
                    className="flex w-full items-center px-4 py-3 text-left text-sm font-bold text-blue-100/65 transition hover:bg-white/[0.04] hover:text-white"
                  >
                    About
                  </button>

                </div>
              )}
      </div>
      </>
  )
}

export default HeaderMobile