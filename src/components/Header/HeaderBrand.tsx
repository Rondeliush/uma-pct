import { useState } from "react"

const LOGO_HINT_DISMISSED_KEY = "uma-pct-logo-hint-dismissed"

type HeaderBrandProps = {
  isHomeNight: boolean
  onToggleHomeNight: () => void
}

export default function HeaderBrand({ isHomeNight, onToggleHomeNight }: HeaderBrandProps) {
  const [showLogoHint, setShowLogoHint] = useState(() => {
    try {
      return localStorage.getItem(LOGO_HINT_DISMISSED_KEY) !== "true"
    } catch {
      return true
    }
  })
  const handleLogoClick = () => {
    setShowLogoHint(false)
    try {
      localStorage.setItem(LOGO_HINT_DISMISSED_KEY, "true")
    } catch {
      // The hint still dismisses for this visit if browser storage is unavailable.
    }
    onToggleHomeNight()
  }
  const toggleLabel = isHomeNight ? "Switch to daytime theme" : "Switch to nighttime theme"
  return (
    <div className="app-brand-identity">
      <div className="app-brand-logo-wrap">
        <button
          type="button"
          className="app-brand-logo-toggle"
          onClick={handleLogoClick}
          aria-label={toggleLabel}
          aria-pressed={isHomeNight}
          title={toggleLabel}
        >
          <img className="app-brand-logo" src={`${import.meta.env.BASE_URL}${isHomeNight ? "pwa-192x192.png" : "pwa-2-192x192.png"}`} alt="" width="52" height="52" />
        </button>
        {showLogoHint && (
          <span className="app-brand-logo-hint" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20V4m-6 6 6-6 6 6" />
            </svg>
            <span>Click Me :)</span>
          </span>
        )}
      </div>
      <div className="app-brand-copy">
        <div className="app-header-brand-label">Umamusume</div>
        <div className="app-header-title">Personal Competitive Tracker</div>
      </div>
    </div>
  )
}
