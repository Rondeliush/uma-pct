import {
  useEffect,
  useRef,
  useState,
} from "react"
import UpdateNotification from "./UpdateNotification"

type HeaderProps = {
  activePage:
    | "home"
    | "cms"
    | "loh"
    | "statistics"
    | "autoRunTimer"
    | "umaDatabase"
    | "settings"
    | "about"
    | "changelog"

  onPageChange: (
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
  ) => void

  newOfficialUmaNames: string[]
  onViewUpdate: () => void

  activeProfileName: string
  onProfilesClick: () => void
}

function Header({
  activePage,
  onPageChange,
  newOfficialUmaNames,
  onViewUpdate,
  activeProfileName,
  onProfilesClick,
}: HeaderProps) {
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
    `relative flex h-11 items-center justify-center rounded-lg border-b-2 px-4 text-sm font-bold transition ${
      activePage === page
        ? "border-sky-400 bg-sky-400/[0.07] text-white"
        : "border-transparent text-blue-100/50 hover:bg-white/[0.035] hover:text-white"
    }`
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
      {/* APP BRAND */}
      <header className="relative w-full overflow-hidden border-b border-white/[0.06] bg-[#040914]">

        {/* SUBTLE BACKGROUND GLOW */}
        <div className="pointer-events-none absolute left-1/2 top-0 h-24 w-[520px] -translate-x-1/2 rounded-full bg-blue-500/[0.07] blur-3xl" />

        <div className="relative mx-auto flex h-[68px] max-w-[1500px] items-center justify-center px-6">

          <div className="text-center">

            <div className="text-[16px] font-black uppercase tracking-[0.14em] text-sky-200">
              Umamusume
            </div>

            <div className="mt-0.5 text-[22px] font-black tracking-tight text-white">
              Personal Competitive Tracker
            </div>


          </div>

        </div>
      </header>

      {/* STICKY NAVIGATION + UPDATE */}
      <div className="sticky top-0 z-50 w-full">

        {/* NAVIGATION */}
        <nav className="border-b border-sky-400/[0.10] bg-[#081221]/95 shadow-[0_8px_24px_rgba(0,0,0,0.22)] backdrop-blur-xl">

          <div className="mx-auto flex h-12 max-w-[1500px] items-center justify-center gap-1.5 px-6">

            {/* HOME */}
            <button
              type="button"
              onClick={() => onPageChange("home")}
              className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border-b-2 transition ${
                activePage === "home"
                  ? "border-sky-400 bg-sky-400/[0.08] text-sky-200"
                  : "border-transparent text-blue-100/45 hover:bg-white/[0.035] hover:text-white"
              }`}
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
              disabled
              className="flex cursor-not-allowed items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-blue-100/25"
            >
              <span>League of Heroes</span>

              <span className="rounded-md border border-blue-100/10 bg-blue-100/[0.04] px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-blue-100/25">
                Soon
              </span>
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
                <span className="absolute -right-1 -top-1 rounded-md border border-sky-300/30 bg-sky-400 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-slate-950 shadow-[0_0_10px_rgba(56,189,248,0.30)]">
                  New
                </span>
              )}
            </button>
            {/* MORE */}
            <div
              ref={moreMenuRef}
              className="relative"
            >
  <button
    type="button"
    onClick={() =>
      setIsMoreOpen(
        (current) => !current
      )
    }
    className={`relative flex h-11 items-center justify-center gap-1.5 rounded-lg border-b-2 px-4 text-sm font-bold transition ${
      isMoreOpen
        ? "border-violet-400 bg-violet-400/[0.07] text-white"
        : "border-transparent text-blue-100/50 hover:bg-white/[0.035] hover:text-white"
    }`}
  >
    More

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
    <div className="absolute right-0 top-[calc(100%+6px)] z-[100] w-56 overflow-hidden rounded-xl border border-violet-300/15 bg-[#07111f]/98 shadow-2xl backdrop-blur-xl">

      {/* ACTIVE PROFILE */}
      <div className="border-b border-white/[0.07] px-4 py-3">
        <div className="text-[9px] font-black uppercase tracking-[0.16em] text-blue-100/25">
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
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-bold text-blue-100/65 transition hover:bg-violet-400/[0.07] hover:text-white"
      >
        <span>Profiles</span>
        <span className="text-blue-100/25">
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
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-bold text-blue-100/60 transition hover:bg-white/[0.04] hover:text-white"
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
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-bold text-blue-100/60 transition hover:bg-white/[0.04] hover:text-white"
      >
        <span>Changelog</span>
      </button>
            {/* ABOUT */}
      <button
        type="button"
        onClick={() => {
          onPageChange("about")
          setIsMoreOpen(false)
        }}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-bold text-blue-100/60 transition hover:bg-white/[0.04] hover:text-white"
      >
        <span>About</span>
      </button>
    </div>
  )}
</div>

          </div>
        </nav>

        {/* UPDATE NOTIFICATION */}
        <UpdateNotification
          umaNames={newOfficialUmaNames}
          onViewUpdate={onViewUpdate}
        />

      </div>
    </>
  )
}

export default Header