import {
  useEffect,
  useState,
} from "react"

import { usePwaInstall } from "./usePwaInstall"

function PwaInstallMobile() {
  const [isVisible, setIsVisible] =
    useState(false)

  const [
    showIosInstructions,
    setShowIosInstructions,
    ] = useState(false)

  const {
    isInstalled,
    isIos,
    isPromoDismissed,
    install,
    dismissPromo,
  } = usePwaInstall()

  useEffect(() => {
    const frame =
      requestAnimationFrame(() => {
        setIsVisible(true)
      })

    return () => {
      cancelAnimationFrame(frame)
    }
  }, [])

  if (
    isInstalled ||
    isPromoDismissed
  ) {
    return null
  }

  const handleInstall = () => {
    if (isIos) {
        setShowIosInstructions(true)
        return
    }

    void install()
    }

  const handleDismiss = () => {
    setIsVisible(false)

    window.setTimeout(() => {
      dismissPromo()
    }, 400)
  }

  return (
    <div
      className={`
        overflow-hidden
        border-b border-sky-300/15
        bg-[#07111f]/95
        shadow-lg
        backdrop-blur-xl
        transition-all
        duration-400
        ease-out
        ${
          isVisible
            ? "max-h-40 opacity-100"
            : "max-h-0 opacity-0"
        }
      `}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-sky-300/50">
            Available as an app
          </div>

          <div className="mt-0.5 text-sm font-black text-white">
            Install UmaPCT
          </div>
          

        </div>

        <button
          type="button"
          onClick={handleInstall}
          className="shrink-0 rounded-lg border border-sky-300/20 bg-sky-400/[0.08] px-3 py-2 text-[10px] font-black text-sky-200 transition active:bg-sky-400/[0.18]"
        >
          Install
        </button>

        <button
          type="button"
          onClick={handleDismiss}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-blue-100/30 transition active:bg-white/[0.06] active:text-white"
          aria-label="Hide install message"
        >
          ×
        </button>
      </div>
        {showIosInstructions && (
        <div className="border-t border-white/[0.06] px-4 py-3">
            <div className="text-xs font-black text-white">
            Install UmaPCT on iPhone
            </div>

            <p className="mt-1 text-[11px] leading-relaxed text-blue-100/45">
            Open the Share menu in Safari and choose
            {" "}
            <span className="font-bold text-sky-200">
                Add to Home Screen
            </span>
            .
            </p>
        </div>
        )}

    </div>
  )
}

export default PwaInstallMobile